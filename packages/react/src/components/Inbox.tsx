import { useState } from 'react';
import { createPortal } from 'react-dom';

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

  const [filter, setFilter] = useState<{ search: string; done: boolean | undefined }>({ search: '', done: undefined });

  if (!isOpen) return null;

  // TODO: add button to move to the other side

  // TODO: api
  const pins = nodes.filter((node) => {
    let i = 0;
    if (filter.search) i += ~~!search(textDataToText(parseTextData(node.comment.text)), filter.search);
    if (filter.done !== undefined) i += ~~(filter.done ? !node.completed_at : !!node.completed_at);
    return i === 0;
  });

  return createPortal(
    <div className="fixed bottom-4 right-4 top-4 z-[1004]">
      <div className="flex max-h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm">
        <input
          type="text"
          className="w-full rounded-t-lg border-b border-neutral-200 bg-white px-2 py-3 text-sm"
          placeholder="Search..."
          value={filter.search}
          onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
          onBlur={() => setFilter((prev) => ({ ...prev, search: prev.search.trim() }))}
        />

        <select
          className="border-b border-neutral-200 bg-transparent p-2 text-sm"
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

        <div className="flex flex-1 snap-y snap-mandatory flex-col gap-2 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pins.length ? (
            pins.map((pin) => {
              const isSelected = pin.id === activeId;
              return (
                <Comment
                  key={pin.id}
                  data-id={pin.id}
                  isRoot
                  isInInbox
                  comment={{ pin_id: pin.id, ...pin.comment, user: pin.user }}
                  className={cn(
                    'w-72 flex-shrink-0 cursor-pointer select-none snap-start scroll-mt-2 rounded-lg border border-neutral-200 bg-white',
                    isSelected && 'outline outline-offset-2 outline-blue-500',
                  )}
                  showMarkAsDone
                  isCompleted={!!pin.completed_at}
                  onClick={() => setActiveId(pin.id, false)}
                />
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
