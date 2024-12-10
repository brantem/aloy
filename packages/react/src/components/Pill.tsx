import { createPortal } from 'react-dom';
import { ChatBubbleOvalLeftIcon, InboxIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { State } from 'types';
import { useAppStore, usePinStore, useLightboxStore } from 'lib/stores';
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
  const setActiveId = usePinStore((state) => state.setActiveId);
  return (
    <button
      className={cn(
        'flex size-9 items-center justify-center rounded-full text-neutral-900',
        isActive ? 'bg-neutral-200' : 'hover:bg-neutral-100',
      )}
      onClick={() => toggle(() => setActiveId(0) /* Close all pins */)}
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
          setActiveId(activeId || 'first'); // Open the currently active pin or the first pin
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
  const isLightboxOpen = useLightboxStore((state) => state.isOpen);

  if (isLightboxOpen) return null;

  return createPortal(
    <div
      id="__aloy-pill"
      className="fixed bottom-0 left-1/2 z-[1004] -mb-12 -translate-x-1/2 p-6 transition-[margin] hover:-mb-2"
    >
      <div className="flex items-stretch gap-1.5 rounded-full border border-neutral-200 bg-white p-1.5 shadow-sm transition-all">
        <AddCommentButton />
        <ShowInboxButton />
        <div className="mx-1.5 w-0 border-l border-neutral-200" />
        <CloseButton />
      </div>
    </div>,
    document.body,
  );
}
