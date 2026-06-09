import CompanyMembersClient from './client';

export default async function CompanyMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CompanyMembersClient slug={slug} />;
}
