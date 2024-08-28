import { useEffect } from 'react';

import Area from 'components/Area';
import Inbox from 'components/Inbox';
import Pill from 'components/Pill';
import Pins from 'components/Pins';

import { useAppStore } from 'lib/stores';
import { State } from 'types';

export type AloyProps = {
  breakpoints: number[];
};

const processProps = ({ breakpoints }: AloyProps) => {
  return {
    breakpoints: breakpoints.filter((v) => !isNaN(v)),
  };
};

export default function Aloy(props: AloyProps) {
  const { breakpoints } = processProps(props);
  const { load, isHidden, isAddingComment } = useAppStore((state) => ({
    load: state.load,
    isHidden: state.isHidden,
    isAddingComment: state.active === State.AddComment,
  }));

  useEffect(() => {
    load({ breakpoints });
  }, []);

  if (isHidden) return;

  return (
    <>
      {isAddingComment && <Area />}
      <Inbox />
      <Pill />
      <Pins />
    </>
  );
}
