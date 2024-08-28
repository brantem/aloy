import { createRoot } from 'react-dom/client';

import Tiles from './components/Tiles.tsx';
import Aloy from './Aloy.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <>
    <Tiles n={8} />
    <Aloy
      apiUrl="http://localhost:8787"
      appId="demo"
      breakpoints={[640, 768, 1024, 1280]}
      user={{ id: 'user-1', name: 'Gibran' }}
    />
  </>,
);
