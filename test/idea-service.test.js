const cds = require('@sap/cds')
const { GET, POST, PATCH } = cds.test(__dirname + '/..')

const submitter = { username: 'mericsarikaya', password: 'test123' }
const otherSubmitter = { username: 'ayseyilmaz', password: 'test123' }
const manager = { username: 'argemuduru', password: 'test123' }

const companyID = 'c1111111-1111-1111-1111-111111111111'
const segmentID = 's1111111-1111-1111-1111-111111111111'

describe('IdeaService', () => {

  describe('Suggestions', () => {
    it('rejects a suggestion without topic', async () => {
      await expect(
        POST('/odata/v4/idea/Suggestions', {
          company_ID: companyID,
          ideaSegment_ID: segmentID
        }, { auth: submitter })
      ).rejects.toMatchObject({ response: { status: 400 } })
    })

    it('rejects a suggestion without company', async () => {
      await expect(
        POST('/odata/v4/idea/Suggestions', {
          topic: 'Some idea',
          ideaSegment_ID: segmentID
        }, { auth: submitter })
      ).rejects.toMatchObject({ response: { status: 400 } })
    })

    it('creates a suggestion and sets submittedBy from the logged-in user', async () => {
      const { status, data } = await POST('/odata/v4/idea/Suggestions', {
        topic: 'AI-powered customer support system',
        productFeatures: 'Chatbot integration',
        innovations: 'Machine learning model',
        feasibility: 'High',
        additionalInvestment: '50000',
        company_ID: companyID,
        ideaSegment_ID: segmentID
      }, { auth: submitter })

      expect(status).toBe(201)
      expect(data.submittedBy_ID).toMatch(/^[0-9a-f-]{36}$/)
    })

    it('allows the owner to update their own suggestion', async () => {
      const { data: created } = await POST('/odata/v4/idea/Suggestions', {
        topic: 'Owner-editable idea',
        company_ID: companyID,
        ideaSegment_ID: segmentID
      }, { auth: submitter })

      const { status } = await PATCH(`/odata/v4/idea/Suggestions/${created.ID}`, {
        topic: 'Owner-editable idea (updated)'
      }, { auth: submitter })

      expect(status).toBe(200)
    })

    it('rejects updates to a suggestion by a different submitter', async () => {
      const { data: created } = await POST('/odata/v4/idea/Suggestions', {
        topic: 'Someone else\'s idea',
        company_ID: companyID,
        ideaSegment_ID: segmentID
      }, { auth: submitter })

      await expect(
        PATCH(`/odata/v4/idea/Suggestions/${created.ID}`, {
          topic: 'Hijacked idea'
        }, { auth: otherSubmitter })
      ).rejects.toMatchObject({ response: { status: 403 } })
    })
  })

  describe('Scorings', () => {
    let suggestionID

    beforeAll(async () => {
      const { data } = await POST('/odata/v4/idea/Suggestions', {
        topic: 'Scoring test idea',
        company_ID: companyID,
        ideaSegment_ID: segmentID
      }, { auth: submitter })
      suggestionID = data.ID
    })

    it('rejects an out-of-range score', async () => {
      await expect(
        POST('/odata/v4/idea/Scorings', {
          suggestion_ID: suggestionID,
          companyRnD: 11
        }, { auth: submitter })
      ).rejects.toMatchObject({ response: { status: 400 } })
    })

    it('computes the weighted total score like the original ABAP formula', async () => {
      const scores = {
        companyRnD: 8, companyMarket: 7, projectSize: 6, roi: 9, profitMargin: 7,
        competition: 5, success: 8, strategy: 9, differentiation: 8,
        humanEnvironment: 6, ownership: 7
      }
      const expected =
        scores.companyRnD * 3 + scores.companyMarket * 3 + scores.projectSize * 5 +
        scores.roi * 5 + scores.profitMargin * 5 + scores.competition * 4 +
        scores.success * 5 + scores.strategy * 5 + scores.differentiation * 5 +
        scores.humanEnvironment * 2 + scores.ownership * 2

      const { data } = await POST('/odata/v4/idea/Scorings', {
        suggestion_ID: suggestionID,
        ...scores
      }, { auth: submitter })

      expect(data.totalScore).toBe(expected)
    })
  })

  describe('Decisions', () => {
    let suggestionID

    beforeAll(async () => {
      const { data } = await POST('/odata/v4/idea/Suggestions', {
        topic: 'Decision test idea',
        company_ID: companyID,
        ideaSegment_ID: segmentID
      }, { auth: submitter })
      suggestionID = data.ID
    })

    it('rejects an accepted decision without project class/type/year', async () => {
      await expect(
        POST('/odata/v4/idea/Decisions', {
          suggestion_ID: suggestionID,
          decision: 'K'
        }, { auth: manager })
      ).rejects.toMatchObject({ response: { status: 400 } })
    })

    it('generates an IdeaNumber in the ABAP format when accepted', async () => {
      await POST('/odata/v4/idea/Decisions', {
        suggestion_ID: suggestionID,
        decision: 'K',
        projectClass: 'V',
        projectType: 'YI',
        projectYear: '2025',
        governmentSupport: true
      }, { auth: manager })

      const { data } = await GET(
        `/odata/v4/idea/IdeaNumbers?$filter=suggestion_ID eq '${suggestionID}'`,
        { auth: manager }
      )

      expect(data.value.length).toBe(1)
      expect(data.value[0].ideaNumber).toMatch(/^2025-1-AD-\d{4}$/)
    })

    it('does not generate an IdeaNumber when rejected', async () => {
      const { data: suggestion } = await POST('/odata/v4/idea/Suggestions', {
        topic: 'Rejected idea',
        company_ID: companyID,
        ideaSegment_ID: segmentID
      }, { auth: submitter })

      await POST('/odata/v4/idea/Decisions', {
        suggestion_ID: suggestion.ID,
        decision: 'R'
      }, { auth: manager })

      const { data } = await GET(
        `/odata/v4/idea/IdeaNumbers?$filter=suggestion_ID eq '${suggestion.ID}'`,
        { auth: manager }
      )

      expect(data.value.length).toBe(0)
    })
  })

  describe('FileUploads', () => {
    let suggestionID

    beforeAll(async () => {
      const { data } = await POST('/odata/v4/idea/Suggestions', {
        topic: 'File upload test idea',
        company_ID: companyID,
        ideaSegment_ID: segmentID
      }, { auth: submitter })
      suggestionID = data.ID
    })

    it('rejects disallowed file types', async () => {
      await expect(
        POST('/odata/v4/idea/FileUploads', {
          suggestion_ID: suggestionID,
          fileName: 'malware.exe'
        }, { auth: submitter })
      ).rejects.toMatchObject({ response: { status: 400 } })
    })

    it('accepts an allowed file type and derives the mimeType', async () => {
      const { data } = await POST('/odata/v4/idea/FileUploads', {
        suggestion_ID: suggestionID,
        fileName: 'business-case.pdf',
        content: Buffer.from('%PDF-1.4 test').toString('base64')
      }, { auth: submitter })

      expect(data.mimeType).toBe('application/pdf')
    })
  })

  describe('Criteria', () => {
    it('is seeded with reference scoring criteria', async () => {
      const { data } = await GET('/odata/v4/idea/Criteria', { auth: submitter })
      expect(data.value.length).toBeGreaterThan(0)
    })
  })
})
