import assert from "node:assert/strict";
import {
  buildPortalListQuery,
  createDemoRecords,
  escapeXml,
  getMissingConfigFields,
  normalizeGuid,
  ControlConfig,
} from "../LookupFilteredSubgrid/types";

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

assert.equal(escapeXml(`a&b<c>`), "a&amp;b&lt;c&gt;");

const listQuery = buildPortalListQuery(
  "fc_contact",
  "11111111-1111-1111-1111-111111111111",
  10,
  2
);
assert.ok(listQuery.startsWith("?"));
assert.ok(listQuery.includes("$filter="));
assert.ok(
  listQuery.includes(
    encodeURIComponent("_fc_contact_value eq 11111111-1111-1111-1111-111111111111")
  )
);
assert.ok(listQuery.includes("$top=10"));
assert.ok(listQuery.includes("$skip=10"));

const demo = createDemoRecords(baseConfig({ useDemoData: true }));
assert.equal(demo.length, 3);

console.log("All tests passed.");
