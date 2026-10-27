/** Prints Markdown tables generated from the code (permissions matrix, API inventory) for the docs. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { PERMISSIONS, ROLES, ROLE_LABELS, can, type Permission } from "../src/lib/rbac";

const mode = process.argv[2];
if (mode === "permissions") {
  const head = `| Permission | ${ROLES.map((r) => ROLE_LABELS[r].replace(" / ", "/")).join(" | ")} |`;
  const sep = `|---|${ROLES.map(() => ":-:").join("|")}|`;
  const rows = (Object.keys(PERMISSIONS) as Permission[]).map((p) => `| ${PERMISSIONS[p]} (\`${p}\`) | ${ROLES.map((r) => (can(r, p) ? "✓" : "")).join(" | ")} |`);
  console.log([head, sep, ...rows].join("\n"));
} else if (mode === "api") {
  const root = "src/app/api";
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : f === "route.ts" ? [p] : []; });
  const rows: string[] = [];
  for (const file of walk(root).sort()) {
    const src = readFileSync(file, "utf8");
    const url = "/mananvidyademo/api/" + path.relative(root, path.dirname(file)).split(path.sep).join("/");
    for (const m of src.matchAll(/export const (GET|POST|PATCH|DELETE) = route/g)) {
      const perm = src.match(/apiUser\(req, "([a-z_.]+)"\)/)?.[1];
      const auth = src.includes("apiUser(req") ? (perm ? `\`${perm}\`` : "signed in (checked in handler)") : "public";
      const lim = src.match(/limit\(req, [^,]+, (\d+), (\d+)\)/);
      rows.push(`| ${m[1]} | \`${url}\` | ${auth} | ${lim ? `${lim[1]} per ${Number(lim[2]) / 60} min` : "—"} |`);
    }
  }
  console.log(["| Method | Path | Access | Rate limit |", "|---|---|---|---|", ...rows].join("\n"));
}
