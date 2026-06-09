import TeamMembersClient from './client';

export default async function TeamMembersPage({
  params,
}: {
  params: Promise<{ slug: string; teamSlug: string }>;
}) {
  const { slug, teamSlug } = await params;
  return <TeamMembersClient slug={slug} teamSlug={teamSlug} />;
}
