# PCF — Lookup Filtered Subgrid

Power Pages PCF: OData list filtered by a form lookup; Create/Edit via iframe Basic Forms.

| Folder | Purpose |
|--------|---------|
| [LookupFilteredSubgrid](LookupFilteredSubgrid/) | Source |
| [dist/](dist/) | Import ZIP |
| [scripts/Build-SolutionZip.ps1](scripts/Build-SolutionZip.ps1) | Packer |

## Download

1. **[LookupFilteredSubgridSolution_1_6_0_0.zip](dist/LookupFilteredSubgridSolution_1_6_0_0.zip)**
2. Remove old control → Save & Publish → Import → re-add **CustomPCF** control.

## Properties (v1.6.0)

| Property | Example |
|----------|---------|
| `targetEntityLogicalName` | `mcshhs_akaname` |
| `targetEntitySetName` | `mcshhs_akanames` |
| `lookupFieldLogicalName` | `fc_applican` |
| `filterAttributeLogicalName` | `fc_contact` |
| `portalId` | website GUID or empty GUID |
| `recordId` | `00000000-0000-0000-0000-000000000000` (Insert) |
| `entityFormId` | Insert Basic Form GUID |
| `editEntityFormId` | Edit Basic Form GUID |
| `createButtonLabel` | e.g. `Add Other Name` |

Create: `...&entityformid={entityFormId}&fc_contact={guid}`  
Edit: `...&id={rowId}&entityformid={editEntityFormId}`

## Build

```powershell
cd LookupFilteredSubgrid
npm run build
npm test
cd ..
powershell -ExecutionPolicy Bypass -File .\scripts\Build-SolutionZip.ps1
```
