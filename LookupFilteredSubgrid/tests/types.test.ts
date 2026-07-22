import assert from "node:assert/strict";
import {
  createDemoRecords,
  getMissingConfigFields,
  normalizeGuid,
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
} from "../LookupFilteredSubgrid/services/odata/ODataQuery";

function baseConfig(overrides: Partial<ControlConfig> = {}): ControlConfig {
  return {
    lookupFieldLogicalName: "fc_applican",
    targetEntityLogicalName: "akatable",
    targetEntitySetName: "akatables",
    filterAttributeLogicalName: "fc_contact",
    filterLookupEntitySetName: "contacts",
    displayColumns: ["name", "createdon"],
    primaryNameAttribute: "name",
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

const query = buildODataQueryString({
  select: ["name", "createdon"],
  filter,
  orderby: [{ field: "createdon", direction: "desc" }],
  top: 10,
  skip: 10,
});
assert.ok(query.startsWith("?"));
assert.ok(query.includes("$select="));
assert.ok(query.includes("$filter="));
assert.ok(query.includes("$orderby="));
assert.ok(query.includes("$top=10"));
assert.ok(query.includes("$skip=10"));
assert.ok(!query.toLowerCase().includes("fetchxml"));

const listUrl = buildApiUrl("mcshhs_akanames", {
  select: ["name"],
  filter: lookupEq("fc_contact", guid),
  top: 10,
});
assert.equal(
  listUrl.startsWith("/_api/mcshhs_akanames?"),
  true
);
assert.ok(listUrl.includes("$filter="));

const recordUrl = buildRecordUrl("mcshhs_akanames", `{${guid}}`, {
  select: ["name", "createdon"],
});
assert.equal(
  recordUrl,
  `/_api/mcshhs_akanames(${guid})?$select=${encodeURIComponent("name,createdon")}`
);

const demo = createDemoRecords(baseConfig({ useDemoData: true }));
assert.equal(demo.length, 3);

console.log("All tests passed.");
