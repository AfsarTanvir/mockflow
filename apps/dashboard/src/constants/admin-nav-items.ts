import {
  Building2,
  FolderOpen,
  IdCard,
  LayoutDashboard,
  Receipt,
  ScrollText,
  ShoppingCart,
  Users,
  UsersRound,
  Zap,
} from 'lucide-react';

import type { NavGroup } from '@/constants/nav-items';

/** Root of the admin section — used for exact-match active state. */
export const ADMIN_ROOT = '/admin';

export const adminNavGroups: NavGroup[] = [
  {
    items: [{ label: 'Overview', icon: LayoutDashboard, href: '/admin' }],
  },
  {
    items: [
      { label: 'Companies', icon: Building2, href: '/admin/companies' },
      { label: 'Users', icon: Users, href: '/admin/users' },
      { label: 'Profiles', icon: IdCard, href: '/admin/profiles' },
      { label: 'Teams', icon: UsersRound, href: '/admin/teams' },
      { label: 'Projects', icon: FolderOpen, href: '/admin/projects' },
    ],
  },
  {
    items: [
      { label: 'Endpoints', icon: Zap, href: '/admin/endpoints' },
      { label: 'Request Logs', icon: ScrollText, href: '/admin/request-logs' },
    ],
  },
  {
    items: [
      { label: 'Orders', icon: ShoppingCart, href: '/admin/orders' },
      { label: 'Sells', icon: Receipt, href: '/admin/sells' },
    ],
  },
];
