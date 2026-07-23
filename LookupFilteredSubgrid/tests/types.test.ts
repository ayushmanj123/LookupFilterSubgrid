import assert from "node:assert/strict";
import {
  buildModalFormUrl,
  createDemoRecords,
  EMPTY_GUID,
  FORMATTED_VALUE_ANNOTATION,
  getMissingConfigFields,
  normalizeGuid,
  parseDisplayColumns,
  parseDisplayColumnLabels,
  resolvePageSize,
  formatDateTimeDisplay,
  resolvePortalRecordId,
  ControlConfig,
} from "../LookupFilteredSubgrid/types";
import {
  and,
  buildApiUrl,
  buildODataQueryString,
  buildRecordUrl,
  eq,
  lookupEq,
  not,
  or,
  toFilterString,
  toODataOrderByField,
  toODataSelectFields,
} from "../LookupFilteredSubgrid/services/odata/ODataQuery";

function baseConfig(overrides: Partial<ControlConfig> = {}): ControlConfig {
  return {
    lookupFieldLogicalName: "fc_applican",
    targetEntityLogicalName: "mcshhs_akaname",
    targetEntitySetName: "mcshhs_akanames",
    filterAttributeLogicalName: "fc_contact",
    portalId: EMPTY_GUID,
    recordId: EMPTY_GUID,
    entityFormId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    editEntityFormId: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
    createButtonLabel: "Create",
    editActionLabel: "Edit",
    deleteActionLabel: "Remove Other Name",
    filterLookupEntitySetName: "contacts",
    displayColumns: [
      "mcshhs_akaname",
      "mcshhs_firstname",
      "createdon",
      "_fc_contact_value@OData.Community.Display.V1.FormattedValue",
    ],
    displayColumnLabels: [],
    primaryNameAttribute: "mcshhs_akaname",
    pageSize: 10,
    enableCreate: true,
    enableEdit: true,
    enableDelete: true,
    useDemoData: false,
    ...overrides,
  };
}

assert.deepEqual(getMissingConfigFields(baseConfig()), []);
assert.ok(
  getMissingConfigFields(baseConfig({ lookupFieldLogicalName: "" })).includes(
    "lookupFieldLogicalName"
  )
);
assert.ok(getMissingConfigFields(baseConfig({ entityFormId: "" })).includes("entityFormId"));
assert.ok(getMissingConfigFields(baseConfig({ editEntityFormId: "" })).includes("editEntityFormId"));
assert.ok(getMissingConfigFields(baseConfig({ displayColumns: [] })).includes("displayColumns"));

const parsedBraces = parseDisplayColumns(
  "{fc_contact, mcshhs_akaname, mcshhs_firstname, createdon}",
  "fc_contact"
);
assert.deepEqual(parsedBraces.displayColumns, [
  `_fc_contact_value${FORMATTED_VALUE_ANNOTATION}`,
  "mcshhs_akaname",
  "mcshhs_firstname",
  "createdon",
]);
assert.equal(parsedBraces.primaryNameAttribute, "mcshhs_akaname");

const parsedPlain = parseDisplayColumns("name, firstname,lastname", "fc_contact");
assert.deepEqual(parsedPlain.displayColumns, ["name", "firstname", "lastname"]);
assert.equal(parsedPlain.primaryNameAttribute, "name");

const parsedLookupValue = parseDisplayColumns("_fc_contact_value, name", "fc_contact");
assert.equal(
  parsedLookupValue.displayColumns[0],
  `_fc_contact_value${FORMATTED_VALUE_ANNOTATION}`
);
assert.equal(parsedLookupValue.primaryNameAttribute, "name");

assert.deepEqual(parseDisplayColumns("  { , , }  ", "fc_contact").displayColumns, []);
assert.deepEqual(parseDisplayColumns("", "fc_contact").displayColumns, []);

assert.equal(resolvePageSize(null), 10);
assert.equal(resolvePageSize(undefined), 10);
assert.equal(resolvePageSize(0), 10);
assert.equal(resolvePageSize(-5), 10);
assert.equal(resolvePageSize(25), 25);
assert.equal(resolvePageSize(150), 100);
assert.equal(resolvePageSize("7"), 7);

assert.deepEqual(
  parseDisplayColumnLabels("{Contact, Name, First Name, Created On}"),
  ["Contact", "Name", "First Name", "Created On"]
);
assert.deepEqual(parseDisplayColumnLabels("A, B\nC"), ["A", "B", "C"]);
assert.deepEqual(parseDisplayColumnLabels(""), []);

assert.equal(formatDateTimeDisplay("not-a-date"), null);
assert.equal(formatDateTimeDisplay(null), null);
{
  const local = new Date(2026, 6, 23, 23, 11, 0);
  assert.equal(formatDateTimeDisplay(local), "7/23/2026 11:11 PM");
  const morning = new Date(2026, 0, 5, 9, 5, 0);
  assert.equal(formatDateTimeDisplay(morning), "1/5/2026 9:05 AM");
}

