#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { lintTools, summarize } from "./lint.js";
const args = process.argv.slice(2);
const json = args.includes("--json");
const file = args.find((a) => !a.startsWith("--"));
if (!file) { console.error("usage: mcp-tool-lint <tools.json> [--json]"); process.exit(2); }
let result;
try { result = lintTools(JSON.parse(readFileSync(file, "utf8"))); }
catch (e) { console.error("error: " + e.message); process.exit(2); }
console.log(json ? JSON.stringify(result, null, 2) : summarize(result));
process.exit(result.findings.some((f) => f.severity === "error") ? 1 : 0);
