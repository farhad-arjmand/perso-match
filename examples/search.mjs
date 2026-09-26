import { createMatcher } from "../dist/esm/index.js";
const fa = createMatcher({ locale: "fa" });
const original = "📦 كالا شماره ۱۲۳ برای علي";
console.log("Original:", original);
console.log("Search key:", fa.key(original));
console.log("Query: کالا شماره 123");
console.log(
  "Original match:",
  fa
    .find(original, "کالا شماره 123")
    .map((r) => original.slice(r.start, r.end)),
);
const ar = createMatcher({ locale: "ar" });
console.log(
  "Arabic match:",
  ar
    .parts("مرحباً يا مُحَمَّد", "محمد")
    .filter((p) => p.match)
    .map((p) => p.text),
);
const rows = [
  { id: 1, name: "علي" },
  { id: 2, name: "علی" },
  { id: 3, name: "رضا" },
];
console.log(
  "Review before merging:",
  fa.collisions(rows, (r) => r.name),
);
