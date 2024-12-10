import { useRef } from 'react';

import Tiles from 'components/Tiles';
import User from 'components/User';
import Aloy, { type AloyHandle } from './Aloy';

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
          config={{
            breakpoints: [640, 768, 1024, 1280],
            attachment: {
              maxCount: 3,
              maxSize: 100 * 1000,
              supportedTypes: ['image/gif', 'image/jpeg', 'image/png', 'image/webp'],
            },
          }}
          user={user}
        />
      )}
    </>
  );
}
