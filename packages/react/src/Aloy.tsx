import { useEffect, useImperativeHandle, forwardRef } from 'react';
import { SWRConfig } from 'swr';
import Cookies from 'js-cookie';

import Area from 'components/Area';
import Inbox from 'components/Inbox';
import Pill from 'components/Pill';
import Pins from 'components/Pins';

import { State } from 'types';
import type { User } from 'types/external';
import { useAppStore } from 'lib/stores';

export type AloyHandle = {
  saveUser(user: User): Promise<number>;
};

export type AloyProps = {
  apiUrl: string;
  appId: string;
  breakpoints: number[];
  user: User;
};

const processProps = ({ apiUrl, appId, breakpoints, user }: AloyProps) => {
  return {
    apiUrl: apiUrl.trim(),
    appId: appId.trim(),
    breakpoints: breakpoints.filter((v) => !isNaN(v)),
    user: { id: user.id.trim(), name: user.name.trim() },
  };
};

const key = '__aloy-user-id';

const Aloy = forwardRef<AloyHandle, AloyProps>(function Aloy(props, ref) {
  const { apiUrl, appId, breakpoints, user } = processProps(props);

  const { fetcher, setUser, load, isHidden, isAddingComment } = useAppStore((state) => ({
    fetcher: state.fetcher,
    setUser: state.setUser,
    load: state.load,
    isHidden: state.isHidden,
    isAddingComment: state.active === State.AddComment,
  }));

  const saveUser = async (user: User) => {
    const res = await fetch(`${apiUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Aloy-App-ID': appId },
      body: JSON.stringify(user),
    });
    const userId = (await res.json()).user.id;
    if (!userId) return; // TODO

    Cookies.set(key, userId, { expires: new Date(new Date().getTime() + 5 * 60 * 1000) /* 5 minutes */ });
    setUser({ id: userId, name: user.name });
    return userId;
  };

  useImperativeHandle(ref, () => ({
    saveUser,
  }));

  useEffect(() => {
    if (!apiUrl || !appId || !user.id || !user.name) return;
    (async () => {
      const userId = parseInt(Cookies.get(key) || '');
      if (!isNaN(userId)) return load({ apiUrl, appId, user: { id: userId, name: user.name }, breakpoints });
      load({ apiUrl, appId, user: { id: await saveUser(user), name: user.name }, breakpoints });
    })();
  }, []);

  if (isHidden) return;

  return (
    <SWRConfig value={{ fetcher }}>
      {isAddingComment && <Area />}
      <Inbox />
      <Pill />
      <Pins />
    </SWRConfig>
  );
});

export default Aloy;
