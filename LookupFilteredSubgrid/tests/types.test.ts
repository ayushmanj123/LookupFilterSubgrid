import assert from "node:assert/strict";
import {
  createDemoRecords,
  getMissingConfigFields,
  normalizeGuid,
  parseBooleanInput,
  parseDisplayColumns,
  ControlConfig,
} from "../LookupFilteredSubgrid/types";

function baseConfig(overrides: Partial<ControlConfig> = {}): ControlConfig {
  return {
    lookupFieldLogicalName: "fc_applicant2",
    targetEntityLogicalName: "fc_akaname",
    filterAttributeLogicalName: "fc_contact",
    filterLookupEntitySetName: "contacts",
    displayColumns: ["fc_name", "createdon"],
    primaryNameAttribute: "fc_name",
    pageSize: 10,
    enableCreate: true,
    enableEdit: true,
    enableDelete: true,
    orderBy: "",
    useDemoData: false,
    ...overrides,
  };
}

// parseDisplayColumns
assert.deepEqual(parseDisplayColumns("fc_name, createdon"), ["fc_name", "createdon"]);
assert.deepEqual(parseDisplayColumns(""), []);
assert.deepEqual(parseDisplayColumns(null), []);

// normalizeGuid
assert.equal(
  normalizeGuid("{AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE}"),
  "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
);
assert.equal(normalizeGuid("not-a-guid"), null);

// parseBooleanInput
assert.equal(parseBooleanInput(true, false), true);
assert.equal(parseBooleanInput("true", false), true);
assert.equal(parseBooleanInput(null, true), true);

// getMissingConfigFields
assert.deepEqual(getMissingConfigFields(baseConfig()), []);
assert.ok(
  getMissingConfigFields(baseConfig({ lookupFieldLogicalName: "" })).includes(
    "lookupFieldLogicalName"
  )
);

// createDemoRecords
const demo = createDemoRecords(baseConfig({ useDemoData: true }));
assert.equal(demo.length, 3);
assert.ok(String(demo[0].fc_name).includes("Sample"));

console.log("All tests passed.");
