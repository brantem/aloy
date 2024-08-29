import { useRef } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';

import Comment from 'components/Comment';
import AddCommentForm from 'components/AddCommentForm';

import { State, type Pin, type Comment as C } from 'types';
import { usePinPosition } from 'lib/hooks';
import { useAppStore, usePinStore } from 'lib/stores';
import { cn } from 'lib/helpers';

type ContentProps = {
  pin: Pin;
  isCompact: boolean;
};

const Content = ({ pin, isCompact }: ContentProps) => {
  const { data } = useSWR<{ nodes: C[] }>(`/pins/${pin.id}/comments`);
  return (
    <div className="flex flex-col [&>*~*]:border-t [&>*~*]:border-neutral-200">
      <Comment
        isRoot
        comment={{ pin_id: pin.id, ...pin.comment, user: pin.user }}
        showMarkAsDone
        isCompleted={!!pin.completed_at}
        totalReplies={pin.total_replies}
        showTotalReplies={isCompact}
      />
      {!isCompact && (
        <>
          {(data?.nodes || []).map((comment) => (
            <Comment key={comment.id} comment={{ pin_id: pin.id, ...comment }} />
          ))}
          <AddCommentForm pinId={pin.id} />
        </>
      )}
    </div>
  );
};

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
    const isActive = pin.id === state.activeId;
    return {
      isHovered: isActive ? false : pin.id === state.hoveredId, // why
      setHoveredId: state.setHoveredId,
      isActive,
      isActiveIdLocked: isActive && state.isActiveIdLocked,
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
  // the pin will only be expanded when:
  // 1. hovered (root)
  // 2. clicked (root + comments)
  // 3. the inbox is open, and the pin is active (root)
  // 4. the inbox is open, and the pin is active and locked (root + comments)
  const isExpanded = isHovered ? true : isInboxOpen ? isActive : isActive && isActiveIdLocked;
  // The pin will only be visible when:
  // 1. it is not complete
  // 2. the inbox is open, regardless of the completion status
  const isHidden = !isInboxOpen && pin.completed_at !== null;
  // The pin will be hoverable (root visible) when:
  // 1. it is not hidden
  // 2. it is locked (comments are visible)
  const isHoverable = !isHidden && (isActive ? !isActiveIdLocked : true);

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
            ? 'z-[1003] size-fit rounded-lg shadow-sm'
            : 'z-[1002] flex size-8 scale-90 items-center justify-center rounded-full opacity-50 shadow-md transition-transform hover:scale-100 hover:opacity-100',
          isHoverable && isExpanded && '-inset-6 block',
        )}
        style={{ top: position.top, left: position.left }}
        onClick={() => {
          if (isHidden) return;
          setActiveId(pin.id, true);
          // should we move the pin into the middle of the screen here? will it be annoying?
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
            <Content pin={pin} isCompact={isInboxOpen ? !isActiveIdLocked : isHoverable} />
          ) : (
            <span className="text-lg font-bold">{pin.user.name[0]!.toUpperCase()}</span>
          ))}
      </div>
    </>,
    document.body,
  );
}
