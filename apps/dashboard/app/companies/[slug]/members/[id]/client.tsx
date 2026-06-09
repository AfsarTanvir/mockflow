'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { useProfile } from '@/query/profiles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

export default function MemberProfileClient({
  slug,
  profileId,
}: {
  slug: string;
  profileId: string;
}) {
  const { data: profile, isLoading, isError } = useProfile(profileId);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6">
      <Link
        href={`/companies/${slug}/members`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Members
      </Link>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError || !profile ? (
        <p className="text-muted-foreground text-sm">This profile isn&apos;t available.</p>
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.displayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {initials(profile.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-foreground text-lg font-semibold">{profile.displayName}</p>
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                  {'role' in profile && profile.role && (
                    <Badge variant="muted" className="capitalize">
                      {profile.role}
                    </Badge>
                  )}
                  {profile.jobTitle && <span>{profile.jobTitle}</span>}
                  {profile.department && <span>· {profile.department}</span>}
                </div>
              </div>
            </div>

            {profile.bio && <p className="text-foreground text-sm">{profile.bio}</p>}

            {profile.links && profile.links.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.links.map((l, i) => (
                  <a
                    key={i}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-sm hover:underline"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
