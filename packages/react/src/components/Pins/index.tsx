import Pin from './Pin';

import { usePins } from 'lib/hooks';

export default function Pins() {
  const { nodes } = usePins();
  return nodes.map((pin) => <Pin key={pin.id} pin={pin} />);
}
