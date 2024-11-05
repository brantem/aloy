import { useEffect, useImperativeHandle, forwardRef } from 'react';
import { SWRConfig } from 'swr';
import Cookies from 'js-cookie';

import Area from 'components/Area';
import Inbox from 'components/Inbox';
import Pill from 'components/Pill';
import Pins from 'components/Pins';

import { State, User } from 'types';
import type { User as ExternalUser } from 'types/external';
import { useAppStore } from 'lib/stores';

export type AloyHandle = {
  saveUser(user: ExternalUser): Promise<User | null>;
};

export type AloyProps = {
  apiUrl: string;
  appId: string;
  breakpoints: number[];
  user: ExternalUser;
};

const processProps = ({ apiUrl, appId, breakpoints, user }: AloyProps) => {
  return {
    apiUrl: apiUrl.trim(),
    appId: appId.trim(),
    breakpoints: breakpoints.filter((v) => !isNaN(v)),
    user: { id: user.id.trim(), name: user.name.trim() },
  };
};

const key = '__aloy-user';

const Aloy = forwardRef<AloyHandle, AloyProps>(function Aloy(props, ref) {
  const { apiUrl, appId, breakpoints, user } = processProps(props);

  const { fetcher, setUser, load, isHidden, isAddingComment } = useAppStore((state) => ({
    fetcher: state.fetcher,
    setUser: state.setUser,
    load: state.load,
    isHidden: state.isHidden,
    isAddingComment: state.active === State.AddComment,
  }));

  const saveUser = async (user: ExternalUser) => {
    const res = await fetch(`${apiUrl}/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Aloy-App-ID': appId },
      body: JSON.stringify(user),
    });
    const userId = (await res.json()).user.id;
    if (!userId) return null;

    const v = { id: userId, name: user.name } satisfies User;
    Cookies.set(key, JSON.stringify(v), { expires: 1, path: '/' });
    setUser(v);

    return v;
  };

  useImperativeHandle(ref, () => ({
    saveUser,
  }));

  useEffect(() => {
    if (!apiUrl || !appId || !user.id || !user.name) return;
    (async () => {
      let v: User | null = JSON.parse(Cookies.get(key) || 'null');
      if (v && v.name === user.name) return load({ apiUrl, appId, user: v, breakpoints });

      v = await saveUser(user);
      if (!v) return; // TODO

      load({ apiUrl, appId, user: v, breakpoints });
    })();
  }, []);

  if (isHidden) return;

  return (
    <SWRConfig
      value={{
        async fetcher(url: string) {
          const res = await fetcher(url);
          return await res.json();
        },
      }}
    >
      {isAddingComment && <Area />}
      <Inbox />
      <Pill />
      <Pins />
    </SWRConfig>
  );
});

export default Aloy;
