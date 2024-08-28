import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import Tiles from './components/Tiles.tsx';
import Aloy from './Aloy.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Tiles n={8} />
    <Aloy breakpoints={[640, 768, 1024, 1280]} />
  </StrictMode>,
);
