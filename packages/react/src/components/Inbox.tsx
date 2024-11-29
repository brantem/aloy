import { createPortal } from 'react-dom';

import Comment from 'components/Comment';

import { State } from 'types';
import { useAppStore } from 'lib/stores';
import { useEscape, usePins } from 'lib/hooks';
import { cn } from 'lib/helpers';

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

  // TODO: add button to move to the other side

  return createPortal(
    <div className="fixed bottom-4 right-4 top-4 z-[1004]">
      <div className="flex max-h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <input type="text" className="w-full rounded-t-lg p-3 text-sm" placeholder="Search..." />

        <div className="flex flex-1 snap-y flex-col gap-2 overflow-y-auto border-t border-inherit bg-neutral-50 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nodes.length ? (
            nodes.map((pin) => {
              const isSelected = pin.id === activeId;
              return (
                <Comment
                  key={pin.id}
                  data-id={pin.id}
                  isRoot
                  comment={{ pin_id: pin.id, ...pin.comment, user: pin.user }}
                  className={cn(
                    'w-72 flex-shrink-0 cursor-pointer select-none snap-center rounded-lg border border-neutral-200 bg-white',
                    isSelected && 'outline outline-offset-2 outline-blue-500',
                  )}
                  showMarkAsDone
                  isCompleted={!!pin.completed_at}
                  onClick={() => setActiveId(pin.id, false)}
                />
              );
            })
          ) : (
            <span className="flex min-h-[100px] w-72 items-center justify-center text-sm text-neutral-500">
              There is nothing to see here
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
