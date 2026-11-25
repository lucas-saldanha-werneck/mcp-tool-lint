// Lints the "tools" array of an MCP tools/list response. Offline, no dependencies.
const NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const VAGUE = new Set(["run", "do", "execute", "tool", "action", "call", "process", "handle", "query"]);

export function lintTool(tool) {
  const out = [];
  const add = (severity, rule, message) => out.push({ tool: tool?.name ?? "(unnamed)", severity, rule, message });
  if (!tool || typeof tool !== "object") { add("error", "shape", "tool is not an object"); return out; }
  if (typeof tool.name !== "string" || !tool.name) { add("error", "name-missing", "tool has no name"); return out; }
  if (!NAME_RE.test(tool.name)) add("error", "name-chars", "name should use only letters, digits, _ or - (max 64 chars)");
  if (VAGUE.has(tool.name.toLowerCase())) add("warn", "name-vague", "name is too generic for a model to pick it reliably");
  const desc = typeof tool.description === "string" ? tool.description.trim() : "";
  if (!desc) add("error", "desc-missing", "no description: the model only sees name and description when choosing a tool");
  else if (desc.length < 20) add("warn", "desc-short", `description is only ${desc.length} characters`);
  const schema = tool.inputSchema;
  if (!schema || typeof schema !== "object") { add("error", "schema-missing", "no inputSchema"); return out; }
  if (schema.type !== "object") add("error", "schema-type", 'inputSchema.type must be "object"');
  const props = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
  for (const [key, p] of Object.entries(props)) {
    if (!p || typeof p !== "object") continue;
    if (!p.type && !p.enum && !p.oneOf && !p.anyOf && !p.$ref) add("warn", "prop-untyped", `property "${key}" has no type`);
    if (!p.description) add("warn", "prop-desc-missing", `property "${key}" has no description`);
  }
  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const r of required) if (!(r in props)) add("error", "required-unknown", `required property "${r}" is not defined in properties`);
  if (Object.keys(props).length > 0 && required.length === 0) add("info", "no-required", "no required properties: every argument is optional");
  if (Object.keys(props).length > 0 && schema.additionalProperties === undefined) add("info", "additional-open", "additionalProperties is not set: extra arguments are allowed by default");
  return out;
}

export function lintTools(input) {
  const tools = Array.isArray(input) ? input : input?.tools ?? input?.result?.tools;
  if (!Array.isArray(tools)) throw new Error('expected a tools array, {"tools": [...]} or a JSON-RPC result');
  const findings = tools.flatMap(lintTool);
  const seen = new Map();
  for (const t of tools) if (t?.name) seen.set(t.name, (seen.get(t.name) ?? 0) + 1);
  for (const [n, c] of seen) if (c > 1) findings.push({ tool: n, severity: "error", rule: "name-duplicate", message: `name used ${c} times` });
  if (tools.length > 30) findings.push({ tool: "(server)", severity: "warn", rule: "too-many-tools", message: `${tools.length} tools: large lists cost context and confuse tool choice` });
  return { toolCount: tools.length, findings };
}

export function summarize({ toolCount, findings }) {
  const n = (s) => findings.filter((f) => f.severity === s).length;
  const lines = [`# MCP tool lint`, ``, `${toolCount} tools, ${n("error")} errors, ${n("warn")} warnings, ${n("info")} notes`, ``];
  for (const f of findings) lines.push(`- [${f.severity}] ${f.tool}: ${f.rule}: ${f.message}`);
  return lines.join("\n") + "\n";
}
