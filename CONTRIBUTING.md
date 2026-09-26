# Contributing

Run `npm ci`, `npm run check` and `npm run test:package` with Node.js 20+. The SQLite test requires Node.js 22.13+ and is skipped on Node 20.

For a matching bug, provide the original string, query, selected options, expected result and Unicode code points when invisible characters are involved. Use invented names and data rather than private records.

Every mapping change needs tests for idempotency, source offsets, grapheme boundaries and collision behavior. Linguistically lossy mappings should be opt-in. Never silently add support for another Arabic-script language by applying Persian or Arabic rules to it.

Persisted keys are part of the compatibility contract. Changes to normalized output require an algorithm profile change and migration notes. Runtime Unicode changes also need investigation. Preserve the zero-dependency runtime and test both ESM and CommonJS consumers.
