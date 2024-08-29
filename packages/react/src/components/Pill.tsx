import { createPortal } from 'react-dom';
import { ChatBubbleOvalLeftIcon, InboxIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { State } from 'types';
import { useAppStore, usePinStore } from 'lib/stores';
import { cn } from 'lib/helpers';
import { usePins } from 'lib/hooks';

const useToggle = (v: State) => {
  const reset = usePinStore((state) => () => state.reset());
  return useAppStore((state) => {
    const isActive = state.active === v;
    return {
      isActive,
      toggle(cb?: (isActive: boolean) => void) {
        reset();
        const active = isActive ? State.Nothing : v;
        state.setActive(active);
        cb?.(active !== State.Nothing);
      },
    };
  });
};

const AddCommentButton = () => {
  const { isActive, toggle } = useToggle(State.AddComment);
  return (
    <button
      className={cn(
        'flex size-9 items-center justify-center rounded-full text-neutral-900',
        isActive ? 'bg-neutral-200' : 'hover:bg-neutral-100',
      )}
      onClick={() => toggle()}
    >
      <ChatBubbleOvalLeftIcon className="size-5" />
    </button>
  );
};

const ShowInboxButton = () => {
  const { isActive, toggle } = useToggle(State.ShowInbox);
  const { activeId, setActiveId } = usePins();
  return (
    <button
      className={cn(
        'flex size-9 items-center justify-center rounded-full text-neutral-900',
        isActive ? 'bg-neutral-200' : 'hover:bg-neutral-100',
      )}
      onClick={() => {
        toggle((isActive) => {
          if (!isActive) return;
          setActiveId(activeId || 'first');
        });
      }}
    >
      <InboxIcon className="size-5" />
    </button>
  );
};

const CloseButton = () => {
  const close = useAppStore((state) => state.close);
  return (
    <button
      className="flex size-9 items-center justify-center rounded-full text-neutral-900 hover:bg-rose-50 hover:text-rose-500"
      onClick={close}
    >
      <XMarkIcon className="size-5" />
    </button>
  );
};

export default function Pill() {
  const isInboxOpen = useAppStore((state) => state.active === State.ShowInbox);
  return createPortal(
    <div
      id="__aloy-pill"
      className={cn(
        'fixed bottom-0 left-1/2 z-[1004] -translate-x-1/2 p-6 transition-[margin]',
        isInboxOpen ? 'm-0' : '-mb-12 hover:m-0',
      )}
    >
      <div
        className={cn(
          'flex items-stretch gap-1.5 rounded-full border border-neutral-200 bg-white p-1.5 transition-all',
          isInboxOpen
            ? 'shadow-[100px_-50px_250px_100px_rgb(142,144,249,.5),-100px_0_250px_100px_rgb(255,59,139,.5)]'
            : 'shadow-sm',
        )}
      >
        <AddCommentButton />
        <ShowInboxButton />
        <div className="mx-1.5 w-0 border-l border-neutral-200" />
        <CloseButton />
      </div>
    </div>,
    document.body,
  );
}
