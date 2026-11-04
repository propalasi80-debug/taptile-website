/**
 * Orders.
 *
 * Deliberately empty. This page used to render the design handoff's sample
 * figures; they were removed because invented numbers on an internal
 * dashboard eventually get read as fact. It fills in when real data exists.
 */

import { PageBody, PageHeader } from '../layout/AppShell';
import { Card, EmptyState } from '../ui';
import { Box } from '../icons';

export default function Orders() {
  return (
    <>
      <PageHeader
        title="Orders"
        live
        description="Every pre-order, its status and where it is going."
      />

      <PageBody>
        <Card pad={20}>
          <EmptyState
            icon={Box}
            title="No orders yet"
            body="Orders are in Stripe → Payments, with each buyer's address and phone. Nothing writes them here yet: that needs a webhook, which the Payment Link setup deliberately skips."
          />
        </Card>
      </PageBody>
    </>
  );
}
