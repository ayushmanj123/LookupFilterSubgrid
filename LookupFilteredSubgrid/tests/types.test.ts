import assert from "node:assert/strict";
import {
  buildFilterFetchXml,
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

const fetchXml = buildFilterFetchXml(
  "akatable",
  "fc_contact",
  "11111111-1111-1111-1111-111111111111",
  "name",
  10,
  1
);
assert.ok(fetchXml.includes('entity name="akatable"'));
assert.ok(fetchXml.includes('attribute name="fc_contact"') === false);
assert.ok(fetchXml.includes('condition attribute="fc_contact"'));
assert.ok(fetchXml.includes("11111111-1111-1111-1111-111111111111"));

const demo = createDemoRecords(baseConfig({ useDemoData: true }));
assert.equal(demo.length, 3);

console.log("All tests passed.");
