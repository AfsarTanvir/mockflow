'use client';

import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { usePendingInvites, useAcceptInvite } from '@/query/teams';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  member: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-500',
};

export function NotificationBell() {
  const router = useRouter();
  const { data: invites = [] } = usePendingInvites();
  const { mutate: accept, isPending, variables: acceptingToken } = useAcceptInvite();

  const count = invites.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors outline-none"
            aria-label="Notifications"
          />
        }
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold text-gray-900">Invitations</p>
          {count > 0 && <span className="text-xs text-gray-400">{count} pending</span>}
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <CheckCheck className="h-8 w-8 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No pending invitations</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y">
            {invites.map((invite) => {
              const isAccepting = isPending && acceptingToken === invite.token;
              return (
                <div key={invite.token} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {invite.project.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${ROLE_COLORS[invite.role] ?? 'bg-gray-100 text-gray-500'}`}
                        >
                          {invite.role}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => accept(invite.token)}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isAccepting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      Accept
                    </button>
                    <button
                      onClick={() => router.push(`/invite/${invite.token}`)}
                      className="flex-1 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
