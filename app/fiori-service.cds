using { ideamanagement.db as db } from '../db/schema';

annotate db.Suggestions with {
  company @(
    Common.ValueList: {
      CollectionPath: 'Companies',
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: company_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'code' },
      ]
    },
    Common.Text: company.name,
    Common.TextArrangement: #TextOnly
  );
  segment @(
    Common.ValueList: {
      CollectionPath: 'Segments',
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: segment_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'code' },
      ]
    },
    Common.Text: segment.name,
    Common.TextArrangement: #TextOnly
  );
};

annotate db.Suggestions with @(
  UI: {
    LineItem: [
      { Value: topic, Label: 'Topic' },
      { Value: company.name, Label: 'Company' },
      { Value: segment.name, Label: 'Segment' },
      { Value: submittedBy.username, Label: 'Submitted By' },
      { Value: createdAt, Label: 'Created At' },
    ],
    FieldGroup #Details: {
      Data: [
        { Value: topic, Label: 'Topic' },
        { Value: productFeatures, Label: 'Product Features' },
        { Value: innovations, Label: 'Innovations' },
        { Value: feasibility, Label: 'Feasibility' },
        { Value: additionalInvestment, Label: 'Additional Investment' },
        { Value: company_ID, Label: 'Company' },
        { Value: segment_ID, Label: 'Segment' },
        { Value: submittedBy.username, Label: 'Submitted By' },
        { Value: createdAt, Label: 'Created At' },
      ]
    }
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Details', Label: 'Details' }
  ]
);

annotate db.Scorings with @(
  UI: {
    LineItem: [
      { Value: suggestion.topic, Label: 'Suggestion Topic' },
      { Value: totalScore, Label: 'Total Score' },
      { Value: companyRnD, Label: 'Company R&D' },
      { Value: companyMarket, Label: 'Company Market' },
    ],
    FieldGroup #ScoringDetails: {
      Data: [
        { Value: companyRnD, Label: 'Company R&D' },
        { Value: companyMarket, Label: 'Company Market' },
        { Value: projectSize, Label: 'Project Size' },
        { Value: roi, Label: 'ROI' },
        { Value: profitMargin, Label: 'Profit Margin' },
        { Value: competition, Label: 'Competition' },
        { Value: success, Label: 'Success' },
        { Value: strategy, Label: 'Strategy' },
        { Value: differentiation, Label: 'Differentiation' },
        { Value: humanEnvironment, Label: 'Human Environment' },
        { Value: ownership, Label: 'Ownership' },
        { Value: totalScore, Label: 'Total Score' },
      ]
    }
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#ScoringDetails', Label: 'Scores' }
  ]
);

annotate db.Decisions with @(
  UI: {
    LineItem: [
      { Value: suggestion.topic, Label: 'Suggestion Topic' },
      { Value: decision, Label: 'Decision' },
      { Value: projectClass, Label: 'Project Class' },
      { Value: projectType, Label: 'Project Type' },
      { Value: projectYear, Label: 'Project Year' },
    ],
    FieldGroup #DecisionDetails: {
      Data: [
        { Value: decision, Label: 'Decision' },
        { Value: projectClass, Label: 'Project Class' },
        { Value: projectType, Label: 'Project Type' },
        { Value: projectYear, Label: 'Project Year' },
        { Value: governmentSupport, Label: 'Government Support' },
      ]
    }
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#DecisionDetails', Label: 'Decision Info' }
  ]
);
