import CompanyTeamsClient from './client';

export default async function CompanyTeamsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CompanyTeamsClient slug={slug} />;
}
