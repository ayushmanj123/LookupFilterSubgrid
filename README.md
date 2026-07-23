# PCF — Lookup Filtered Subgrid

Power Pages PCF: OData list filtered by a form lookup; Create/Edit via iframe Basic Forms.

| Folder | Purpose |
|--------|---------|
| [LookupFilteredSubgrid](LookupFilteredSubgrid/) | Source |
| [dist/](dist/) | Import ZIP |
| [scripts/Build-SolutionZip.ps1](scripts/Build-SolutionZip.ps1) | Packer |

## Download

1. **[LookupFilteredSubgridSolution_1_9_1_0.zip](dist/LookupFilteredSubgridSolution_1_9_1_0.zip)**
2. Remove old control → Save & Publish → Import → re-add **CustomPCF** control.

## Properties (v1.9.1)

| Property | Example |
|----------|---------|
| `targetEntityLogicalName` | `mcshhs_akaname` |
| `targetEntitySetName` | `mcshhs_akanames` |
| `lookupFieldLogicalName` | `fc_applican` |
| `filterAttributeLogicalName` | `fc_contact` |
| `displayColumns` | Multi-line `{fc_contact, name, …}` |
| `portalId` | website GUID or empty GUID |
| `recordId` | empty GUID (Insert) |
| `entityFormId` | Insert Basic Form GUID |
| `editEntityFormId` | Edit Basic Form GUID |
| `createButtonLabel` | e.g. `Add Other Name` |
| `editActionLabel` | e.g. `Edit Other Name` |
| `deleteActionLabel` | e.g. `Remove Other Names` |

v1.9.1: actions menu uses portal List classes (`dropdown action`, `btn-xs`, `fa-chevron-circle-down`, `edit-link` / `delete-link`).

## Build

```powershell
cd LookupFilteredSubgrid
npm run build
npm test
cd ..
powershell -ExecutionPolicy Bypass -File .\scripts\Build-SolutionZip.ps1
```
