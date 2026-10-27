import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";
import { PUBLIC_DOCS, readDoc } from "@/lib/docs";

export function generateStaticParams() {
  return PUBLIC_DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = PUBLIC_DOCS.find((d) => d.slug === slug);
  return { title: doc?.title ?? "Documentation" };
}

export default async function GuideDoc({ params }: { params: Promise<{ slug: string }> }) {
  const doc = await readDoc((await params).slug);
  if (!doc) notFound();
  return (
    <article className="card card-pad sm:p-10">
      <div className="flex justify-end no-print"><PrintButton label="Print / save as PDF" /></div>
      <Markdown source={doc.body} />
    </article>
  );
}
