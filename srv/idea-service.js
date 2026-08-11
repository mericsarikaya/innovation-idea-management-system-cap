const cds = require('@sap/cds');
const { v4: uuid } = require('uuid');

module.exports = cds.service.impl(async (srv) => {
  const db = await cds.connect.to('db');

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

    if (!data.segment_ID) {
      return req.error(400, 'Segment must be selected');
    }

    // submittedBy'i current user'dan set et
    if (req.user && req.user.id) {
      data.submittedBy_ID = req.user.id;
    }
  });

  /**
   * After CREATE: Suggestion başarıyla oluşturulduktan sonra log
   */
  srv.after('CREATE', 'Suggestions', async (data, req) => {
    console.log(`✓ Suggestion created: ${data.ID} by user ${data.submittedBy_ID}`);
  });

  // ============= SCORINGS HANDLERS =============

  /**
   * Before CREATE/UPDATE Scorings: Validate scores ve totalScore hesapla
   */
  srv.before(['CREATE', 'UPDATE'], 'Scorings', async (req) => {
    const data = req.data;

    // Validate all score fields (0-10 range)
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

    const errors = [];
    const scores = [];

    for (const field of scoreFields) {
      const value = data[field];

      if (value !== null && value !== undefined) {
        if (typeof value !== 'number' || value < 0 || value > 10) {
          errors.push(`${field} must be a number between 0 and 10`);
        } else {
          scores.push(value);
        }
      }
    }

    if (errors.length > 0) {
      return req.error(400, errors.join('; '));
    }

    // Calculate totalScore as average
    if (scores.length > 0) {
      data.totalScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
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
  });

  /**
   * After CREATE Decision: Eğer accepted ise IdeaNumber generate et
   */
  srv.after('CREATE', 'Decisions', async (data, req) => {
    if (data.decision === 'K') {
      // Suggestion bilgisini al
      const suggestion = await db.run(
        SELECT.one.from('Suggestions').where({ ID: data.suggestion_ID }).columns(
          (s) => {
            s('*');
            s.company((c) => c('code'));
            s.segment((sg) => sg('code'));
          }
        )
      );

      if (suggestion && suggestion.company && suggestion.segment) {
        const ideaNumber = generateIdeaNumber(suggestion.company.code, suggestion.segment.code);

        // IdeaNumber create et
        await db.run(
          INSERT.into('IdeaNumbers').entries({
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
    if (!isAllowedFileType(data.fileName)) {
      return req.error(
        400,
        'Only .pdf, .xlsx, and .docx files are allowed'
      );
    }

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
  srv.after('CREATE', 'FileUploads', async (data, req) => {
    console.log(`✓ File uploaded: ${data.fileName} for suggestion ${data.suggestion_ID}`);
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
   * Generate IdeaNumber: companyCode + segmentCode + YYYYMMDD + 4-digit-hex
   * Example: "1A20250811A1F2"
   */
  function generateIdeaNumber(companyCode, segmentCode) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Generate 4-digit hex (0000-FFFF)
    const randomHex = Math.floor(Math.random() * 65536)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0');

    return `${companyCode}${segmentCode}${dateStr}${randomHex}`;
  }

  /**
   * Check if file type is allowed
   */
  function isAllowedFileType(fileName) {
    const allowedExtensions = ['.pdf', '.xlsx', '.docx'];
    const lowerName = fileName.toLowerCase();
    return allowedExtensions.some((ext) => lowerName.endsWith(ext));
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
