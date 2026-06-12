import TeamProjectsClient from './client';

export default async function TeamProjectsPage({
  params,
}: {
  params: Promise<{ slug: string; teamSlug: string }>;
}) {
  const { slug, teamSlug } = await params;
  return <TeamProjectsClient slug={slug} teamSlug={teamSlug} />;
}
