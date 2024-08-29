import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

import Comment from 'components/Comment';

import { State } from 'types';
import { useAppStore } from 'lib/stores';
import { cn } from 'lib/helpers';
import { useEscape, usePins } from 'lib/hooks';

// TODO: the active pin must always be in the center

export default function Inbox() {
  const { nodes, activeId, setActiveId } = usePins();

  const { isOpen, handleEscape } = useAppStore((state) => ({
    isOpen: state.active === State.ShowInbox,
    handleEscape() {
      state.setActive(State.Nothing);
    },
  }));
  useEscape(handleEscape);

  if (!isOpen) return null;

  if (!nodes.length) {
    return (
      <div className="fixed bottom-[74px] left-0 right-0 z-[1004] pb-6 text-center text-white">
        <span>There is nothing to see here</span>
      </div>
    );
  }

  const i = nodes.findIndex((pin, i) => (activeId ? pin.id === activeId : i === 0));
  const before = i > 0 ? nodes[i - 1] : null;
  const after = i < nodes.length - 1 ? nodes[i + 1] : null;

  return createPortal(
    <div className="fixed bottom-[74px] left-0 right-0 z-[1004]">
      <div className="relative ml-[50%] flex w-screen -translate-x-1/2 snap-x overflow-hidden pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {nodes.map((pin) => {
          const isReadonly = pin.id !== activeId;
          return (
            <div
              key={pin.id}
              className="mr-4 first:ml-0 first:pl-[calc(50vw-theme(spacing.4)/2)] last:mr-0 last:pr-[calc(50vw-theme(spacing.4)/2)]"
            >
              <Comment
                data-id={pin.id}
                isRoot
                comment={{ pin_id: pin.id, ...pin.comment, user: pin.user }}
                className={cn(
                  'cursor-pointer select-none snap-center rounded-lg border border-neutral-200 bg-white',
                  isReadonly ? 'opacity-50' : 'shadow-sm',
                )}
                isReadonly={isReadonly}
                showMarkAsDone
                isCompleted={!!pin.completed_at}
                onClick={() => setActiveId(pin.id)}
                isFixed
              />
            </div>
          );
        })}
      </div>

      <div className="absolute left-0 right-0 top-[72px] z-[1005] mx-auto flex h-0 w-72 items-center justify-between">
        {before ? (
          <button
            className="-ml-16 flex size-10 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white shadow-md"
            onClick={() => setActiveId(before.id)}
          >
            <ChevronLeftIcon className="-ml-0.5 size-5" />
          </button>
        ) : (
          <div />
        )}

        {after ? (
          <button
            className="-mr-16 flex size-10 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white shadow-md"
            onClick={() => setActiveId(after.id)}
          >
            <ChevronRightIcon className="-mr-0.5 size-5" />
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
