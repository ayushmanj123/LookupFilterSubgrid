# Lookup Filtered Subgrid (Power Pages PCF)

Field-bound PCF: related records filtered by a form lookup. List load uses OData `/_api`. **Create** and **Edit** open Power Pages Basic Forms in an iframe modal.

## Control properties

| Property | Required | Description |
|----------|----------|-------------|
| Bound `value` | Yes | Host Single Line Text |
| `targetEntityLogicalName` | Yes | e.g. `mcshhs_akaname` |
| `targetEntitySetName` | Yes | e.g. `mcshhs_akanames` |
| `lookupFieldLogicalName` | Yes | Form lookup e.g. `fc_applican` |
| `filterAttributeLogicalName` | Yes | Subgrid lookup e.g. `fc_contact` |
| `portalId` | Yes | Website GUID (empty GUID allowed) |
| `recordId` | Yes | Empty GUID for Insert only |
| `entityFormId` | Yes | Insert Basic Form GUID |
| `editEntityFormId` | Yes | Edit Basic Form GUID |
| `createButtonLabel` | No | Create button text (default `Create`) |

## Create iframe

```text
/_portal/modal-form-template-path/{portalId}?id={recordId}&entityformid={entityFormId}&{filterAttributeLogicalName}={lookupGuid}
```

Configure **Associated Table Reference** on the Insert form: Query String Name = `fc_contact` (match `filterAttributeLogicalName`).

## Edit iframe

```text
/_portal/modal-form-template-path/{portalId}?id={rowRecordId}&entityformid={editEntityFormId}
```

`id` comes from the grid row, not the maker `recordId` property. No `fc_contact` query param on Edit.

## UI

- Create button right-aligned; label from `createButtonLabel`.
- Row actions: dropdown with **Edit** and **Remove Other Name** (delete via Web API).
- No title / Refresh button.

After property changes: remove control → Save/Publish → import → re-add.
