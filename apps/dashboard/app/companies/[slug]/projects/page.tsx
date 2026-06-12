import CompanyProjectsClient from './client';

export default async function CompanyProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CompanyProjectsClient slug={slug} />;
}
