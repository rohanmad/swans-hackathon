import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { documentTitle } from "@/lib/digest";
import { openShare } from "@/lib/shares";
import { ProviderPortal } from "@/ui/provider/ProviderPortal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Case update", robots: { index: false, follow: false } };

export default async function ProviderShare({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const opened = openShare(token, true);
  if (!opened) notFound();
  const view = opened.share.content;
  const documents = (view.documents ?? []).map(d => ({ ...d, title: documentTitle(d.name), href: `/api/share/${encodeURIComponent(token)}/documents/${encodeURIComponent(d.id)}` }));
  return <ProviderPortal view={view} documents={documents} />;
}
