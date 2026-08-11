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
  company              : Association to Companies;
  segment              : Association to Segments;
  topic                : LargeString;
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
  companyRnD       : Integer;
  companyMarket    : Integer;
  projectSize      : Integer;
  roi              : Integer;
  profitMargin     : Integer;
  competition      : Integer;
  success          : Integer;
  strategy         : Integer;
  differentiation  : Integer;
  humanEnvironment : Integer;
  ownership        : Integer;
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
  content    : LargeString;
}

view IdeaOverview as select from Suggestions as s
  left join Decisions   as d  on d.suggestion.ID  = s.ID
  left join IdeaNumbers as n  on n.suggestion.ID  = s.ID
  left join Scorings    as sc on sc.suggestion.ID = s.ID
{
  key s.ID          as suggestionID,
      s.createdBy,
      s.createdAt,
      s.topic,
      s.company.name as companyName,
      s.segment.name as segmentName,
      d.decision,
      sc.totalScore,
      n.ideaNumber
}
