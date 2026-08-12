const cds = require('@sap/cds');
const { randomUUID: uuid } = require('crypto');

module.exports = cds.service.impl(async (srv) => {
  const db = await cds.connect.to('db');
  const { Users, Suggestions, IdeaNumbers } = cds.entities('ideamanagement.db');

  // ============= SUGGESTIONS HANDLERS =============

  /**
   * Before CREATE: Validate suggestion ve createdBy'i set et
   */
  srv.before('CREATE', 'Suggestions', async (req) => {
    const data = req.data;

    // Validate required fields
    if (!data.topic || data.topic.trim() === '') {
      return req.error(400, 'Topic cannot be empty');
    }

    if (!data.company_ID) {
      return req.error(400, 'Company must be selected');
    }

    if (!data.ideaSegment_ID) {
      return req.error(400, 'Segment must be selected');
    }

    // submittedBy'i current user'dan set et (Users.ID, username değil)
    if (req.user && req.user.id) {
      const user = await db.run(
        SELECT.one.from(Users).columns('ID').where({ username: req.user.id })
      );
      if (user) {
        data.submittedBy_ID = user.ID;
      }
    }
  });

  /**
   * After CREATE: Suggestion başarıyla oluşturulduktan sonra log
   */
  srv.after('CREATE', 'Suggestions', async (_, req) => {
    console.log(`✓ Suggestion created: ${req.data.ID} by user ${req.data.submittedBy_ID}`);
  });

  // ============= SCORINGS HANDLERS =============

  /**
   * Before CREATE/UPDATE Scorings: Validate scores ve ağırlıklı totalScore hesapla
   * (orijinal ABAP puan_hesaplama metodundaki ağırlıklarla aynı)
   */
  srv.before(['CREATE', 'UPDATE'], 'Scorings', async (req) => {
    const data = req.data;

    // Validate all score fields (0-10 range)
    const scoreWeights = {
      companyRnD: 3,
      companyMarket: 3,
      projectSize: 5,
      roi: 5,
      profitMargin: 5,
      competition: 4,
      success: 5,
      strategy: 5,
      differentiation: 5,
      humanEnvironment: 2,
      ownership: 2
    };
    const scoreFields = Object.keys(scoreWeights);

    const errors = [];
    let hasScore = false;
    let totalScore = 0;

    for (const field of scoreFields) {
      const value = data[field];

      if (value !== null && value !== undefined) {
        if (typeof value !== 'number' || value < 0 || value > 10) {
          errors.push(`${field} must be a number between 0 and 10`);
        } else {
          hasScore = true;
          totalScore += value * scoreWeights[field];
        }
      }
    }

    if (errors.length > 0) {
      return req.error(400, errors.join('; '));
    }

    // Calculate weighted totalScore, like the original ABAP formula
    if (hasScore) {
      data.totalScore = totalScore;
    }
  });

  // ============= DECISIONS HANDLERS =============

  /**
   * Before CREATE/UPDATE Decisions: Validate decision enum
   */
  srv.before(['CREATE', 'UPDATE'], 'Decisions', async (req) => {
    const data = req.data;

    const validDecisions = ['K', 'R', 'B'];
    if (data.decision && !validDecisions.includes(data.decision)) {
      return req.error(400, `Decision must be one of: ${validDecisions.join(', ')}`);
    }

    const validClasses = ['B', 'A', 'I', 'V'];
    if (data.projectClass && !validClasses.includes(data.projectClass)) {
      return req.error(400, `Project class must be one of: ${validClasses.join(', ')}`);
    }

    const validTypes = ['YI', 'I', 'YD'];
    if (data.projectType && !validTypes.includes(data.projectType)) {
      return req.error(400, `Project type must be one of: ${validTypes.join(', ')}`);
    }

    if (data.decision === 'K' && (!data.projectClass || !data.projectType || !data.projectYear)) {
      return req.error(400, 'Project class, project type and project year are required when the decision is accepted');
    }
  });

  /**
   * After CREATE Decision: Eğer accepted ise IdeaNumber generate et
   */
  srv.after('CREATE', 'Decisions', async (_, req) => {
    const data = req.data;
    if (data.decision === 'K') {
      // Suggestion bilgisini al
      const suggestion = await db.run(
        SELECT.one.from(Suggestions).where({ ID: data.suggestion_ID }).columns(
          s => {
            s('*');
            s.company(c => c('code'));
            s.ideaSegment(sg => sg('code'));
          }
        )
      );

      if (suggestion && suggestion.company && suggestion.ideaSegment) {
        const { cnt } = await db.run(SELECT.one`count(*) as cnt`.from(IdeaNumbers));
        const ideaNumber = generateIdeaNumber({
          projectYear: data.projectYear,
          segmentCode: suggestion.ideaSegment.code,
          companyCode: suggestion.company.code,
          governmentSupport: data.governmentSupport,
          sequence: (cnt || 0) + 1
        });

        // IdeaNumber create et
        await db.run(
          INSERT.into(IdeaNumbers).entries({
            ID: uuid(),
            suggestion_ID: data.suggestion_ID,
            ideaNumber: ideaNumber
          })
        );

        console.log(`✓ IdeaNumber generated: ${ideaNumber}`);
      }
    }
  });

  // ============= FILE UPLOADS HANDLERS =============

  /**
   * Before CREATE FileUploads: Validate file type ve size
   */
  srv.before('CREATE', 'FileUploads', async (req) => {
    const data = req.data;

    if (!data.fileName) {
      return req.error(400, 'File name is required');
    }

    // Check file extension
    const mimeType = getMimeType(data.fileName);
    if (!mimeType) {
      return req.error(
        400,
        'Only .pdf, .xlsx, and .docx files are allowed'
      );
    }
    data.mimeType = mimeType;

    // Check file size (content field)
    if (data.content) {
      const sizeInMB = getFileSizeInMB(data.content);
      if (sizeInMB > 5) {
        return req.error(400, `File size exceeds 5MB limit (current: ${sizeInMB.toFixed(2)}MB)`);
      }
    }
  });

  /**
   * After CREATE FileUploads: Log successful upload
   */
  srv.after('CREATE', 'FileUploads', async (_, req) => {
    console.log(`✓ File uploaded: ${req.data.fileName} for suggestion ${req.data.suggestion_ID}`);
  });

  // ============= HELPER FUNCTIONS =============

  /**
   * Validate score fields (0-10 range)
   */
  function validateScores(obj) {
    const scoreFields = [
      'companyRnD',
      'companyMarket',
      'projectSize',
      'roi',
      'profitMargin',
      'competition',
      'success',
      'strategy',
      'differentiation',
      'humanEnvironment',
      'ownership'
    ];

    for (const field of scoreFields) {
      const value = obj[field];
      if (value !== null && value !== undefined) {
        if (typeof value !== 'number' || value < 0 || value > 10) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Generate IdeaNumber like the original ABAP formula:
   * <projectYear>-<segmentCode>-<companyCode><supportLetter>-<sequence>
   * supportLetter: 'D' (Devlet Destekli) if governmentSupport, otherwise 'A' (Adi)
   * Example: "2025-1-AD-0001"
   */
  function generateIdeaNumber({ projectYear, segmentCode, companyCode, governmentSupport, sequence }) {
    const supportLetter = governmentSupport ? 'D' : 'A';
    const seqStr = String(sequence).padStart(4, '0');
    return `${projectYear}-${segmentCode}-${companyCode}${supportLetter}-${seqStr}`;
  }

  /**
   * Resolve mimeType from an allowed file extension, or undefined if disallowed
   */
  function getMimeType(fileName) {
    if (!fileName) return undefined;
    const mimeByExtension = {
      '.pdf': 'application/pdf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    const lowerName = fileName.toLowerCase();
    const ext = Object.keys(mimeByExtension).find((e) => lowerName.endsWith(e));
    return ext ? mimeByExtension[ext] : undefined;
  }

  /**
   * Estimate file size in MB from base64 string
   * Rough calculation: base64 length * 0.75 / (1024 * 1024)
   */
  function getFileSizeInMB(content) {
    if (!content) return 0;
    const bytes = Buffer.byteLength(content, 'utf8');
    return bytes / (1024 * 1024);
  }
});
