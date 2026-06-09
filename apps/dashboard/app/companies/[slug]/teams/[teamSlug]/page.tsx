import { redirect } from 'next/navigation';

/** A team's landing → its members list. */
export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string; teamSlug: string }>;
}) {
  const { slug, teamSlug } = await params;
  redirect(`/companies/${slug}/teams/${teamSlug}/members`);
}
