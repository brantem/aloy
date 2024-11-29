import { useEffect, useImperativeHandle, forwardRef } from 'react';
import { SWRConfig } from 'swr';

import Area from 'components/Area';
import Inbox from 'components/Inbox';
import Pill from 'components/Pill';
import Pins from 'components/Pins';
import Lightbox from 'components/Lightbox';

import { Config, State, User } from 'types';
import type { User as ExternalUser } from 'types/external';
import { useAppStore } from 'lib/stores';
import { useActions } from 'lib/hooks';

export type AloyHandle = {
  saveUser(user: ExternalUser): Promise<User | null>;
};

export type AloyProps = {
  apiUrl: string;
  appId: string;
  user: ExternalUser;
  config: Config;
};

const Aloy = forwardRef<AloyHandle, Pick<AloyProps, 'user'>>(function Aloy(props, ref) {
  const { isHidden, apiUrl, headers, start, isAddingComment } = useAppStore((state) => {
    return {
      isHidden: state.isHidden,
      apiUrl: state.apiUrl,
      headers: {
        'Aloy-App-ID': state.appId,
        'Aloy-User-ID': state.user ? state.user.id.toString() : '',
      },
      start: state.start,
      isAddingComment: state.active === State.AddComment,
    };
  });
  const actions = useActions();

  useImperativeHandle(ref, () => ({
    saveUser: actions.saveUser,
  }));

  useEffect(() => {
    (async () => {
      const user = await actions.saveUser(props.user);
      if (!user) return; // TODO

      start({ user });
    })();
  }, []);

  if (isHidden) return;

  return (
    <SWRConfig
      value={{
        async fetcher(url: string) {
          const res = await fetch(`${apiUrl}${url}`, { headers });
          return await res.json();
        },
      }}
    >
      {isAddingComment && <Area />}
      <Inbox />
      <Pill />
      <Pins />
      <Lightbox />
    </SWRConfig>
  );
});

const processProps = ({ apiUrl, appId, user, config }: AloyProps) => {
  return {
    apiUrl: apiUrl.trim(),
    appId: appId.trim(),
    user: { id: user.id.trim(), name: user.name.trim() },
    config: {
      breakpoints: config.breakpoints.filter((v) => !isNaN(v)),
      attachment: {
        ...config.attachment,
        supportedTypes: config.attachment.supportedTypes.filter((type) => type.startsWith('image/')),
      },
    },
  };
};

export default forwardRef<AloyHandle, AloyProps>(function Wrapper(props, ref) {
  const { apiUrl, appId, user, config } = processProps(props);

  const { isReady, setup } = useAppStore((state) => ({ isReady: state.isReady, setup: state.setup }));

  useEffect(() => {
    if (!apiUrl || !appId || !user.id || !user.name) return;
    setup({ apiUrl, appId, config });
  }, []);

  if (!isReady) return;

  return <Aloy ref={ref} user={user} />;
});
