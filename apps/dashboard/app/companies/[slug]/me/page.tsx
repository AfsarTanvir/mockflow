import CompanyProfileClient from './client';

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CompanyProfileClient slug={slug} />;
}
