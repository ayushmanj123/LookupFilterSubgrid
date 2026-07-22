# PCF — Lookup Filtered Subgrid

Power Pages–oriented PCF control that shows related Dataverse records filtered by a lookup on the current form, with full CRUD.

| Folder | Purpose |
|--------|---------|
| [LookupFilteredSubgrid](LookupFilteredSubgrid/) | PCF source, build (`npm run build`), and deployment guide |
| [LookupFilteredSubgridSolution](LookupFilteredSubgridSolution/) | Dataverse solution project referencing the control |
| [dist/](dist/) | Ready-to-import unmanaged Dataverse solution ZIP |
| [scripts/Build-SolutionZip.ps1](scripts/Build-SolutionZip.ps1) | Rebuilds the solution ZIP after `npm run build` |

## Download and import into CRM / Dataverse

1. Download **[LookupFilteredSubgridSolution_1_4_0_0.zip](dist/LookupFilteredSubgridSolution_1_4_0_0.zip)** from this repo.
2. **Remove** any previous version of this control from the Contact form → Save & Publish.
3. Import the ZIP → Publish customizations.
4. Re-add the control (**CustomPCF** publisher / `cpf_CustomPCF.PCF.LookupFilteredSubgrid`) on a Single Line Text placeholder field and set the properties below.

## Control properties (v1.4.0)

| Property | Example | Meaning |
|----------|---------|---------|
| Bound `value` | Placeholder text column on Contact | Host field for the PCF |
| `targetEntityLogicalName` | `mcshhs_akaname` | Subgrid table logical name |
| `targetEntitySetName` | `mcshhs_akanames` | OData / Web API entity set for `/_api` |
| `lookupFieldLogicalName` | `fc_applican` | Lookup on the Contact form |
| `filterAttributeLogicalName` | `fc_contact` | Lookup on the subgrid table |

List loads use **OData only** via `webapi.safeAjax` (no FetchXML), for example:

`GET /_api/mcshhs_akanames?$select=name,createdon&$filter=_fc_contact_value eq GUID and statecode eq 0&$orderby=createdon desc&$top=10`

## Build

```powershell
cd LookupFilteredSubgrid
npm install
npm run build
npm test
cd ..
powershell -ExecutionPolicy Bypass -File .\scripts\Build-SolutionZip.ps1
```

Import `dist/LookupFilteredSubgridSolution_1_4_0_0.zip`, then publish customizations.

## Notes

- The page must include Microsoft’s `webapi.safeAjax` wrapper script.
- After publisher or property changes, remove the old control from the form before re-adding.
