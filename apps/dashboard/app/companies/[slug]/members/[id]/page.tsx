import MemberProfileClient from './client';

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return <MemberProfileClient slug={slug} profileId={id} />;
}
