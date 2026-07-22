# Lookup Filtered Subgrid (Power Pages PCF)

Field-bound Power Apps Component Framework control that displays related Dataverse records filtered by a **lookup value on the same form**. List load uses OData `/_api`; **Create** opens a Power Pages Basic Form in an iframe modal (same pattern as List).

## Control properties

| Property | Required | Description |
|----------|----------|-------------|
| Bound `value` | Yes | Placeholder Single Line Text column that hosts the control |
| `targetEntityLogicalName` | Yes | Subgrid table logical name (e.g. `mcshhs_akaname`) |
| `targetEntitySetName` | Yes | OData entity set for `/_api` (e.g. `mcshhs_akanames`) |
| `lookupFieldLogicalName` | Yes | Lookup on the primary form (e.g. `fc_applican`) |
| `filterAttributeLogicalName` | Yes | Lookup on the subgrid table (e.g. `fc_contact`) |
| `portalId` | Yes | Website GUID for `/_portal/modal-form-template-path/{portalId}` (empty GUID allowed) |
| `recordId` | Yes | Form record GUID; use `00000000-0000-0000-0000-000000000000` for Insert |
| `entityFormId` | Yes | Insert Basic Form (entity form) GUID |

## Create (iframe)

Create uses:

```text
/_portal/modal-form-template-path/{portalId}?id={recordId}&entityformid={entityFormId}&{filterAttributeLogicalName}={lookupGuid}
```

Example with your properties:

```text
...&entityformid=...&fc_contact=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
```

On the Insert Basic Form, configure **Associated Table Reference**:

| Setting | Value |
|---------|--------|
| Set Table Reference On Save | Yes |
| Target Lookup Attribute Logical Name | `fc_contact` |
| Table Logical Name | `contact` |
| Source Type | Query String |
| Query String Name | `fc_contact` (must match `filterAttributeLogicalName`) |
| Query String Is Primary Key | Yes |
| Populate Lookup Field | Yes |

Find IDs in Portal Management: **Websites** (portalId), **Basic Forms** (entityFormId).

## Power Pages setup

1. Enable the PCF on a placeholder text column; keep the filter lookup on the form.
2. Include `webapi.safeAjax` for grid load / edit / delete.
3. Web API site settings + table permissions for the related table.
4. Create an **Insert** Basic Form for the related table and set `entityFormId` / `portalId` / `recordId` (empty GUID).
5. After property changes: remove control → Save/Publish → import → re-add.

## Runtime

- Grid styled like portal List (`entity-grid`, Bootstrap `btn` / `table`).
- Load: OData `$select` / `$filter` / `$orderby` / `$top`.
- **Create**: Bootstrap modal + iframe Basic Form; grid reloads when the modal closes.
- **Edit/Delete**: still Web API (edit modal / confirm) in v1.5.0.
