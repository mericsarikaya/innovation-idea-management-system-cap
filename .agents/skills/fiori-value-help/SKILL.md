---
name: fiori-value-help
description: Best practices and troubleshooting steps for Fiori Elements V4 Value Help (Dropdown) issues in SAP CAP projects.
---
# Fiori Value Help (Dropdown) Troubleshooting in SAP CAP

When troubleshooting missing or malfunctioning Value Helps (Dropdowns) in Fiori Elements V4 for SAP CAP, always check the following 3 critical areas:

## 1. Annotation Target (Hedef Sapması)
If the UI uses the foreign key (e.g., `company_ID`) in a `FieldGroup` or `LineItem`, the `@Common.ValueList` annotation **MUST** be placed on the association itself (e.g., `company`), NOT on the foreign key field. 
- ❌ **WRONG**: Annotating `company_ID @( Common.ValueList: ... )`. The CDS compiler will throw an "Element has not been found" warning and silently drop the annotation from the EDMX.
- ✅ **CORRECT**: Annotating `company @( Common.ValueList: ... )`. Fiori Elements will automatically map the ValueHelp to the `company_ID` field on the UI.

## 2. Unexposed Entities (Dışarı Açılmamış Tablolar)
For a Value Help to work, the target entity defined in `CollectionPath` MUST be exposed in the same OData service.
- If you point to `CollectionPath: 'Users'`, ensure that `Users` is projected in your service (e.g., `@readonly entity Users as projection on db.Users;`).
- Failure to expose the target entity will result in Fiori Elements failing to fetch the metadata for the dropdown. This can cause the UI to silently drop the Value Help icon altogether, or in some cases, cause the metadata generation to crash and hide ALL other Value Helps on the page.

## 3. UUID Data Validation (Sessiz Hatalar)
If the Value Help icon is visible but selecting a value results in a validation error (e.g., "Eksik değeri sağlayın" / "Provide missing value"), verify the underlying seed data or database entries.
- CAP strictly validates `UUID` types (like `cuid`) against valid hexadecimal formats (`0-9`, `a-f`).
- If seed data contains invalid UUIDs (e.g., starting with an 's' like `s111...`), the CAP OData layer will silently reject the value and treat it as NULL. If the field is `@mandatory`, it will trigger a validation error.
- Check your `.csv` seed files and ensure all UUIDs are valid hex strings (e.g., `a1111111-1111-1111-1111-111111111111`).
