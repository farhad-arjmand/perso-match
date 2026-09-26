import assert from "node:assert/strict";
import { createMatcher } from "../dist/esm/index.js";
const matcher = createMatcher({ locale: "fa" });
const labels = ["📦 كالا ۱۲۳", "مُحَمَّد", "علي"].map((text) =>
  matcher.prepare(text),
);
for (const [query, expected] of [
  ["کالا 123", 0],
  ["محمد", 1],
  ["علی", 2],
]) {
  const found = labels.filter((label) => label.find(query).length);
  assert.equal(found.length, 1);
  assert.equal(found[0].text, labels[expected].text);
  assert.equal(
    found[0]
      .parts(query)
      .map((part) => part.text)
      .join(""),
    found[0].text,
  );
}
assert.equal(matcher.key("اـٔ"), matcher.key("أ"));
console.log(
  "Prepared queries preserve original highlights; v2 composition is stable.",
);
