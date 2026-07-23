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
| `displayColumns` | Yes | **Multiple** (multi-line) comma-separated grid columns |
| `portalId` | Yes | Website GUID (empty GUID allowed) |
| `recordId` | Yes | Empty GUID for Insert only |
| `entityFormId` | Yes | Insert Basic Form GUID |
| `editEntityFormId` | Yes | Edit Basic Form GUID |
| `createButtonLabel` | No | Create button text (default `Create`) |
| `editActionLabel` | No | Row Edit menu text (default `Edit`) |
| `deleteActionLabel` | No | Row Delete menu text (default `Remove Other Name`) |
| `pageSize` | No | Records per page, 1–100 (default `10`) |

## Display columns

```text
{fc_contact, mcshhs_akaname, mcshhs_firstname, createdon}
```

Multi-line lists are supported. List `$filter` is lookup only (no `statecode`). Column headers sort via `$orderby`. Pagination is left-aligned. Date/time cells render as `7/23/2026 11:11 PM`.

## Actions menu

Power Pages List-style dropdown using portal classes (`dropdown action`, `btn btn-default btn-xs`, `fa fa-chevron-circle-down`, `edit-link` / `delete-link`). Menu is portaled to `document.body` so it overlays the grid. Labels come from `editActionLabel` / `deleteActionLabel`.

## Create / Edit iframe

Create appends `&{filterAttributeLogicalName}={lookupGuid}`. Edit uses row id + `editEntityFormId` only.

After property changes: remove control → Save/Publish → import → re-add.
