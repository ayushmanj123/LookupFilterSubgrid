# PCF — Lookup Filtered Subgrid

Power Pages PCF: OData list filtered by a form lookup; Create/Edit via iframe Basic Forms.

| Folder | Purpose |
|--------|---------|
| [LookupFilteredSubgrid](LookupFilteredSubgrid/) | Source |
| [dist/](dist/) | Import ZIP |
| [scripts/Build-SolutionZip.ps1](scripts/Build-SolutionZip.ps1) | Packer |

## Download

1. **[LookupFilteredSubgridSolution_1_9_7_0.zip](dist/LookupFilteredSubgridSolution_1_9_7_0.zip)**
2. Remove old control → Save & Publish → Import → re-add **CustomPCF** control.

## Properties (v1.9.7)

| Property | Example |
|----------|---------|
| `targetEntityLogicalName` | `mcshhs_akaname` |
| `targetEntitySetName` | `mcshhs_akanames` |
| `lookupFieldLogicalName` | `fc_applican` |
| `filterAttributeLogicalName` | `fc_contact` |
| `displayColumns` | Multi-line `{fc_contact, name, …}` |
| `displayColumnLabels` | `{Contact, Name, …}` same order |
| `portalId` | website GUID or empty GUID |
| `recordId` | empty GUID (Insert) |
| `entityFormId` | Insert Basic Form GUID |
| `editEntityFormId` | Edit Basic Form GUID |
| `createButtonLabel` | e.g. `Add Other Name` |
| `editActionLabel` | e.g. `Edit Other Name` |
| `deleteActionLabel` | e.g. `Remove Other Names` |
| `pageSize` | e.g. `10` (1–100) |

v1.9.7: pager shows page numbers with Previous/Next only (no First/Last).
v1.9.6: list paging uses `Prefer: odata.maxpagesize` + `@odata.nextLink` (not `$top`/`$skip`).

## Build

```powershell
cd LookupFilteredSubgrid
npm run build
npm test
cd ..
powershell -ExecutionPolicy Bypass -File .\scripts\Build-SolutionZip.ps1
```
