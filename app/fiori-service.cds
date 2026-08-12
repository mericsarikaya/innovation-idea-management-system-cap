using { ideamanagement.db as db } from '../db/schema';
using IdeaService from '../srv/idea-service';

// ─── Value Helps ───

annotate IdeaService.Suggestions with {
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
  ideaSegment @(
    Common.ValueList: {
      CollectionPath: 'Segments',
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: ideaSegment_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'code' },
      ]
    },
    Common.Text: ideaSegment.name,
    Common.TextArrangement: #TextOnly
  );
};

// ─── Suggestions: List Report + Object Page ───

annotate IdeaService.Suggestions with @(
  Capabilities: {
    InsertRestrictions.Insertable: true,
    UpdateRestrictions.Updatable:  true,
    DeleteRestrictions.Deletable:  true
  },
  UI: {
    HeaderInfo: {
      TypeName:       'Suggestion',
      TypeNamePlural: 'Suggestions',
      Title:          { Value: topic },
      Description:    { Value: company.name }
    },
    SelectionFields: [ company_ID, ideaSegment_ID, createdAt ],
    LineItem: [
      { Value: topic,                    Label: 'Topic' },
      { Value: company.name,            Label: 'Company' },
      { Value: ideaSegment.name,        Label: 'Segment' },
      { Value: submittedBy.username,    Label: 'Submitted By' },
      { Value: createdAt,               Label: 'Created At' },
    ],
    FieldGroup #General: {
      Data: [
        { Value: topic,                 Label: 'Topic' },
        { Value: company_ID,            Label: 'Company' },
        { Value: ideaSegment_ID,        Label: 'Segment' },
        { Value: submittedBy.username,  Label: 'Submitted By' },
        { Value: createdAt,             Label: 'Created At' },
      ]
    },
    FieldGroup #Content: {
      Data: [
        { Value: productFeatures,       Label: 'Product Features' },
        { Value: innovations,           Label: 'Innovations' },
        { Value: feasibility,           Label: 'Feasibility' },
        { Value: additionalInvestment,  Label: 'Additional Investment' },
      ]
    },
    Facets: [
      { $Type: 'UI.CollectionFacet', ID: 'GeneralInfo', Label: 'General Information', Facets: [
        { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#General', Label: 'Details' },
        { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#Content', Label: 'Content' },
      ]},
      { $Type: 'UI.ReferenceFacet', Target: 'scoring/@UI.FieldGroup#ScoringDetails',   Label: 'Scoring' },
      { $Type: 'UI.ReferenceFacet', Target: 'decision/@UI.FieldGroup#DecisionDetails', Label: 'Decision' },
      { $Type: 'UI.ReferenceFacet', Target: 'files/@UI.LineItem',                      Label: 'Files' },
    ]
  }
);

// ─── Scorings ───

annotate IdeaService.Scorings with @(
  UI: {
    FieldGroup #ScoringDetails: {
      Data: [
        { Value: companyRnD,        Label: 'Company R&D' },
        { Value: companyMarket,     Label: 'Company Market' },
        { Value: projectSize,       Label: 'Project Size' },
        { Value: roi,               Label: 'ROI' },
        { Value: profitMargin,      Label: 'Profit Margin' },
        { Value: competition,       Label: 'Competition' },
        { Value: success,           Label: 'Success' },
        { Value: strategy,          Label: 'Strategy' },
        { Value: differentiation,   Label: 'Differentiation' },
        { Value: humanEnvironment,  Label: 'Human & Environment' },
        { Value: ownership,         Label: 'Ownership' },
        { Value: totalScore,        Label: 'Total Score' },
      ]
    }
  }
);

// ─── Decisions ───

annotate IdeaService.Decisions with @(
  UI: {
    FieldGroup #DecisionDetails: {
      Data: [
        { Value: decision,          Label: 'Decision' },
        { Value: projectClass,      Label: 'Project Class' },
        { Value: projectType,       Label: 'Project Type' },
        { Value: projectYear,       Label: 'Project Year' },
        { Value: governmentSupport, Label: 'Government Support' },
      ]
    }
  }
);

// ─── FileUploads ───

annotate IdeaService.FileUploads with @(
  UI: {
    LineItem: [
      { Value: fileName,  Label: 'File Name' },
      { Value: mimeType,  Label: 'MIME Type' },
      { Value: createdAt, Label: 'Uploaded At' },
    ]
  }
);
