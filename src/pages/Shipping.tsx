import LegalPage from '../components/LegalPage';
import { getLegalDoc } from '../lib/legal';

export default function Shipping() {
  return (
    <LegalPage
      title="Shipping"
      description="Where Taptile ships, what it costs and how tracking works."
      path="/shipping"
      body={getLegalDoc('shipping')}
    />
  );
}
