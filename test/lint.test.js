import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { lintTool, lintTools } from "../src/lint.js";

const good = { name: "search_orders", description: "Search orders by customer email.", inputSchema: { type: "object", properties: { email: { type: "string", description: "email" } }, required: ["email"], additionalProperties: false } };
const rules = (t) => lintTool(t).map((f) => f.rule);

test("clean tool has no findings", () => assert.deepEqual(lintTool(good), []));
test("missing description is an error", () => assert.ok(rules({ ...good, description: "" }).includes("desc-missing")));
test("short description warns", () => assert.ok(rules({ ...good, description: "Does stuff" }).includes("desc-short")));
test("bad name characters", () => assert.ok(rules({ ...good, name: "get invoice" }).includes("name-chars")));
test("vague name", () => assert.ok(rules({ ...good, name: "run" }).includes("name-vague")));
test("missing schema", () => assert.ok(rules({ name: "x_tool", description: "A long enough description." }).includes("schema-missing")));
test("schema type must be object", () => assert.ok(rules({ ...good, inputSchema: { type: "array" } }).includes("schema-type")));
test("required property not defined", () => assert.ok(rules({ ...good, inputSchema: { type: "object", properties: {}, required: ["q"] } }).includes("required-unknown")));
test("untyped and undocumented property", () => {
  const r = rules({ ...good, inputSchema: { type: "object", properties: { q: {} }, required: ["q"] } });
  assert.ok(r.includes("prop-untyped") && r.includes("prop-desc-missing"));
});
test("duplicate names", () => assert.ok(lintTools([good, good]).findings.some((f) => f.rule === "name-duplicate")));
test("accepts JSON-RPC result shape", () => assert.equal(lintTools({ result: { tools: [good] } }).toolCount, 1));
test("rejects bad input", () => assert.throws(() => lintTools({ nope: 1 })));
test("too many tools", () => assert.ok(lintTools(Array.from({ length: 31 }, (_, i) => ({ ...good, name: "t" + i }))).findings.some((f) => f.rule === "too-many-tools")));
test("CLI: sample file exits 1 and reports", () => {
  const r = spawnSync("node", ["src/cli.js", "examples/sample-tools.json"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /4 tools/);
});
test("CLI: clean file exits 0", () => {
  const out = execFileSync("node", ["src/cli.js", "examples/clean.json"], { encoding: "utf8" });
  assert.match(out, /0 errors/);
});
