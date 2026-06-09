import CompanySettingsClient from './client';

export default async function CompanySettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CompanySettingsClient slug={slug} />;
}
