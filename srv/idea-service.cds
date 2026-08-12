using { ideamanagement.db as db } from '../db/schema';

service IdeaService @(path: 'idea') {

  @readonly
  entity Companies as projection on db.Companies;

  @readonly
  entity Segments as projection on db.Segments;

  @readonly
  entity Criteria as projection on db.Criteria;

  @readonly
  entity Users as projection on db.Users;

  @odata.draft.enabled
  @cds.redirection.target
  @(restrict: [
    { grant: ['READ'],   to: 'Submitter' },
    { grant: ['READ'],   to: 'Manager' },
    { grant: ['CREATE'], to: 'Submitter' },
    { grant: ['UPDATE'], to: 'Submitter', where: (submittedBy.username = $user) }
  ])
  entity Suggestions as projection on db.Suggestions;

  @(restrict: [
    { grant: ['READ'],             to: 'Submitter' },
    { grant: ['READ'],             to: 'Manager' },
    { grant: ['CREATE', 'UPDATE'], to: 'Submitter' }
  ])
  entity Scorings as projection on db.Scorings;

  @(restrict: [
    { grant: ['READ'],                     to: 'Submitter' },
    { grant: ['READ', 'CREATE', 'UPDATE'], to: 'Manager' },
    { grant: ['CREATE', 'UPDATE'],         to: 'Submitter' }
  ])
  entity Decisions as projection on db.Decisions;

  @readonly
  entity IdeaNumbers as projection on db.IdeaNumbers;

  @(restrict: [
    { grant: ['READ'],             to: 'Submitter' },
    { grant: ['READ'],             to: 'Manager' },
    { grant: ['CREATE', 'DELETE'], to: 'Submitter' }
  ])
  entity FileUploads as projection on db.FileUploads;

  @readonly
  entity IdeaOverview as projection on db.IdeaOverview;
}
