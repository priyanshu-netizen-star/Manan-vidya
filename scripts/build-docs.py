"""Composes docs 05 and 06 from hand-written text plus tables generated from the code.

Run:  npx tsx scripts/doc-tables.ts permissions > docs/.perm.md
      npx tsx scripts/doc-tables.ts api > docs/.api.md
      python scripts/build-docs.py
"""
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
docs = root / "docs"
perm = (docs / ".perm.md").read_text(encoding="utf-8").strip()
api = (docs / ".api.md").read_text(encoding="utf-8").strip()

for name in ("05-roles-and-permissions", "06-database-and-api"):
    template = (docs / "templates" / f"{name}.md").read_text(encoding="utf-8")
    out = template.replace("{{PERMISSIONS_TABLE}}", perm).replace("{{API_TABLE}}", api)
    (docs / f"{name}.md").write_text(out, encoding="utf-8")
    print("wrote", name)

(docs / ".perm.md").unlink()
(docs / ".api.md").unlink()
