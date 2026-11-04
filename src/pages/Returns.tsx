import LegalPage from '../components/LegalPage';
import { getLegalDoc } from '../lib/legal';

export default function Returns() {
  return (
    <LegalPage
      title="Returns and refunds"
      description="Faults, change of mind, pre-order cancellations and how refunds are paid."
      path="/returns"
      body={getLegalDoc('returns')}
    />
  );
}
