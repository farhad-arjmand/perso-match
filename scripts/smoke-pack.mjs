import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const root = process.cwd();
const npm = (args, options = {}) =>
  execFileSync(process.execPath, [process.env.npm_execpath, ...args], options);
const packed = JSON.parse(npm(["pack", "--json"], { encoding: "utf8" }))[0];
for (const file of packed.files)
  if (
    ![
      "README.md",
      "README.fa.md",
      "README.ar.md",
      "LICENSE",
      "package.json",
    ].includes(file.path) &&
    !file.path.startsWith("dist/") &&
    !file.path.startsWith("docs/") &&
    !file.path.startsWith("examples/") &&
    !["llms.txt", "CHANGELOG.md", "CONTRIBUTING.md", "SECURITY.md"].includes(
      file.path,
    )
  )
    throw new Error(`Unexpected packed file: ${file.path}`);
const dir = mkdtempSync(join(tmpdir(), "perso-match-consumer-"));
try {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  npm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      resolve(packed.filename),
    ],
    { cwd: dir, stdio: "pipe" },
  );
  const expression =
    "const m=createMatcher({locale:'fa'});if(m.key('علي ۱۲۳')!=='علی 123')throw new Error('Key failed');const t='😀 مُحَمَّد';const r=m.find(t,'محمد')[0];if(t.slice(r.start,r.end)!=='مُحَمَّد')throw new Error('Offsets failed');";
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import {createMatcher} from 'perso-match';" + expression,
    ],
    { cwd: dir, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    ["-e", "const {createMatcher}=require('perso-match');" + expression],
    { cwd: dir, stdio: "inherit" },
  );
  for (const ext of ["mts", "cts"]) {
    writeFileSync(
      join(dir, `consumer.${ext}`),
      "import {createMatcher,type Range} from 'perso-match';const ranges:Range[]=createMatcher({locale:'fa'}).find('علي','علی');void ranges;",
    );
    execFileSync(
      process.execPath,
      [
        join(root, "node_modules/typescript/bin/tsc"),
        "--noEmit",
        "--strict",
        "--module",
        "NodeNext",
        "--moduleResolution",
        "NodeNext",
        "--target",
        "ES2022",
        `consumer.${ext}`,
      ],
      { cwd: dir, stdio: "inherit" },
    );
  }
  console.log(
    `Packed artifact verified: ${packed.filename}; ${packed.size} bytes; ESM, CommonJS, original offsets and declarations passed.`,
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
