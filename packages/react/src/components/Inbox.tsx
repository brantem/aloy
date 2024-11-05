import { createPortal } from 'react-dom';

import Comment from 'components/Comment';

import { State } from 'types';
import { useAppStore } from 'lib/stores';
import { cn } from 'lib/helpers';
import { useEscape, usePins } from 'lib/hooks';

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

  return createPortal(
    <div className="fixed bottom-[74px] left-0 right-0 z-[1004] flex snap-x gap-4 overflow-auto pb-6 pl-[calc(50vw-theme(spacing.36)-theme(spacing.4))] pr-[calc(50vw-theme(spacing.36)-theme(spacing.4))] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {nodes.map((pin) => {
        const isReadonly = pin.id !== activeId;
        return (
          <Comment
            key={pin.id}
            data-id={pin.id}
            isRoot
            comment={{ pin_id: pin.id, ...pin.comment, user: pin.user }}
            className={cn(
              'h-36 w-72 flex-shrink-0 cursor-pointer select-none snap-center rounded-lg border border-neutral-200 bg-white',
              isReadonly ? 'opacity-50' : 'shadow-sm',
            )}
            isReadonly={isReadonly}
            showMarkAsDone
            isCompleted={!!pin.completed_at}
            onClick={() => setActiveId(pin.id)}
            isFixed
          />
        );
      })}
    </div>,
    document.body,
  );
}
