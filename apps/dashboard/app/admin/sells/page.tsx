import { Receipt } from 'lucide-react';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

export default function AdminSellsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminPageHeader
        title="Sells"
        description="Revenue and sales performance across the platform."
        action={<Badge variant="warning">Coming soon</Badge>}
      />
      <EmptyState
        icon={Receipt}
        title="Sales reporting is coming soon"
        description="There is no commerce data yet. Once billing ships, sales and revenue breakdowns will appear here."
      />
    </div>
  );
}
