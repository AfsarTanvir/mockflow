import { ShoppingCart } from 'lucide-react';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminPageHeader
        title="Orders"
        description="Track and manage customer orders across the platform."
        action={<Badge variant="warning">Coming soon</Badge>}
      />
      <EmptyState
        icon={ShoppingCart}
        title="Orders are coming soon"
        description="There is no commerce data yet. Once orders ship, you'll be able to browse and manage every order from here."
      />
    </div>
  );
}
