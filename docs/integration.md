# Integrating perso-match

Use `perso-match` for Persian/Arabic exact-key lookup and literal substring matching when yeh/kaf variants, mixed digit scripts, harakat or half-spaces cause missed results. It also maps matches back to original text for rendering.

It is not a tokenizer, stemmer, spell checker, ranked search engine, identity verifier or HTML sanitizer. Do not use search keys as unique person/account identifiers.

## Autocomplete and list filtering

```ts
import { createMatcher } from "perso-match";
const matcher = createMatcher({ locale: "fa" });
const prepared = records.map((record) => ({
  record,
  text: matcher.prepare(record.name),
}));

function search(query: string) {
  if (!matcher.key(query)) return [];
  return prepared.flatMap(({ record, text }) => {
    const ranges = text.find(query);
    return ranges.length ? [{ record, parts: text.parts(query) }] : [];
  });
}
```

Prepare when a record enters the view and rebuild when its text changes. Prepared text retains the offset map; release unused records. This avoids repeated normalization, but still scans the list. For a large collection, use a dedicated search index.

Render part text with normal framework escaping or `textContent`. Never inject it into `innerHTML`. Offsets are UTF-16 indices into the original string.

## Database lookup

Store original display text, a derived key and `matcher.profile`. Use a non-unique index on profile/key, with an exact/binary collation if the database must use precisely this comparison policy. Bind query values as SQL parameters. See `examples/database.mjs` for a tested SQLite implementation that verifies index use.

Collision groups are review candidates, not proof of duplicate identities. For large migrations, compute keys in batches, then GROUP BY profile/key over the entire persisted dataset. Separate in-memory `collisions()` calls do not detect collisions across batches.

## Upgrade 1.0.0 → 1.1.0: algorithm profile v2

The algorithm now canonically composes text after removing controls/tatweel and after folding letter variants. This fixes unstable keys such as `اـٔ` and Arabic-mode `یٔ`. Stored output can change, so the profile changes from `perso-match/v1;…` to `perso-match/v2;…`.

1. Pin the new package and runtime version in your key generator.
2. Generate v2 keys from **original text**, not old normalized keys.
3. Backfill new key/profile columns, or update both fields transactionally per row.
4. Review collision groups across the complete dataset.
5. Switch reads after the backfill, or explicitly support both profiles during the transition.
6. Rebuild dependent indexes/caches. Keep original text throughout.

API additions are backward compatible, but persisted v1 keys are not automatically migrated. `examples/integration.mjs` demonstrates prepared queries and the corrected composition behavior.
