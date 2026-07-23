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

## Display columns

```text
{fc_contact, mcshhs_akaname, mcshhs_firstname, createdon}
```

Multi-line lists are supported (newlines treated as commas). No 100-character Single Line limit.

| Token | Behavior |
|-------|----------|
| Equals `filterAttributeLogicalName` | Expanded to `_…_value` FormattedValue |
| `_otherlookup_value` | Other lookups |
| Plain attribute | Selected and shown as-is |

List `$filter` is **lookup only** (no `statecode eq 0`). Click column headers to sort (`$orderby`). Pagination uses Power Pages List-style Bootstrap pager (First / Previous / page / Next / Last disabled).

## Create / Edit iframe

Create appends `&{filterAttributeLogicalName}={lookupGuid}`. Edit uses row id + `editEntityFormId` only.

After property changes: remove control → Save/Publish → import → re-add.
