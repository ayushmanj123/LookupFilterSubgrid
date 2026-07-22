import assert from "node:assert/strict";
import {
  buildModalFormUrl,
  createDemoRecords,
  EMPTY_GUID,
  getMissingConfigFields,
  normalizeGuid,
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
    filterLookupEntitySetName: "contacts",
    displayColumns: [
      "mcshhs_akaname",
      "mcshhs_firstname",
      "createdon",
      "_fc_contact_value@OData.Community.Display.V1.FormattedValue",
    ],
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
const filter = and(lookupEq("fc_contact", guid), eq("statecode", 0));
assert.equal(
  toFilterString(filter),
  "(_fc_contact_value eq 11111111-1111-1111-1111-111111111111) and (statecode eq 0)"
);
assert.ok(toFilterString(or(eq("statuscode", 1), eq("statuscode", 2))).includes(" or "));
assert.equal(toFilterString(not(eq("statecode", 1))), "not (statecode eq 1)");

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
assert.ok(query.includes("$orderby="));
assert.ok(query.includes("$top=10"));
assert.ok(query.includes("$skip=10"));
assert.ok(!query.toLowerCase().includes("fetchxml"));

const listUrl = buildApiUrl("mcshhs_akanames", {
  select: toODataSelectFields(baseConfig().displayColumns),
  filter: lookupEq("fc_contact", guid),
  top: 10,
});
assert.equal(listUrl.startsWith("/_api/mcshhs_akanames?"), true);
assert.ok(listUrl.includes("$filter="));

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
