# Changelog

## 1.1.0 — 2026-09-27

- Fix canonical composition across removed characters and after letter folding.
- Advance persisted key profile to v2; recompute v1 keys from original text when upgrading.
- Add prepare(text) for repeated queries with reusable normalization/offset mapping.
- Include migration guidance, executable recipes and tool-readable reference.

## 1.0.0 — 2026-09-27

- Explicit Persian and Arabic search profiles with yeh/kaf and numeral folding.
- Configurable half-space, whitespace, harakat, alef and maqsura behavior.
- Original UTF-16 highlight ranges using grapheme-aware source mappings.
- Plain-text rendering parts with source reconstruction guarantees in tests.
- Collision audits for reviewing derived database keys before migration.
- Zero runtime dependencies, ESM/CommonJS and TypeScript declarations.
- English, Persian and Arabic guides; browser demo and indexed SQLite example.
