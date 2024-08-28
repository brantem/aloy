import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import useSWR from 'swr';

import Comment from 'components/Comment';

import { State, type Pin } from 'types';
import { useCurrentBreakpoint } from 'lib/hooks';
import { useAppStore, usePinStore } from 'lib/stores';
import { cn } from 'lib/helpers';

const Inbox = () => {
  const listRef = useRef<HTMLDivElement>(null);
  const { isOpen, handleEscape } = useAppStore((state) => ({
    isOpen: state.active === State.ShowInbox,
    handleEscape: () => state.setActive(State.Nothing),
  }));
  const { activeId, setActiveId } = usePinStore((state) => ({
    activeId: state.activeId,
    setActiveId: (v: number) => v !== state.activeId && state.setActiveId(v, false),
  }));

  const { data, isLoading } = useSWR<{ nodes: Pin[] }>(`/pins?_path=${window.location.pathname}`);

  const r = useCurrentBreakpoint();
  const pins = (() => {
    if (!r) return [];
    return (data?.nodes || []).filter((pin) => {
      if (r.start === 0 && r.end === 0) return true;
      if (r.start === 0 && r.end !== 0) return pin.w <= r.end;
      if (r.start !== 0 && r.end === 0) return pin.w >= r.start;
      return pin.w >= r.start && pin.w <= r.end;
    });
  })();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      handleEscape();
    };

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isLoading || !pins.length || activeId) return;
    setActiveId(pins[0].id);
  }, [isOpen, pins, isLoading]);

  const scrollIntoView = (pinId: number) => {
    if (!listRef.current) return;

    const comment = listRef.current.querySelector(`[data-id="${pinId}"]`);
    if (comment) {
      const { x } = comment.getBoundingClientRect();
      listRef.current.scrollBy((((x - listRef.current.offsetWidth / 2 - 288 / 2) % 288) / 16) * 288, 0);
    }

    const pin = document.getElementById(`__aloy-pin-${pinId}`);
    if (pin) pin.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  };

  useEffect(() => {
    if (!isOpen || !activeId) return;
    scrollIntoView(activeId);
  }, [isOpen, activeId]);

  if (!isOpen) return null;

  if (!pins.length) {
    return (
      <div className="pb-6 text-center text-white">
        <span className="relative">There is nothing to see here</span>
      </div>
    );
  }

  const i = pins.findIndex((pin, i) => (activeId ? pin.id === activeId : i === 0));
  const before = i > 0 ? pins[i - 1] : null;
  const after = i < pins.length - 1 ? pins[i + 1] : null;

  return createPortal(
    <div className="fixed bottom-[74px] left-0 right-0 z-[1004]">
      <div className="relative">
        <div
          ref={listRef}
          className="relative ml-[50%] flex w-screen -translate-x-1/2 snap-x overflow-hidden pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pins.map((pin) => {
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
                  onClick={() => {
                    setActiveId(pin.id);
                    scrollIntoView(pin.id);
                  }}
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
              onClick={() => {
                setActiveId(before.id);
                scrollIntoView(before.id);
              }}
            >
              <ChevronLeftIcon className="-ml-0.5 size-5" />
            </button>
          ) : (
            <div />
          )}
          {after ? (
            <button
              className="-mr-16 flex size-10 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white shadow-md"
              onClick={() => {
                setActiveId(after.id);
                scrollIntoView(after.id);
              }}
            >
              <ChevronRightIcon className="-mr-0.5 size-5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default Inbox;
