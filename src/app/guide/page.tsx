import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { PUBLIC_DOCS } from "@/lib/docs";

export const metadata = { title: "Documentation" };

export default function GuideIndex() {
  return (
    <div>
      <PageHeader
        eyebrow="VoxVision School OS"
        title="Documentation"
        description="Plain-English documentation of the proposed solution for school management, staff and families. Technical deployment documents are provided to the school's IT contact separately."
      />
      <ul className="grid sm:grid-cols-2 gap-3">
        {PUBLIC_DOCS.map((d) => (
          <li key={d.slug}>
            <Link href={`/guide/${d.slug}`} className="card card-pad block hover:border-brand/40 h-full">
              <span className="font-semibold text-ink">{d.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
