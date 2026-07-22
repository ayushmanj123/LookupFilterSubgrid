# PCF — Lookup Filtered Subgrid

Power Pages–oriented PCF: related records filtered by a form lookup, OData list load, and **Create** via iframe Basic Form (List-style modal).

| Folder | Purpose |
|--------|---------|
| [LookupFilteredSubgrid](LookupFilteredSubgrid/) | PCF source and guide |
| [LookupFilteredSubgridSolution](LookupFilteredSubgridSolution/) | Solution project |
| [dist/](dist/) | Importable unmanaged ZIP |
| [scripts/Build-SolutionZip.ps1](scripts/Build-SolutionZip.ps1) | Pack after `npm run build` |

## Download

1. Download **[LookupFilteredSubgridSolution_1_5_0_0.zip](dist/LookupFilteredSubgridSolution_1_5_0_0.zip)**.
2. Remove the previous control from the form → Save & Publish.
3. Import → Publish.
4. Re-add **CustomPCF** / `cpf_CustomPCF.PCF.LookupFilteredSubgrid` and set properties.

## Properties (v1.5.0)

| Property | Example |
|----------|---------|
| `targetEntityLogicalName` | `mcshhs_akaname` |
| `targetEntitySetName` | `mcshhs_akanames` |
| `lookupFieldLogicalName` | `fc_applican` |
| `filterAttributeLogicalName` | `fc_contact` |
| `portalId` | website GUID or empty GUID |
| `recordId` | `00000000-0000-0000-0000-000000000000` (Insert) |
| `entityFormId` | Insert Basic Form GUID |

Create iframe URL:

`/_portal/modal-form-template-path/{portalId}?id={recordId}&entityformid={entityFormId}`

## Build

```powershell
cd LookupFilteredSubgrid
npm install
npm run build
npm test
cd ..
powershell -ExecutionPolicy Bypass -File .\scripts\Build-SolutionZip.ps1
```

Import `dist/LookupFilteredSubgridSolution_1_5_0_0.zip`.
