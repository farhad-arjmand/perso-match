<div align="center">

# perso-match

**Find the same words. Highlight the original text.**

[![npm](https://img.shields.io/npm/v/perso-match.svg)](https://www.npmjs.com/package/perso-match)
[![CI](https://github.com/farhad-arjmand/perso-match/actions/workflows/ci.yml/badge.svg)](https://github.com/farhad-arjmand/perso-match/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Persian and Arabic search keys, original-text highlight ranges, and collision audits.

Zero runtime dependencies · TypeScript · ESM + CommonJS · Node.js 20+ · Modern browsers

[راهنمای فارسی](README.fa.md) · [العربية](README.ar.md)

</div>

```sh
npm install perso-match
```

## The real problem

Your database contains `علي`, the user types `علی`, and exact comparison returns nothing. A product code contains `۱۲۳`, but the search box receives `123`. An Arabic name contains vowel marks, and a plain-letter query misses it.

Replacing characters helps comparison, but it creates another problem: the normalized result can be shorter or longer than the original. Using its offsets to highlight the original text selects the wrong characters.

`perso-match` keeps a mapping back to the original grapheme spans. Store the original, search a derived key, and display the original result.

```ts
import { createMatcher } from 'perso-match';

const fa = createMatcher({ locale: 'fa' });
const original = '📦 كالا ۱۲۳ برای علي';

fa.key(original); // '📦 کالا 123 برای علی'

const ranges = fa.find(original, 'کالا 123');
original.slice(ranges[0].start, ranges[0].end); // 'كالا ۱۲۳'

const ar = createMatcher({ locale: 'ar' });
ar.parts('مرحباً يا مُحَمَّد', 'محمد');
// Plain text parts; the matched part contains the ORIGINAL 'مُحَمَّد'.
```

## What matches by default?

| Inputs | Result |
| --- | --- |
| `علي` / `علی` | Equal key in either locale |
| `كتاب` / `کتاب` | Equal key in either locale |
| `۱۲۳` / `١٢٣` / `123` | Equal key; digits stay strings |
| `مُحَمَّد` / `محمد` | Equal key |
| `کــتاب` / `کتاب` | Equal key |
| `می‌روم` / `می روم` | Equal key |
| `می‌روم` / `میروم` | Different by default; equal with `spacing: 'compact'` |
| `أمل` / `امل` | Different unless `alef: 'fold'` |
| `على` / `علي` | Different unless `foldMaqsura: true` |
| `مدرسة` / `مدرسه` | Always different |
| `مسؤول` / `مسوول` | Different; hamza is preserved |

Choose `locale: 'fa'` or `locale: 'ar'` explicitly. This selects yeh/kaf output forms; it does not detect language or claim to support every language using Arabic script.

## Highlight without rebuilding or escaping HTML yourself

The library returns strings and offsets, never HTML. With React:

```tsx
const matcher = createMatcher({ locale: 'fa' });

function SearchLabel({ text, query }: { text: string; query: string }) {
  return (
    <span dir="auto">
      {matcher.parts(text, query).map(part =>
        part.match
          ? <mark key={part.start}>{part.text}</mark>
          : <span key={part.start}>{part.text}</span>
      )}
    </span>
  );
}
```

React escapes the text. With the DOM, assign each part to `textContent`. Do not concatenate user text into `innerHTML`; search normalization is not HTML sanitization.

Offsets use JavaScript **UTF-16 code units**, end-exclusive, so `original.slice(start, end)` works. Spans include complete original grapheme clusters: marks and emoji sequences are not split. If a ligature such as `ﻻ` expands to `لا`, matching either constituent can highlight the whole original glyph. Overlapping source spans are merged.

## Database integration: keep the original and a separate key

```ts
const matcher = createMatcher({ locale: 'fa' });

const row = {
  display_name: userInput,
  search_key: matcher.key(userInput),
  search_profile: matcher.profile,
};
```

Create a **non-unique** index over `(search_profile, search_key)`, and query it with the same matcher configuration:

```sql
SELECT id, display_name
FROM contacts
WHERE search_profile = ? AND search_key = ?;
```

Bind `matcher.profile` and `matcher.key(query)` as parameters. Use an exact/binary column collation when you need equality to follow this package's policy; a database collation may otherwise introduce additional equivalences.

The runnable [SQLite example](examples/database.mjs) inserts both `علي` and `علی`, looks them up through an index, verifies both records are found and keeps their display names unchanged. It requires Node.js 22.13+ for built-in SQLite; the library itself needs Node.js 20+.

A B-tree index helps exact-key lookup; it does not make arbitrary substring searches fast. For large text collections, store these keys in your search engine and use the original text for highlights. `find()` is a literal in-memory substring matcher, not a full-text index or ranking engine.

### Audit collisions before migration

```ts
const candidates = matcher.collisions(existingRows, row => row.display_name);
// [{ key, items: originalRows, distinctTexts: originalStrings }, ...]
```

Only groups with at least two distinct original strings and a nonempty key are returned. Exact duplicate strings alone are not reported. Items are returned in input order; nothing is merged, deleted or modified.

Two names with the same search key do **not** prove they belong to the same person. Do not use these keys for authentication, identity deduplication, unique constraints or replacing legal/original text. Audit collisions and review them in your application.

Persist `matcher.profile` alongside keys. A different configuration requires a separate index or reindexing. Pin the package and runtime in your key-generation pipeline; test/rebuild indexes when either changes. Grapheme segmentation and Unicode support come from the runtime.

## Half-spaces and aggressive matching

Default `joiners: 'space'` treats ZWNJ (`U+200C`) as a word separator:

```ts
createMatcher({ locale: 'fa' }).key('می‌روم'); // 'می روم'
```

To match joined, half-spaced and spaced spellings:

```ts
const compact = createMatcher({ locale: 'fa', spacing: 'compact' });
compact.key('می‌روم') === compact.key('می روم'); // true
compact.key('می روم') === compact.key('میروم');  // true
```

This removes **all** whitespace, so it can also match across unrelated word boundaries (`کار گر` / `کارگر`). Use it for candidate retrieval, with visible original results. ZWJ (`U+200D`) is preserved, including inside emoji.

## Options

| Option | Default | Policy |
| --- | --- | --- |
| `locale` | Required | `fa` → Persian ی/ک; `ar` → Arabic ي/ك |
| `joiners` | `space` | ZWNJ becomes a space, is removed (`remove`), or retained (`keep`) |
| `spacing` | `collapse` | Trim/collapse whitespace, or remove it all (`compact`) |
| `marks` | `ignore` | Ignore U+064B–U+0652 and U+0670, or retain with `keep` |
| `alef` | `preserve` | Optional `fold` maps أ إ آ ٱ to ا |
| `foldMaqsura` | `false` | Optional ى → locale's yeh |
| `asciiCaseInsensitive` | `true` | Fold ASCII A–Z only |
| `directionMarks` | `ignore` | Ignore U+061C, U+200E/F, U+202A–E, U+2066–9, or retain with `keep` |

Tatweel is always removed from keys. Arabic presentation forms receive NFKC compatibility expansion; ordinary text receives NFC. Other-script compatibility characters are not deliberately compatibility-folded. Punctuation, ta marbuta, hamza letters and Latin accents remain distinct by default. This is not a complete Quranic annotation remover or a spelling corrector.

## API

```ts
const matcher = createMatcher({ locale: 'fa' });
matcher.profile;                 // algorithm + option profile identifier
matcher.key(text);               // comparison/index string
matcher.map(text);               // { key, ranges: Range[] }
matcher.find(text, query);        // Range[] into ORIGINAL text
matcher.parts(text, query);       // { text, match, start, end }[]
matcher.collisions(rows, getText);// Collision<T>[]
```

`map().ranges` has one entry per UTF-16 code unit of the normalized key. Multiple entries can point to the same original grapheme. `key()` avoids allocating that offset map.

`find` and `parts` accept `{ limit }`: default `100`, maximum `10000`. This caps normalized nonoverlapping matches; merged ligature spans can produce fewer returned ranges. Empty normalized queries return no matches. An empty original string produces no parts.

Inputs must be strings of at most 1,048,576 UTF-16 code units. Invalid options and types throw; overlarge inputs or invalid limits throw `RangeError`. Calls are synchronous. Collision audits retain groups in memory; batch large migrations. No filesystem or network access occurs.

CommonJS: `const { createMatcher } = require('perso-match')`.

## Examples and tests

```sh
npm ci
npm run check
npm run test:package
npm run demo
node examples/database.mjs  # Node 22.13+
```

For the interactive browser demo, run a local static server from the repository root after `npm run build`, then open `/examples/browser.html`. It performs matching locally and includes Persian/Arabic text, numeral variants, half-spaces, diacritics and opt-in alef folding.

CI covers Node.js 20/22/24 on Linux and Node.js 22 on Windows. SQLite integration is skipped on Node 20. Tests include seeded mixed-script cases for idempotency and exact reconstruction of original text. A native browser demo is manually smoke-tested; modern browsers need `Intl.Segmenter` and Unicode normalization support.

## Why this focus?

Persian normalization gaps were reported in [Meilisearch/Charabia](https://github.com/meilisearch/charabia/issues/304); Arabic vowel-mark search failures were reported in [VS Code](https://github.com/microsoft/vscode/issues/243122). These establish the problem, not endorsement of this package.

Tools such as [Virastar](https://github.com/brothersincode/virastar) address Persian typography, and [persian-normalize](https://www.npmjs.com/package/persian-normalize) provides comparison normalization. `perso-match` focuses on explicit matching policy, original-offset highlighting and collision review for derived database keys. It is independently implemented, and does not claim a new normalization algorithm or universal linguistic equivalence.

[Unicode grapheme segmentation](https://www.unicode.org/reports/tr29/) informs source-span handling.

MIT © Farhad Arjmand · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)
