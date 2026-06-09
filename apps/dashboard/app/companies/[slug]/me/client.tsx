'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';

import { useMyCompanies } from '@/query/companies';
import { useMyProfile, useUpdateProfile, useUploadProfileAvatar } from '@/query/profiles';
import { AvatarUploader } from '@/components/dashboard/avatar-uploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProfileLink, ProfileVisibility } from '@/types';

const selectClass =
  'border-border bg-background text-foreground h-9 w-full rounded-lg border px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
const textareaClass =
  'border-border bg-background text-foreground min-h-24 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

export default function CompanyProfileClient({ slug }: { slug: string }) {
  const { data: memberships = [], isLoading: membershipsLoading } = useMyCompanies();
  const membership = memberships.find((m) => m.company.slug === slug);
  const companyId = membership?.company.id ?? '';
  const profileId = membership?.profile.id ?? '';

  const { data: profile, isLoading: profileLoading } = useMyProfile(companyId);
  const { mutate: save, isPending: saving } = useUpdateProfile(profileId, companyId);
  const { mutate: uploadAvatar, isPending: uploadingAvatar } = useUploadProfileAvatar(
    profileId,
    companyId
  );

  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [visibility, setVisibility] = useState<ProfileVisibility>('company_member_only');
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [saved, setSaved] = useState(false);

  // Hydrate the form once per profile load — re-running on every refetch (e.g.
  // after an avatar upload invalidates the cache) would clobber in-progress edits.
  const hydratedId = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || hydratedId.current === profile.id) return;
    hydratedId.current = profile.id;
    setDisplayName(profile.displayName ?? '');
    setJobTitle(profile.jobTitle ?? '');
    setDepartment(profile.department ?? '');
    setPhone(profile.phone ?? '');
    setBio(profile.bio ?? '');
    setVisibility(profile.visibility ?? 'company_member_only');
    setLinks(profile.links ?? []);
  }, [profile]);

  if (!membershipsLoading && !membership) {
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

  function touch() {
    setSaved(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (displayName.trim().length < 1) return;
    save(
      {
        displayName: displayName.trim(),
        jobTitle: jobTitle.trim() || null,
        department: department.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        visibility,
        links: links.filter((l) => l.label.trim() && l.url.trim()),
      },
      { onSuccess: () => setSaved(true) }
    );
  }

  const loading = membershipsLoading || (!!companyId && profileLoading);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-foreground text-base font-semibold">Company profile</h1>
        {membership && (
          <p className="text-muted-foreground text-sm">Your profile in {membership.company.name}</p>
        )}
      </div>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Profile picture</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUploader
            currentUrl={profile?.avatarUrl ?? membership?.profile.avatarUrl ?? null}
            name={displayName || membership?.profile.displayName || ''}
            isPending={uploadingAvatar || saving}
            onUploadFile={(file) => uploadAvatar(file)}
            onSetUrl={(url) => save({ avatarUrl: url })}
            onRemove={() => save({ avatarUrl: null })}
          />
          <p className="text-muted-foreground mt-3 text-xs">
            Shown to members of {membership?.company.name ?? 'this company'}. This is your personal
            picture here — not the company logo.
          </p>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  maxLength={120}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    touch();
                  }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    maxLength={120}
                    onChange={(e) => {
                      setJobTitle(e.target.value);
                      touch();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    maxLength={80}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      touch();
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    maxLength={40}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      touch();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="visibility">Visibility</Label>
                  <select
                    id="visibility"
                    className={selectClass}
                    value={visibility}
                    onChange={(e) => {
                      setVisibility(e.target.value as ProfileVisibility);
                      touch();
                    }}
                  >
                    <option value="company_member_only">Company members only</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className={textareaClass}
                  value={bio}
                  maxLength={2000}
                  onChange={(e) => {
                    setBio(e.target.value);
                    touch();
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Links</Label>
                {links.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) => {
                        const next = [...links];
                        next[i] = { ...next[i], label: e.target.value };
                        setLinks(next);
                        touch();
                      }}
                    />
                    <Input
                      placeholder="https://…"
                      value={link.url}
                      onChange={(e) => {
                        const next = [...links];
                        next[i] = { ...next[i], url: e.target.value };
                        setLinks(next);
                        touch();
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove link"
                      onClick={() => {
                        setLinks(links.filter((_, j) => j !== i));
                        touch();
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                {links.length < 20 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLinks([...links, { label: '', url: '' }]);
                      touch();
                    }}
                  >
                    <Plus className="size-3.5" />
                    Add link
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                {saved && <span className="text-success text-xs">Saved.</span>}
                <Button type="submit" disabled={saving || displayName.trim().length < 1}>
                  {saving ? 'Saving…' : 'Save profile'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
