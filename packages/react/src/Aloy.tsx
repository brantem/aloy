import { useEffect } from 'react';
import { SWRConfig } from 'swr';
import Cookies from 'js-cookie';

import Area from 'components/Area';
import Inbox from 'components/Inbox';
import Pill from 'components/Pill';
import Pins from 'components/Pins';

import { useAppStore } from 'lib/stores';
import { State } from 'types';

export type AloyProps = {
  apiUrl: string;
  appId: string;
  breakpoints: number[];
  user: {
    id: string;
    name: string;
  };
};

const processProps = ({ apiUrl, appId, breakpoints, user }: AloyProps) => {
  return {
    apiUrl: apiUrl.trim(),
    appId: appId.trim(),
    breakpoints: breakpoints.filter((v) => !isNaN(v)),
    user: { id: user.id.trim(), name: user.name.trim() },
  };
};

export default function Aloy(props: AloyProps) {
  const { apiUrl, appId, breakpoints, user } = processProps(props);
  const { fetcher, load, isHidden, isAddingComment } = useAppStore((state) => ({
    fetcher: state.fetcher,
    load: state.load,
    isHidden: state.isHidden,
    isAddingComment: state.active === State.AddComment,
  }));

  useEffect(() => {
    if (!apiUrl || !appId || !user.id || !user.name) return;
    (async () => {
      const key = '__aloy-user-id';
      let userId = Cookies.get(key);
      if (userId) return load({ apiUrl, appId, userId, breakpoints });
      const res = await fetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Aloy-App-ID': appId },
        body: JSON.stringify(user),
      });
      userId = (await res.json()).user.id;
      if (!userId) return; // TODO
      Cookies.set(key, userId, { expires: new Date(new Date().getTime() + 1 * 60 * 1000) /* 1 minute */ });
      load({ apiUrl, appId, userId, breakpoints });
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
}
