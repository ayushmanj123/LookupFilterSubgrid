# PCF — Lookup Filtered Subgrid

Power Pages–oriented PCF control that shows related Dataverse records filtered by a lookup on the current form, with full CRUD.

| Folder | Purpose |
|--------|---------|
| [LookupFilteredSubgrid](LookupFilteredSubgrid/) | PCF source, build (`npm run build`), and deployment guide |
| [LookupFilteredSubgridSolution](LookupFilteredSubgridSolution/) | Dataverse solution project referencing the control |
| [dist/](dist/) | Ready-to-import unmanaged Dataverse solution ZIP |
| [scripts/Build-SolutionZip.ps1](scripts/Build-SolutionZip.ps1) | Rebuilds the solution ZIP after `npm run build` |

## Download and import into CRM / Dataverse

1. Download **[LookupFilteredSubgridSolution_1_2_2_0.zip](dist/LookupFilteredSubgridSolution_1_2_2_0.zip)** from this repo.
2. **Remove** any previous version of this control from the Contact form → Save & Publish.
3. Import the ZIP → Publish customizations.
4. Re-add the control (**Ayush** publisher / `ayu_Ayush.PCF.LookupFilteredSubgrid`) on a Single Line Text placeholder field and set the **3 properties** below.

## Control properties (v1.2.0)

| Property | Example | Meaning |
|----------|---------|---------|
| Bound `value` | Placeholder text column on Contact | Host field for the PCF |
| `targetEntityLogicalName` | `akatable` | Subgrid table logical name |
| `lookupFieldLogicalName` | `fc_applican` | Lookup on the Contact form |
| `filterAttributeLogicalName` | `fc_contact` | Lookup on the subgrid table |

Filtering uses **FetchXML built in code** (not a form property). Columns and create-bind entity set are resolved from Dataverse metadata.

## Build

```powershell
cd LookupFilteredSubgrid
npm install
npm run build
npm test
cd ..
powershell -ExecutionPolicy Bypass -File .\scripts\Build-SolutionZip.ps1
```

## Power Pages setup

1. Ensure `fc_applican` is on the same form (can be hidden).
2. Enable the custom component on the placeholder field.
3. Enable Web API site settings + table permissions for `akatable` (and Contact as needed).

Full notes: [LookupFilteredSubgrid/README.md](LookupFilteredSubgrid/README.md).
