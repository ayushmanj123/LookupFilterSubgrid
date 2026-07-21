# PCF — Lookup Filtered Subgrid

Power Pages–oriented PCF control that shows related Dataverse records filtered by a lookup on the current form, with full CRUD.

| Folder | Purpose |
|--------|---------|
| [LookupFilteredSubgrid](LookupFilteredSubgrid/) | PCF source, build (`npm run build`), and deployment guide |
| [LookupFilteredSubgridSolution](LookupFilteredSubgridSolution/) | Dataverse solution project referencing the control |
| [dist/](dist/) | Ready-to-import unmanaged Dataverse solution ZIP |
| [scripts/Build-SolutionZip.ps1](scripts/Build-SolutionZip.ps1) | Rebuilds the solution ZIP after `npm run build` |

## Download and import into CRM / Dataverse

1. Download **[LookupFilteredSubgridSolution_1_0_0_0.zip](dist/LookupFilteredSubgridSolution_1_0_0_0.zip)** from this repo (or from the latest GitHub Release).
2. In make.powerapps.com → **Solutions** → **Import solution** → select the ZIP → Import.
3. After import, add the control to a Single Line Text column on your form (Web client), then enable it on the Power Pages form.

Rebuild the ZIP locally:

```powershell
cd LookupFilteredSubgrid
npm run build
cd ..
powershell -ExecutionPolicy Bypass -File .\scripts\Build-SolutionZip.ps1
```

Full portal setup (Web API site settings, table permissions): [LookupFilteredSubgrid/README.md](LookupFilteredSubgrid/README.md).
