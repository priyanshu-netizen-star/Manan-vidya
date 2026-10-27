import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Documents shown to the school inside the application. Internal documents (architecture details,
 * database/API reference, deployment, presenter script, IP checklist) stay in the private repository
 * and are deliberately not served.
 */
export const PUBLIC_DOCS = [
  { slug: "executive-summary", file: "01-executive-summary.md", title: "Executive summary" },
  { slug: "feature-catalogue", file: "02-feature-catalogue.md", title: "Feature catalogue" },
  { slug: "functional-specifications", file: "03-functional-specifications.md", title: "Module functional specifications" },
  { slug: "roles-and-permissions", file: "05-roles-and-permissions.md", title: "User roles and permissions" },
  { slug: "ai-approach", file: "07-ai-and-content-management.md", title: "AI and content management approach" },
  { slug: "erp-integration", file: "08-erp-integration-requirements.md", title: "School ERP integration requirements" },
  { slug: "privacy-security-child-safety", file: "09-privacy-security-child-safety.md", title: "Privacy, security and child safety" },
  { slug: "testing-and-acceptance", file: "10-testing-and-acceptance.md", title: "Testing and acceptance criteria" },
  { slug: "user-manuals", file: "11-user-manuals.md", title: "User manuals" },
  { slug: "implementation-schedule", file: "12-implementation-schedule.md", title: "Twelve-week implementation schedule" },
  { slug: "training-and-handover", file: "13-training-and-handover.md", title: "Staff training and handover plan" },
  { slug: "commercial-scope", file: "14-commercial-scope-and-exclusions.md", title: "Commercial scope and exclusions" },
  { slug: "outstanding-requirements", file: "18-outstanding-requirements.md", title: "Outstanding requirements and dependencies" },
] as const;

export async function readDoc(slug: string): Promise<{ title: string; body: string } | null> {
  const doc = PUBLIC_DOCS.find((d) => d.slug === slug);
  if (!doc) return null;
  try {
    const body = await readFile(path.join(process.cwd(), "docs", doc.file), "utf8");
    return { title: doc.title, body };
  } catch {
    return null;
  }
}
