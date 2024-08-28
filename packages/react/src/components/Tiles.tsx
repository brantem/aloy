import { Fragment } from 'react';

import { cn } from 'lib/helpers';

export default function Tiles({ n }: { n: number }) {
  return (
    <div
      className="grid select-none grid-cols-[repeat(var(--n),500px)] grid-rows-[repeat(var(--n),500px)] text-[10rem] font-extrabold text-neutral-300 mix-blend-multiply dark:text-neutral-700"
      style={{ '--n': n } as React.CSSProperties}
    >
      {Array.from({ length: n }).map((_, i) => (
        <Fragment key={i}>
          {Array.from({ length: n }).map((_, j) => (
            <div
              key={'' + i + j}
              className={cn(
                'flex items-center justify-center',
                (i % 2 === 0 ? j % 2 === 0 : j % 2 !== 0)
                  ? 'bg-neutral-100 dark:bg-neutral-800'
                  : 'dark:bg-neutral-900/90',
              )}
            >{`${i},${j}`}</div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
