import { useRef } from 'react';

import Tiles from 'components/Tiles.tsx';
import User from 'components/User.tsx';
import Aloy, { type AloyHandle } from './Aloy.tsx';

import { useUserStore } from 'lib/stores/user';

export default function App() {
  const aloyRef = useRef<AloyHandle>(null);

  const { user, setUser } = useUserStore();

  return (
    <>
      <Tiles n={8} />
      <User
        onChange={(user) => {
          setUser(user);
          aloyRef.current?.saveUser(user);
        }}
      />
      {user && (
        <Aloy
          ref={aloyRef}
          apiUrl={import.meta.env.VITE_API_URL}
          appId={import.meta.env.VITE_APP_ID}
          breakpoints={[640, 768, 1024, 1280]}
          user={user}
        />
      )}
    </>
  );
}
