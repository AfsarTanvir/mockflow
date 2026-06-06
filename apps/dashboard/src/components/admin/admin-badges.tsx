import { Badge } from '@/components/ui/badge';
import type { ProfileRole, ProfileStatus } from '@/types';

const ROLE_VARIANT: Record<ProfileRole, 'default' | 'info' | 'secondary' | 'muted'> = {
  owner: 'default',
  admin: 'info',
  member: 'secondary',
  viewer: 'muted',
};

export function RoleBadge({ role }: { role: ProfileRole }) {
  return (
    <Badge variant={ROLE_VARIANT[role]} className="capitalize">
      {role}
    </Badge>
  );
}

const STATUS_VARIANT: Record<ProfileStatus, 'success' | 'warning' | 'muted'> = {
  active: 'success',
  suspended: 'warning',
  inactive: 'muted',
};

export function StatusBadge({ status }: { status: ProfileStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="capitalize">
      {status}
    </Badge>
  );
}

/** HTTP status-code pill, colored by class (2xx success … 5xx error). */
export function StatusCodeBadge({ code }: { code: number }) {
  const variant =
    code >= 500 ? 'destructive' : code >= 400 ? 'warning' : code >= 300 ? 'info' : 'success';
  return (
    <Badge variant={variant} className="font-mono">
      {code}
    </Badge>
  );
}
