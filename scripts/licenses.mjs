#!/usr/bin/env node
/** Writes THIRD_PARTY_LICENSES.md listing the licence of every installed production dependency. */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const tree = JSON.parse(execSync("npm ls --omit=dev --all --json", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const seen = new Map();
const walk = (deps) => {
  for (const [name, info] of Object.entries(deps ?? {})) {
    const key = `${name}@${info.version}`;
    if (seen.has(key) || !info.version) continue;
    const pkgPath = path.join("node_modules", name, "package.json");
    let license = "UNKNOWN";
    let repo = "";
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      license = typeof pkg.license === "string" ? pkg.license : pkg.license?.type ?? (pkg.licenses?.map((l) => l.type).join(" OR ") || "UNKNOWN");
      repo = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url ?? "";
    }
    seen.set(key, { name, version: info.version, license, repo: repo.replace(/^git\+/, "").replace(/\.git$/, "") });
    walk(info.dependencies);
  }
};
walk(tree.dependencies);
const rows = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
const byLicense = rows.reduce((m, r) => m.set(r.license, (m.get(r.license) ?? 0) + 1), new Map());
const md = `# Third-party licences

VoxVision School OS is proprietary software (see \`LICENSE\`). It uses the open-source packages below in production.
Generated with \`npm run licenses\` on ${new Date().toISOString().slice(0, 10)}. Review this list when dependencies change.

Runtime services used directly by the browser (not bundled): Pyodide ${"v0.28.3"} from cdn.jsdelivr.net (Mozilla Public License 2.0), loaded only on Python lessons.

## Summary

| Licence | Packages |
|---|---:|
${[...byLicense.entries()].sort((a, b) => b[1] - a[1]).map(([l, n]) => `| ${l} | ${n} |`).join("\n")}

## Packages

| Package | Version | Licence | Source |
|---|---|---|---|
${rows.map((r) => `| ${r.name} | ${r.version} | ${r.license} | ${r.repo} |`).join("\n")}
`;
writeFileSync("THIRD_PARTY_LICENSES.md", md);
console.log(`Wrote THIRD_PARTY_LICENSES.md (${rows.length} packages).`);
const risky = rows.filter((r) => /GPL|AGPL|SSPL|UNKNOWN/i.test(r.license) && !/LGPL/i.test(r.license));
if (risky.length) console.log("Review these licences:", risky.map((r) => `${r.name} (${r.license})`).join(", "));
