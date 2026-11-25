# mcp-tool-lint

A small command-line checker for the tool definitions an MCP server returns from `tools/list`. It reads a JSON file and lists problems that make a model pick the wrong tool or send bad arguments.

Independent demo, not affiliated with BairesDev. Built as a work sample after applying for an MCP engineering role.

## Run it

Needs Node 20 or newer. No dependencies.

```
node src/cli.js examples/sample-tools.json
node src/cli.js examples/clean.json --json
npm test
```

Input can be a bare array of tools, `{"tools": [...]}`, or a full JSON-RPC response with `result.tools`. Exit code is 1 if any error is found, 0 otherwise, 2 for bad input.

## What it checks

- Name: allowed characters, generic names like `run`, duplicates.
- Description: missing or very short. The model only sees name and description when it chooses a tool.
- Input schema: missing, wrong top-level type, properties without a type or description, `required` entries that are not defined, no required fields, `additionalProperties` left open.
- Server: more than 30 tools.

The rules are my own judgment from the MCP tool format, not an official standard.

## What was tested

- 15 offline tests with `node --test`: one per rule, the three input shapes, bad input, and the CLI exit codes.
- The tests run in GitHub Actions on every push (`.github/workflows/test.yml`).
- `examples/sample-tools.json` is invented example data. It has four tools with deliberate mistakes and produces 4 errors, 5 warnings and 3 notes.

## What was not tested

- No real MCP server. I did not run it against live `tools/list` output from any server, including BairesDev's.
- It does not talk to servers. You export the tool list yourself.
- Not checked against the full JSON Schema spec. Nested objects, `$ref` resolution and `oneOf` branches are not walked.
- The 20-character and 30-tool thresholds are guesses, not measured limits.
