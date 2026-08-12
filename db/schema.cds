using { cuid, managed } from '@sap/cds/common';

namespace ideamanagement.db;

entity Companies : cuid {
  code : String(1);
  name : String(60);
}

entity Segments : cuid {
  code   : String(1);
  name   : String(60);
  leader : String(60);
}

entity Criteria : cuid {
  successFactor : String(100);
  score1to3     : String(100);
  score4to6     : String(100);
  score7to9     : String(100);
  score10       : String(100);
}

entity Users : cuid {
  username : String(60);
  password : String(60);
  title    : String(40);
  role     : String(10) enum { submitter = 'SUBMITTER'; manager = 'MANAGER'; } default 'SUBMITTER';
}

entity Suggestions : cuid, managed {
  submittedBy          : Association to Users;
  company              : Association to Companies @mandatory;
  ideaSegment          : Association to Segments  @mandatory;
  topic                : LargeString @mandatory;
  productFeatures      : LargeString;
  innovations          : LargeString;
  feasibility          : LargeString;
  additionalInvestment : LargeString;
  scoring              : Composition of one Scorings   on scoring.suggestion   = $self;
  decision             : Composition of one Decisions  on decision.suggestion  = $self;
  ideaNumber           : Composition of one IdeaNumbers on ideaNumber.suggestion = $self;
  files                : Composition of many FileUploads on files.suggestion   = $self;
}

entity Scorings : cuid {
  suggestion       : Association to Suggestions;
  companyRnD       : Integer @assert.range: [0, 10];
  companyMarket    : Integer @assert.range: [0, 10];
  projectSize      : Integer @assert.range: [0, 10];
  roi              : Integer @assert.range: [0, 10];
  profitMargin     : Integer @assert.range: [0, 10];
  competition      : Integer @assert.range: [0, 10];
  success          : Integer @assert.range: [0, 10];
  strategy         : Integer @assert.range: [0, 10];
  differentiation  : Integer @assert.range: [0, 10];
  humanEnvironment : Integer @assert.range: [0, 10];
  ownership        : Integer @assert.range: [0, 10];
  totalScore       : Integer;
}

entity Decisions : cuid {
  suggestion        : Association to Suggestions;
  decision          : String(1) enum { accepted = 'K'; rejected = 'R'; onHold = 'B'; };
  projectClass      : String(1) enum { supportive = 'B'; divergent = 'A'; stable = 'I'; visionary = 'V'; };
  projectType       : String(2) enum { managementSupported = 'YI'; internal = 'I'; managementSupportedInternal = 'YD'; };
  projectYear       : String(4);
  governmentSupport : Boolean default false;
}

entity IdeaNumbers : cuid {
  suggestion : Association to Suggestions;
  ideaNumber : String(30);
}

entity FileUploads : cuid, managed {
  suggestion : Association to Suggestions;
  fileName   : String(255);
  mimeType   : String(100);
  content    : LargeString;
}

view IdeaOverview as select from Suggestions {
  key ID as suggestionID,
  createdBy,
  createdAt,
  topic,
  company.name     as companyName,
  ideaSegment.name as segmentName,
  scoring.totalScore,
  decision.decision,
  ideaNumber.ideaNumber
}
