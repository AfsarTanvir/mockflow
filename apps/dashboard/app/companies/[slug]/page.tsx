import CompanyOverviewClient from './client';

export default async function CompanyOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CompanyOverviewClient slug={slug} />;
}
