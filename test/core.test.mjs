import { test } from "node:test";
import assert from "node:assert/strict";
import { createMatcher } from "../dist/esm/index.js";
const fa = createMatcher({ locale: "fa" }),
  ar = createMatcher({ locale: "ar" });
test("Persian yeh/kaf variants and all three digit scripts", () => {
  for (const text of ["كالا ١٢٣", "کالا ۱۲۳", "کالا 123"])
    assert.equal(fa.key(text), "کالا 123");
  assert.equal(fa.key("علي"), "علی");
});
test("Arabic output uses Arabic yeh/kaf", () => {
  assert.equal(ar.key("علی و کتاب ۴۲"), "علي و كتاب 42");
});
test("all digits normalize without numeric coercion or precision loss", () => {
  assert.equal(fa.key("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹"), "01234567890123456789");
  assert.equal(fa.key("۰۰۹۰۰۷۱۹۹۲۵۴۷۴۰۹۹۳"), "009007199254740993");
});
test("Arabic harakat and tatweel are ignored by default", () => {
  assert.equal(ar.key("مُحَمَّد"), "محمد");
  assert.equal(fa.key("کــتاب"), "کتاب");
  assert.equal(ar.key("هٰذا"), "هذا");
});
test("marks can be preserved", () => {
  assert.equal(
    createMatcher({ locale: "ar", marks: "keep" }).key("مُحَمَّد"),
    "مُحَمَّد",
  );
});
test("hamza, ta marbuta, alef maqsura and alef madda are distinct by default", () => {
  for (const [a, b] of [
    ["أمل", "امل"],
    ["آب", "اب"],
    ["مدرسة", "مدرسه"],
    ["على", "علي"],
    ["مسؤول", "مسوول"],
    ["سائل", "سايل"],
  ])
    assert.notEqual(ar.key(a), ar.key(b));
});
test("explicit alef and maqsura folding", () => {
  const loose = createMatcher({
    locale: "ar",
    alef: "fold",
    foldMaqsura: true,
  });
  for (const text of ["أإآٱ"]) assert.equal(loose.key(text), "اااا");
  assert.equal(loose.key("على"), "علي");
  assert.equal(
    createMatcher({ locale: "fa", foldMaqsura: true }).key("على"),
    "علی",
  );
});
test("canonical decomposed hamza composes before matching", () => {
  assert.equal(ar.key("ا\u0654مل"), ar.key("أمل"));
  assert.notEqual(ar.key("ا\u0654مل"), ar.key("امل"));
});
test("ZWNJ defaults to a word separator", () => {
  assert.equal(fa.key("می‌روم"), "می روم");
  assert.notEqual(fa.key("می‌روم"), fa.key("میروم"));
});
test("compact mode matches space, half-space and no-space variants", () => {
  const m = createMatcher({ locale: "fa", spacing: "compact" });
  for (const text of ["می‌روم", "می روم", "میروم"])
    assert.equal(m.key(text), "میروم");
});
test("joiner remove and keep modes", () => {
  assert.equal(
    createMatcher({ locale: "fa", joiners: "remove" }).key("می‌روم"),
    "میروم",
  );
  assert.equal(
    createMatcher({ locale: "fa", joiners: "keep" }).key("می‌روم"),
    "می‌روم",
  );
});
test("whitespace collapses and trims; punctuation stays", () => {
  assert.equal(fa.key(" \t سلام\n دنیا\u00a0! "), "سلام دنیا !");
  assert.notEqual(fa.key("الف-ب"), fa.key("الف ب"));
});
test("direction controls ignored in key but originals preserved", () => {
  const text = "\u200fعلي\u202c";
  assert.equal(fa.key(text), "علی");
  assert.equal(
    fa
      .parts(text, "علی")
      .map((p) => p.text)
      .join(""),
    text,
  );
  assert.equal(
    createMatcher({ locale: "fa", directionMarks: "keep" }).key(text),
    "\u200fعلی\u202c",
  );
});
test("ZWJ emoji and supplementary code points survive", () => {
  const text = "👩‍💻 👨‍👩‍👧‍👦 😀";
  assert.equal(fa.key(text), text);
  for (const emoji of ["👩‍💻", "👨‍👩‍👧‍👦", "😀"]) {
    const [r] = fa.find(text, emoji);
    assert.equal(text.slice(r.start, r.end), emoji);
  }
});
test("Arabic presentation forms expand while unrelated compatibility characters stay", () => {
  assert.equal(ar.key("ﻻ"), "لا");
  assert.equal(fa.key("① Ａ"), "① Ａ");
  assert.equal(fa.key("ﻛﺘﺎﺏ"), "کتاب");
});
test("NFC applies to other scripts without accent removal", () => {
  assert.equal(fa.key("cafe\u0301"), "café");
  assert.notEqual(fa.key("café"), fa.key("cafe"));
});
test("ASCII case option is explicit", () => {
  assert.equal(fa.key("SKU-AbC"), "sku-abc");
  assert.equal(
    createMatcher({ locale: "fa", asciiCaseInsensitive: false }).key("SKU-AbC"),
    "SKU-AbC",
  );
});
test("mapped range array corresponds to every normalized UTF-16 unit", () => {
  const text = "😀 مُحَمَّد ﻻ ۴۲";
  const m = ar.map(text);
  assert.equal(m.key.length, m.ranges.length);
  for (const r of m.ranges) {
    assert.ok(r.start >= 0 && r.end <= text.length && r.start < r.end);
    assert.ok(text.slice(r.start, r.end).length > 0);
  }
});
test("highlights original diacritics and digits after an emoji", () => {
  const text = "😀 مُحَمَّد شماره ۱۲۳";
  const ranges = fa.find(text, "محمد");
  assert.equal(text.slice(ranges[0].start, ranges[0].end), "مُحَمَّد");
  const [r] = fa.find(text, "123");
  assert.equal(text.slice(r.start, r.end), "۱۲۳");
});
test("partial expanded ligature matches cover the entire source glyph", () => {
  assert.deepEqual(ar.find("ﻻ", "ل"), [{ start: 0, end: 1 }]);
  assert.deepEqual(ar.find("ﻻ", "لا"), [{ start: 0, end: 1 }]);
});
test("multiple normalized matches in one glyph merge overlapping spans", () => {
  const parts = ar.parts("ﷲ", "ل");
  assert.equal(parts.filter((p) => p.match).length, 1);
  assert.equal(parts.map((p) => p.text).join(""), "ﷲ");
});
test("compact match range covers removed source whitespace", () => {
  const m = createMatcher({ locale: "fa", spacing: "compact" });
  const text = "از می ‌ روم تا خانه";
  const [r] = m.find(text, "میروم");
  assert.equal(text.slice(r.start, r.end), "می ‌ روم");
});
test("all nonoverlapping matches returned in source order", () => {
  assert.deepEqual(
    fa.find("علي، علی، علي", "علی").map((r) => r.start),
    [0, 5, 10],
  );
  assert.equal(fa.find("aaaa", "aa").length, 2);
});
test("limits cap normalized matches and reject invalid bounds", () => {
  assert.equal(fa.find("aaaa", "a", { limit: 2 }).length, 2);
  for (const limit of [0, -1, NaN, 1.2, 10001])
    assert.throws(() => fa.find("x", "x", { limit }), RangeError);
});
test("empty normalized queries never match everything", () => {
  for (const q of ["", " ", "َ", "ـ", "\u200f"])
    assert.deepEqual(fa.find("سلام", q), []);
  assert.deepEqual(fa.parts("", "سلام"), []);
});
test("parts contain plain text, not injected HTML", () => {
  const text = "<img src=x onerror=alert(1)> كالا";
  const parts = fa.parts(text, "کالا");
  assert.equal(parts.map((p) => p.text).join(""), text);
  assert.equal(parts.filter((p) => p.match)[0].text, "كالا");
  assert.equal(parts[0].match, false);
});
test("no match returns one unchanged part", () => {
  assert.deepEqual(fa.parts("سلام", "خداحافظ"), [
    { start: 0, end: 4, text: "سلام", match: false },
  ]);
});
test("collision audit reports distinct texts but not exact duplicate groups or empty keys", () => {
  const records = [
    { id: 1, name: "علي" },
    { id: 2, name: "علی" },
    { id: 3, name: "علي" },
    { id: 4, name: "رضا" },
    { id: 5, name: "رضا" },
    { id: 6, name: "َ" },
  ];
  const snapshot = JSON.stringify(records);
  const c = fa.collisions(records, (r) => r.name);
  assert.equal(c.length, 1);
  assert.deepEqual(
    c[0].items.map((r) => r.id),
    [1, 2, 3],
  );
  assert.deepEqual(c[0].distinctTexts, ["علي", "علی"]);
  assert.equal(JSON.stringify(records), snapshot);
});
test("aggressive whitespace collisions are visible before database migration", () => {
  const m = createMatcher({ locale: "fa", spacing: "compact" });
  assert.equal(m.collisions(["کار گر", "کارگر"], (x) => x).length, 1);
});
test("profile identifies all options and is immutable", () => {
  assert.equal(
    fa.profile,
    createMatcher({ locale: "fa", marks: "ignore" }).profile,
  );
  for (const option of [
    { locale: "ar" },
    { spacing: "compact" },
    { marks: "keep" },
    { alef: "fold" },
    { foldMaqsura: true },
    { asciiCaseInsensitive: false },
    { directionMarks: "keep" },
    { joiners: "remove" },
  ])
    assert.notEqual(
      fa.profile,
      createMatcher({ locale: "fa", ...option }).profile,
    );
  assert.ok(Object.isFrozen(fa));
});
test("bad runtime options fail instead of silently selecting behavior", () => {
  for (const opts of [
    undefined,
    {},
    { locale: "en" },
    { locale: "fa", joiners: "bad" },
    { locale: "fa", marks: "bad" },
    { locale: "fa", spacing: "bad" },
    { locale: "fa", alef: "bad" },
    { locale: "fa", directionMarks: "bad" },
    { locale: "fa", foldMaqsura: 1 },
    { locale: "fa", asciiCaseInsensitive: 1 },
  ])
    assert.throws(() => createMatcher(opts), TypeError);
});
test("input type and size guard", () => {
  assert.throws(() => fa.key(123), TypeError);
  assert.throws(() => fa.key("a".repeat(1048577)), RangeError);
});
test("idempotency and highlight reconstruction across a seeded mixed-script corpus", () => {
  const alphabet = [
    "ع",
    "ي",
    "ی",
    "ك",
    "ک",
    "أ",
    "ا\u0654",
    "َ",
    "ّ",
    "ـ",
    "ﻻ",
    "ﷲ",
    "۱",
    "١",
    "1",
    " ",
    "\u200c",
    "\u200f",
    "😀",
    "👩‍💻",
    "A",
    "é",
    "\n",
  ];
  let seed = 321;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (const opts of [
    { locale: "fa" },
    { locale: "ar" },
    { locale: "fa", spacing: "compact" },
    { locale: "ar", marks: "keep", alef: "fold" },
  ]) {
    const m = createMatcher(opts);
    for (let i = 0; i < 150; i++) {
      const text = Array.from(
        { length: 15 },
        () => alphabet[random() % alphabet.length],
      ).join("");
      assert.equal(m.key(m.key(text)), m.key(text));
      const query = alphabet[random() % alphabet.length];
      const parts = m.parts(text, query);
      assert.equal(parts.map((p) => p.text).join(""), text);
      for (const part of parts)
        assert.equal(text.slice(part.start, part.end), part.text);
    }
  }
});
test("Arabic block and presentation-form keys remain idempotent", () => {
  for (const options of [
    { locale: "fa" },
    { locale: "ar" },
    { locale: "fa", spacing: "compact" },
    { locale: "ar", marks: "keep" },
  ]) {
    const m = createMatcher(options);
    for (const [start, end] of [
      [0x600, 0x6ff],
      [0xfb50, 0xfdff],
      [0xfe70, 0xfefc],
    ])
      for (let cp = start; cp <= end; cp++) {
        const text = "ب" + String.fromCodePoint(cp) + "ا";
        const key = m.key(text);
        assert.equal(m.key(key), key, `U+${cp.toString(16)}`);
      }
  }
});
test("removed controls cannot leave decomposed unstable search keys", () => {
  for (const options of [
    { locale: "fa" },
    { locale: "ar" },
    { locale: "ar", alef: "fold" },
  ]) {
    const m = createMatcher(options);
    for (const separator of ["ـ", "\u200f", "\u202c"]) {
      const original = "ا" + separator + "\u0654";
      assert.equal(m.key(original), m.key("أ"));
      assert.equal(m.key(m.key(original)), m.key(original));
      const [range] = m.find(original, "أ");
      assert.equal(original.slice(range.start, range.end), original);
    }
  }
});
test("letter folding composes yeh plus hamza with correct original ranges", () => {
  const m = createMatcher({ locale: "ar" });
  const original = "ی\u0654";
  assert.equal(m.key(original), "ئ");
  assert.equal(m.key(m.key(original)), "ئ");
  assert.deepEqual(m.find(original, "ئ"), [{ start: 0, end: 2 }]);
});
test("prepared text matches ordinary API without exposing mutable internal ranges", () => {
  const original = "😀 مُحَمَّد و علي ۱۲۳";
  const prepared = fa.prepare(original);
  assert.ok(Object.isFrozen(prepared));
  assert.equal(prepared.key, fa.key(original));
  for (const query of ["محمد", "علی", "123", "none"]) {
    assert.deepEqual(prepared.find(query), fa.find(original, query));
    assert.deepEqual(prepared.parts(query), fa.parts(original, query));
  }
  const r = prepared.find("علی");
  r[0].start = 999;
  assert.deepEqual(prepared.find("علی"), fa.find(original, "علی"));
});
