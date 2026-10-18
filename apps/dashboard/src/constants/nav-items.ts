import {
  LayoutDashboard,
  FolderOpen,
  Zap,
  Users,
  UsersRound,
  Settings,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  disabled?: boolean;
};

export type NavGroup = {
  items: NavItem[];
};

export const dashboardNavGroups: NavGroup[] = [
  {
    items: [
      {
        label: 'Overview',
        icon: LayoutDashboard,
        href: '/dashboard',
      },
      {
        label: 'Projects',
        icon: FolderOpen,
        href: '/dashboard/projects',
      },
    ],
  },
  {
    items: [
      {
        label: 'Endpoints',
        icon: Zap,
        href: '/dashboard/endpoints',
        disabled: true,
      },
      {
        label: 'Team',
        icon: Users,
        href: '/dashboard/team',
      },
      {
        label: 'Teams',
        icon: UsersRound,
        href: '/dashboard/teams',
      },
      {
        label: 'Settings',
        icon: Settings,
        href: '/dashboard/me',
      },
      {
        // Generated from the API's routes (GET /api/docs on the API server).
        label: 'API docs',
        icon: BookOpen,
        href: `${process.env.NEXT_PUBLIC_API_URL}/api/docs`,
      },
    ],
  },
];
