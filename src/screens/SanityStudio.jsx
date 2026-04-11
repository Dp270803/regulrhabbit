import { Studio } from 'sanity';
import config from '../../sanity.config';

export default function SanityStudio() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <Studio config={config} />
    </div>
  );
}
