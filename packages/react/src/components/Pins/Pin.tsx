import { useRef } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';

import Comment from 'components/Comment';
import AddCommentForm from 'components/AddCommentForm';

import { State, type Pin, type Comment as C } from 'types';
import { usePinPosition } from 'lib/hooks';
import { useAppStore, usePinStore } from 'lib/stores';
import { cn } from 'lib/helpers';

type PinProps = {
  pin: Pin;
};

// TODO: use floating-ui

export default function Pin({ pin }: PinProps) {
  const position = usePinPosition(pin);

  const { active, setActive } = useAppStore((state) => ({
    active: state.active,
    setActive: state.setActive,
  }));
  const { isHovered, setHoveredId, isActive, isActiveIdLocked, setActiveId } = usePinStore((state) => {
    return {
      isHovered: pin.id === state.hoveredId,
      setHoveredId: state.setHoveredId,
      isActive: pin.id === state.activeId,
      isActiveIdLocked: state.isActiveIdLocked,
      setActiveId(v: number, isLocked = false) {
        state.setActiveId(v, isLocked);
        if (active !== State.AddComment) return;
        setActive(State.Nothing);
        state.setTempPin(null);
      },
    };
  });

  const enterTimeoutRef = useRef<NodeJS.Timeout>();
  const leaveTimeoutRef = useRef<NodeJS.Timeout>();

  if (!position) return null;

  const isInboxOpen = active === State.ShowInbox;

  // The pin will only be visible when:
  // 1. it is not complete
  // 2. the inbox is open, regardless of the completion status
  const isHidden = !isInboxOpen && pin.completed_at !== null;

  // The pin will be hoverable (root visible) when:
  // 1. it is not hidden
  const isHoverable = !isHidden;

  const isExpanded = isHovered || isActive;
  const isRepliesVisible = isActive && isActiveIdLocked;

  return createPortal(
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 z-[1001]"
          onClick={() => {
            if (isInboxOpen) {
              setActiveId(pin.id);
            } else {
              setActiveId(0);
            }
          }}
        />
      )}

      <div
        className={cn(
          '__aloy-pin absolute !rounded-tl-none border border-neutral-200 bg-white',
          isHidden && '!hidden',
          isHoverable && 'cursor-pointer',
          isExpanded
            ? 'z-[1003] size-fit w-72 rounded-lg shadow-sm'
            : 'z-[1002] flex size-8 scale-90 items-center justify-center rounded-full opacity-50 shadow-md transition-transform hover:scale-100 hover:opacity-100',
          isHoverable && isExpanded && '-inset-6 block',
        )}
        style={{ top: position.top, left: position.left }}
        onClick={() => {
          if (isHidden) return;
          setActiveId(pin.id, true);
          const el = document.getElementById(`__aloy-pin-${pin.id}`)!;
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          clearTimeout(enterTimeoutRef.current);
          clearTimeout(leaveTimeoutRef.current);
        }}
        onMouseEnter={() => {
          if (isHidden || isActive) return;
          clearTimeout(leaveTimeoutRef.current);
          enterTimeoutRef.current = setTimeout(() => setHoveredId(pin.id), 250);
        }}
        onMouseLeave={() => {
          if (isHidden || isActive) return;
          clearTimeout(enterTimeoutRef.current);
          leaveTimeoutRef.current = setTimeout(() => setHoveredId(0), 250);
        }}
      >
        <div id={`__aloy-pin-${pin.id}`} />

        {!isHidden &&
          (isExpanded ? (
            <div className="flex flex-col [&>*~*]:border-t [&>*~*]:border-neutral-200">
              <Comment
                isRoot
                comment={{ pin_id: pin.id, ...pin.comment, user: pin.user }}
                showMarkAsDone
                isCompleted={!!pin.completed_at}
                totalReplies={pin.total_replies}
                showTotalReplies={!isRepliesVisible}
              />
              {isRepliesVisible && <Replies pinId={pin.id} />}
            </div>
          ) : (
            <span className="text-lg font-bold">{pin.user.name[0]!.toUpperCase()}</span>
          ))}
      </div>
    </>,
    document.body,
  );
}

const Replies = ({ pinId }: { pinId: Pin['id'] }) => {
  const { data } = useSWR<{ nodes: C[] }>(`/v1/pins/${pinId}/comments`);
  return (
    <>
      {(data?.nodes || []).map((comment) => (
        <Comment key={comment.id} comment={{ pin_id: pinId, ...comment }} />
      ))}
      <AddCommentForm pinId={pinId} />
    </>
  );
};