const parsedMultiline = parseDisplayColumns(
  "{\nfc_contact,\nmcshhs_akaname,\nmcshhs_firstname\n}",
  "fc_contact"
);
assert.deepEqual(parsedMultiline.displayColumns, [
  `_fc_contact_value${FORMATTED_VALUE_ANNOTATION}`,
  "mcshhs_akaname",
  "mcshhs_firstname",
]);

assert.equal(resolvePortalRecordId(""), EMPTY_GUID);
assert.equal(resolvePortalRecordId("{11111111-1111-1111-1111-111111111111}"), "11111111-1111-1111-1111-111111111111");

assert.equal(
  buildModalFormUrl(EMPTY_GUID, EMPTY_GUID, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
  `/_portal/modal-form-template-path/${EMPTY_GUID}?id=${EMPTY_GUID}&entityformid=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`
);

assert.equal(
  buildModalFormUrl(EMPTY_GUID, EMPTY_GUID, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", {
    paramName: "fc_contact",
    recordId: "11111111-1111-1111-1111-111111111111",
  }),
  `/_portal/modal-form-template-path/${EMPTY_GUID}?id=${EMPTY_GUID}&entityformid=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee&fc_contact=11111111-1111-1111-1111-111111111111`
);

assert.equal(
  normalizeGuid("{AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE}"),
  "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
);
assert.equal(normalizeGuid("bad"), null);

const guid = "11111111-1111-1111-1111-111111111111";
const filter = lookupEq("fc_contact", guid);
assert.equal(
  toFilterString(filter),
  "_fc_contact_value eq 11111111-1111-1111-1111-111111111111"
);
assert.ok(toFilterString(or(eq("statuscode", 1), eq("statuscode", 2))).includes(" or "));
assert.equal(toFilterString(not(eq("statecode", 1))), "not (statecode eq 1)");
assert.equal(
  toFilterString(and(lookupEq("fc_contact", guid), eq("statecode", 0))),
  "(_fc_contact_value eq 11111111-1111-1111-1111-111111111111) and (statecode eq 0)"
);

assert.equal(
  toODataOrderByField(`_fc_contact_value${FORMATTED_VALUE_ANNOTATION}`),
  "_fc_contact_value"
);
assert.equal(toODataOrderByField("name"), "name");
assert.equal(toODataOrderByField(""), "createdon");

assert.deepEqual(
  toODataSelectFields([
    "mcshhs_akaname",
    "mcshhs_firstname",
    "createdon",
    "_fc_contact_value@OData.Community.Display.V1.FormattedValue",
  ]),
  ["mcshhs_akaname", "mcshhs_firstname", "createdon", "_fc_contact_value"]
);

const query = buildODataQueryString({
  select: toODataSelectFields(baseConfig().displayColumns),
  filter,
  orderby: [{ field: "createdon", direction: "desc" }],
  top: 10,
  skip: 10,
});
assert.ok(query.startsWith("?"));
assert.ok(query.includes("$select="));
assert.ok(
  query.includes(
    encodeURIComponent("mcshhs_akaname,mcshhs_firstname,createdon,_fc_contact_value")
  )
);
assert.ok(!query.includes("FormattedValue"));
assert.ok(query.includes("$filter="));
assert.ok(!decodeURIComponent(query).includes("statecode eq 0"));
assert.ok(query.includes("$orderby="));
assert.ok(query.includes("$top=10"));
assert.ok(query.includes("$skip=10"));
assert.ok(!query.toLowerCase().includes("fetchxml"));

const listUrl = buildApiUrl("mcshhs_akanames", {
  select: toODataSelectFields(baseConfig().displayColumns),
  filter: lookupEq("fc_contact", guid),
  orderby: [{ field: "name", direction: "asc" }],
  top: 10,
});
assert.equal(listUrl.startsWith("/_api/mcshhs_akanames?"), true);
assert.ok(listUrl.includes("$filter="));
assert.ok(!decodeURIComponent(listUrl).includes("statecode eq 0"));
assert.ok(decodeURIComponent(listUrl).includes("$orderby=name asc"));

const recordUrl = buildRecordUrl("mcshhs_akanames", `{${guid}}`, {
  select: ["mcshhs_akaname", "mcshhs_firstname"],
});
assert.equal(
  recordUrl,
  `/_api/mcshhs_akanames(${guid})?$select=${encodeURIComponent("mcshhs_akaname,mcshhs_firstname")}`
);

const demo = createDemoRecords(baseConfig({ useDemoData: true }));
assert.equal(demo.length, 3);

console.log("All tests passed.");
