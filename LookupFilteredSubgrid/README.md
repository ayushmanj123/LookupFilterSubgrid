# Lookup Filtered Subgrid (Power Pages PCF)

Field-bound Power Apps Component Framework control that displays related Dataverse records filtered by a **lookup value on the same form** (for example, Applicant 2). Supports **view, create, edit, and delete** via the portal Web API.

## Project layout

```text
LookupFilteredSubgrid/                 # PCF project root
  LookupFilteredSubgrid/               # Control source
    ControlManifest.Input.xml
    index.ts
    components/
    services/
  package.json
LookupFilteredSubgridSolution/         # Dataverse solution package (optional packaging)
```

## Build

```powershell
cd LookupFilteredSubgrid
npm install
npm run build
```

Output bundle: `LookupFilteredSubgrid/out/controls/LookupFilteredSubgrid/`.

To package into a Dataverse solution, use Power Platform CLI once installed:

```powershell
pac solution init --publisher-name Zerodha --publisher-prefix zrd --outputDirectory LookupFilteredSubgridSolution
pac solution add-reference --path LookupFilteredSubgrid --outputDirectory LookupFilteredSubgridSolution
msbuild LookupFilteredSubgridSolution /p:Configuration=Release
```

Import the generated zip into your environment, then publish customizations.

## Control properties

| Property | Required | Description |
|----------|----------|-------------|
| Bound `value` | Yes | Placeholder Single Line Text column that hosts the control |
| `targetEntityLogicalName` | Yes | Subgrid table logical name (e.g. `akatable`) |
| `lookupFieldLogicalName` | Yes | Lookup on the primary form (e.g. `fc_applican`) |
| `filterAttributeLogicalName` | Yes | Lookup on the subgrid table (e.g. `fc_contact`) |

Filtering uses FetchXML built in code. Display columns and create-bind entity set come from Dataverse metadata.

## Power Pages setup

1. **Dataverse**
   - Add a Single Line Text placeholder column on the form table (e.g. Applicant).
   - Add that column to the form used by Power Pages.
   - Configure this PCF on that column (Web client).
   - Ensure the filter lookup field (e.g. Applicant 2) is on the same form (can be hidden).

2. **Enable the component on the portal form**
   - Design Studio: open the form field → **Enable custom component**, or
   - Portals Management → Basic Form Metadata → Type **Attribute** → Control Style **Code Component**.

3. **Web API site settings** (Site Settings in Power Pages)
   - Enable Web API for the **related** table with the operations you need (`Read`, `Create`, `Update`, `Delete`).
   - Example keys (names vary by site template):
     - `Webapi/{entitylogicalname}/enabled` = `true`
     - `Webapi/{entitylogicalname}/fields` = `*` or the field list you expose

4. **Table permissions**
   - Grant the authenticated (or anonymous) web role **Read / Create / Write / Delete** on the related table with an appropriate scope (often **Global** or **Contact**-based, depending on your model).
   - Also ensure the user can read the lookup target table if needed for bind resolution.

5. **Configure property values** on the form control so they match your schema, for example:
   - Lookup field: `cr123_applicant2`
   - Target entity: `cr123_document`
   - Filter attribute: `cr123_applicant`
   - Filter lookup entity set: `cr123_applicants`
   - Display columns: `cr123_name,cr123_status`
   - Primary name: `cr123_name`

## Runtime behavior

- Reads the sibling lookup GUID via Power Pages Client API (`$pages`) when available, otherwise portal DOM.
- Loads rows with `context.webAPI.retrieveMultipleRecords` filtered by `_filterAttr_value eq {guid}`.
- Create binds the filter lookup to the selected GUID; edit/delete call Web API and refresh the grid.
- Changing the lookup reloads page 1 of the grid.

## Notes

- Power Pages does not support multi-field PCF binding; the placeholder text column is required as the host.
- Do not enable Device/Utility `uses-feature` flags; they are unsupported on Power Pages.
- Column editors in the create/edit panel are text inputs in v1 (suitable for text/number-as-text). Extend `RecordForm` for option sets/dates as needed.
