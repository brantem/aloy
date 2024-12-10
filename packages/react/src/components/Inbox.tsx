import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon } from '@heroicons/react/20/solid';

import Comment from 'components/Comment';

import { State } from 'types';
import { useAppStore } from 'lib/stores';
import { useEscape, usePins } from 'lib/hooks';
import { cn, parseTextData, textDataToText, search } from 'lib/helpers';

export default function Inbox() {
  const { nodes, activeId, setActiveId } = usePins();

  const { isOpen, handleEscape } = useAppStore((state) => ({
    isOpen: state.active === State.ShowInbox,
    handleEscape() {
      state.setActive(State.Nothing);
    },
  }));
  useEscape(handleEscape);

  const [position, setPosition] = useState<'left' | 'right'>('right');
  const [filter, setFilter] = useState<{ search: string; done: boolean | undefined }>({ search: '', done: undefined });

  if (!isOpen) return null;

  // TODO: api
  const pins = nodes.filter((node) => {
    let i = 0;
    if (filter.search) i += ~~!search(textDataToText(parseTextData(node.comment.text)), filter.search);
    if (filter.done !== undefined) i += ~~(filter.done ? !node.completed_at : !!node.completed_at);
    return i === 0;
  });

  return createPortal(
    <div className={cn('fixed bottom-4 top-4 z-[1004]', position === 'left' ? 'left-4' : 'right-4')}>
      <div className="relative flex max-h-full flex-col rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm">
        <input
          type="text"
          className="w-full rounded-t-lg bg-white px-2 py-3 text-sm"
          placeholder="Search..."
          value={filter.search}
          onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
          onBlur={() => setFilter((prev) => ({ ...prev, search: prev.search.trim() }))}
        />

        <select
          className="appearance-none border-y border-neutral-200 bg-transparent p-2 text-sm"
          onChange={(e) => {
            setFilter((prev) => ({ ...prev, done: e.target.value === '-1' ? undefined : e.target.value === '1' }));
          }}
        >
          <option value="-1" selected>
            All
          </option>
          <option value="1">Resolved</option>
          <option value="0">Unresolved</option>
        </select>

        <button
          className={cn(
            'absolute top-[33px] z-10 flex size-6 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm hover:bg-neutral-100',
            position === 'left' ? '-right-3 rotate-180' : '-left-3',
          )}
          onClick={() => setPosition((prev) => (prev === 'left' ? 'right' : 'left'))}
        >
          <ChevronLeftIcon className="size-5" />
        </button>

        <div className="flex flex-1 snap-y snap-mandatory flex-col gap-2 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pins.length ? (
            pins.map((pin) => {
              const isSelected = pin.id === activeId;
              return (
                <div key={pin.id} className={cn('snap-start scroll-mt-2', pin.total_replies && 'pb-[13px]')}>
                  <Comment
                    data-id={pin.id}
                    isRoot
                    isInInbox
                    comment={{ pin_id: pin.id, ...pin.comment, user: pin.user }}
                    className={cn(
                      'w-72 cursor-pointer select-none rounded-lg border border-neutral-200 bg-white',
                      isSelected && 'outline outline-offset-2 outline-blue-500',
                    )}
                    showMarkAsDone
                    isCompleted={!!pin.completed_at}
                    totalReplies={pin.total_replies}
                    showTotalReplies
                    onClick={() => setActiveId(pin.id, false)}
                  />
                </div>
              );
            })
          ) : (
            <span className="flex min-h-[102px] w-72 items-center justify-center text-sm text-neutral-500">
              There is nothing to see here
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
