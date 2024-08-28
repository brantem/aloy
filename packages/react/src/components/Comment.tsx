import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import { CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline';

import type { Comment } from 'types';
import { cn } from 'lib/helpers';

dayjs.extend(utc);
dayjs.extend(relativeTime);

const CreatedAt = ({ children }: { children: Comment['created_at'] }) => {
  const enterTimeoutRef = useRef<NodeJS.Timeout>();

  const [isRelative, setIsRelative] = useState(true);

  return (
    <span
      className="shrink-0 text-sm leading-5 text-neutral-400"
      onMouseEnter={() => {
        enterTimeoutRef.current = setTimeout(() => setIsRelative(false), 250);
      }}
      onMouseLeave={() => {
        clearTimeout(enterTimeoutRef.current);
        setIsRelative(true);
      }}
    >
      {isRelative ? dayjs.utc(children).fromNow() : dayjs.utc(children).format('DD MMM YYYY HH:mm:ss')}
    </span>
  );
};

export type CommentProps = React.ComponentPropsWithoutRef<'div'> & {
  isRoot?: boolean;
  comment: Comment & { pin_id: number };
  isReadonly?: boolean;
  isFixed?: boolean;
  showMarkAsDone?: boolean;
  isCompleted?: boolean;
  totalReplies?: number;
  showTotalReplies?: boolean;
};

export default function Comment({
  isRoot,
  comment,
  className,
  isReadonly = false,
  isFixed = false,
  showMarkAsDone,
  isCompleted = false,
  totalReplies = 0,
  showTotalReplies = false,
  ...props
}: CommentProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className={cn('relative w-72 p-3 text-sm', isFixed && 'h-36 pb-5', className)} {...props}>
      <div className="flex items-center justify-between gap-3">
        <p className="mb-0.5 truncate font-medium leading-5 text-neutral-700">{comment.user.name}</p>

        {!isReadonly && (
          <div className="flex gap-[3px]">
            {isRoot && showMarkAsDone && (
              <button
                className={cn(
                  'flex size-6 items-center justify-center rounded-md text-neutral-400',
                  isCompleted ? 'rounded-full bg-lime-50 text-lime-500' : 'cursor-pointer',
                  !isCompleted && !isReadonly && 'hover:bg-lime-50 hover:text-lime-500',
                )}
                onClick={async (e) => {
                  e.stopPropagation();
                  console.log('COMPLETE', comment.pin_id, isCompleted);
                  // TODO: refresh pins
                  // should reset activeId and if inbox is currently open it should immediately pick the first pin
                }}
              >
                <CheckCircleIcon className="size-5" />
              </button>
            )}
            <button
              className="flex size-6 items-center justify-center rounded-md text-neutral-400 hover:bg-rose-50 hover:text-rose-500"
              onClick={async (e) => {
                e.stopPropagation();
                if (isRoot) {
                  console.log('DELETE', comment.pin_id);
                  // TODO: refresh pins
                } else {
                  console.log('DELETE', comment.id);
                  // TODO: refresh comments
                }
              }}
            >
              <TrashIcon className="size-5" />
            </button>
          </div>
        )}
      </div>

      <CreatedAt>{comment.created_at}</CreatedAt>

      <div className={cn('mt-2 gap-5 text-neutral-500 [&_p]:m-0 [&_p]:leading-5', isFixed && 'line-clamp-3')}>
        {comment.text.split(/\n+/).map((s, i) => (
          <p key={i}>{s}</p>
        ))}
      </div>

      {showTotalReplies && totalReplies > 0 && (
        <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 rounded-full bg-black px-2 py-1 text-xs text-white">
          {totalReplies} {totalReplies > 1 ? 'Replies' : 'Reply'}
        </span>
      )}
    </div>
  );
}
