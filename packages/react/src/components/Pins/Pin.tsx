import { useRef } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';

import Comment from 'components/Comment';
import SaveCommentForm from 'components/SaveCommentForm';

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
  const { isHovered, isSelected, setHoveredId, isActive, isActiveIdLocked, setActiveId } = usePinStore((state) => ({
    isHovered: pin.id === state.hoveredId,
    isSelected: pin.comment.id === state.selectedCommentId,
    setHoveredId: state.setHoveredId,
    isActive: pin.id === state.activeId,
    isActiveIdLocked: state.isActiveIdLocked,
    setActiveId(v: number, isLocked = false) {
      // handle click outside while there is a selected comment
      if (v === 0 && state.selectedCommentId !== 0) return state.setSelectedCommentId(0);

      state.setActiveId(v, isLocked);
      if (active !== State.AddComment) return;
      setActive(State.Nothing);
      state.setTempPin(null);
    },
  }));

  const enterTimeoutRef = useRef<NodeJS.Timeout>();
  const leaveTimeoutRef = useRef<NodeJS.Timeout>();

  if (!position) return null;

  const isInboxOpen = active === State.ShowInbox;

  // The pin will be visible when:
  // 1. It is incomplete
  // 2. The inbox is open, regardless of completion status
  const isHidden = !isInboxOpen && pin.completed_at !== null;

  // The pin will be hoverable (root visible) when it is visible
  const isHoverable = !isHidden;

  // The pin will be expanded when hovered or active
  const isExpanded = isHovered || isActive;

  // Replies will be visible when the pin is active and locked (clicked)
  const isRepliesVisible = isActive && isActiveIdLocked;

  const comment = { pin_id: pin.id, ...pin.comment, user: pin.user };

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
          '__aloy-pin absolute !rounded-tl-none border border-neutral-200',
          !isExpanded && pin.completed_at ? 'bg-lime-200 text-lime-900' : 'bg-white text-neutral-900',
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
          setActiveId(pin.id, true); // Expand & show replies
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
              {isSelected ? (
                <SaveCommentForm pinId={pin.id} comment={comment} />
              ) : (
                <Comment
                  isRoot
                  comment={comment}
                  showMarkAsDone
                  isCompleted={!!pin.completed_at}
                  totalReplies={pin.total_replies}
                  showTotalReplies={!isRepliesVisible}
                />
              )}
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
  const selectedCommentId = usePinStore((state) => state.selectedCommentId);
  const { data } = useSWR<{ nodes: C[] }>(`/v1/pins/${pinId}/comments`);
  return (
    <>
      {(data?.nodes || []).map((comment) => {
        if (selectedCommentId === comment.id) {
          return <SaveCommentForm key={comment.id} pinId={pinId} comment={comment} />;
        }
        return <Comment key={comment.id} comment={{ pin_id: pinId, ...comment }} />;
      })}
      {!selectedCommentId ? <SaveCommentForm pinId={pinId} /> : null}
    </>
  );
};
