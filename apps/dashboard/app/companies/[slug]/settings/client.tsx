'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { useMyCompanies, useUpdateCompany, useUploadCompanyAvatar } from '@/query/companies';
import { AvatarUploader } from '@/components/dashboard/avatar-uploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

/**
 * Company settings — the COMPANY's name + logo/avatar (distinct from your
 * personal profile avatar at /companies/[slug]/me). Owner/admin only.
 */
export default function CompanySettingsClient({ slug }: { slug: string }) {
  const { data: memberships = [], isLoading } = useMyCompanies();
  const membership = memberships.find((m) => m.company.slug === slug);
  const companyId = membership?.company.id ?? '';
  const role = membership?.profile.role;
  const isAdmin = role === 'owner' || role === 'admin';

  const { mutate: updateCompany, isPending: saving } = useUpdateCompany(companyId, slug);
  const { mutate: uploadAvatar, isPending: uploadingAvatar } = useUploadCompanyAvatar(
    companyId,
    slug
  );

  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const hydrated = useRef(false);
  useEffect(() => {
    if (!membership || hydrated.current) return;
    hydrated.current = true;
    setName(membership.company.name);
  }, [membership]);

  if (!isLoading && !membership) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12 text-center sm:px-6">
        <p className="text-foreground text-sm font-medium">
          You&apos;re not a member of this company.
        </p>
        <Link href="/dashboard" className="text-primary mt-2 inline-block text-sm hover:underline">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  if (membership && !isAdmin) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12 text-center sm:px-6">
        <p className="text-foreground text-sm font-medium">
          Only owners and admins can manage company settings.
        </p>
        <Link
          href={`/companies/${slug}/me`}
          className="text-primary mt-2 inline-block text-sm hover:underline"
        >
          Edit your own profile instead →
        </Link>
      </main>
    );
  }

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    updateCompany({ name: name.trim() }, { onSuccess: () => setSaved(true) });
  }

  const logoUrl = membership?.company.logoUrl ?? membership?.company.avatarUrl ?? null;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-foreground text-base font-semibold">Company settings</h1>
        {membership && <p className="text-muted-foreground text-sm">{membership.company.name}</p>}
      </div>

      {/* Company logo */}
      <Card>
        <CardHeader>
          <CardTitle>Company logo</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUploader
            currentUrl={logoUrl}
            name={membership?.company.name || ''}
            isPending={uploadingAvatar || saving}
            onUploadFile={(file) => uploadAvatar(file)}
            onSetUrl={(url) => updateCompany({ avatarUrl: url })}
            onRemove={() => updateCompany({ avatarUrl: null })}
          />
          <p className="text-muted-foreground mt-3 text-xs">
            The company logo is shown to everyone in {membership?.company.name}. This is the
            company&apos;s image — separate from your personal profile picture.
          </p>
        </CardContent>
      </Card>

      {/* Company name */}
      <Card>
        <CardHeader>
          <CardTitle>Company name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Name</Label>
              <Input
                id="companyName"
                value={name}
                maxLength={120}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              {saved && <span className="text-success text-xs">Saved.</span>}
              <Button type="submit" disabled={saving || name.trim().length < 2}>
                {saving ? 'Saving…' : 'Save name'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
