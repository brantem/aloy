import { useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import { CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline';

import type { Comment } from 'types';
import { cn } from 'lib/helpers';
import { useAppStore } from 'lib/stores';
import { useActions, usePins } from 'lib/hooks';

dayjs.extend(utc);
dayjs.extend(relativeTime);

type CreatedAtProps = {
  children: Comment['created_at'];
};

const CreatedAt = ({ children }: CreatedAtProps) => {
  const enterTimeoutRef = useRef<NodeJS.Timeout>();

  const [isRelative, setIsRelative] = useState(true);

  return (
    <span
      className="shrink-0 text-sm leading-5 text-neutral-400"
      onMouseEnter={() => (enterTimeoutRef.current = setTimeout(() => setIsRelative(false), 250))}
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
  const { mutate } = useSWRConfig();
  const ref = useRef<HTMLDivElement>(null);

  const user = useAppStore((state) => state.user);
  const { setActiveId } = usePins();
  const actions = useActions();

  return (
    <div ref={ref} className={cn('relative p-3 text-sm', isFixed && 'pb-5', className)} {...props}>
      <div className="flex items-center justify-between gap-3">
        <p className="mb-0.5 truncate font-medium leading-5 text-neutral-700">
          {comment.user.id === user.id ? user.name : comment.user.name}
        </p>

        {!isReadonly && (
          <div className="flex gap-[3px]">
            {isRoot && showMarkAsDone && (
              <button
                className={cn(
                  'flex size-6 items-center justify-center',
                  isCompleted
                    ? 'rounded-full bg-lime-50 text-lime-500'
                    : 'cursor-pointer rounded-md text-neutral-400 hover:bg-lime-50 hover:text-lime-500',
                )}
                onClick={async (e) => {
                  e.stopPropagation();
                  actions.completePin(comment.pin_id, isCompleted, () => {
                    mutate(`/v1/pins?_path=${window.location.pathname}`);
                  });
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
                  actions.deletePin(comment.pin_id, async () => {
                    await mutate(`/v1/pins?_path=${window.location.pathname}`);
                    setActiveId(0, false);
                  });
                } else {
                  actions.deleteComment(comment.pin_id, async () => mutate(`/v1/pins/${comment.pin_id}/comments`));
                }
              }}
            >
              <TrashIcon className="size-5" />
            </button>
          </div>
        )}
      </div>

      <CreatedAt>{comment.created_at}</CreatedAt>

      <Text data={JSON.parse(comment.text)} isFixed={isFixed} />

      {showTotalReplies && totalReplies > 0 && (
        <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 rounded-full bg-black px-2 py-1 text-xs text-white">
          {totalReplies} {totalReplies > 1 ? 'Replies' : 'Reply'}
        </span>
      )}
    </div>
  );
}

type Child = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

type Item = {
  children: Child[];
};

function Text({ data, isFixed }: { data: Item[]; isFixed: boolean }) {
  return (
    <div className={cn('prose-sm mt-2', isFixed && 'line-clamp-3')}>
      {data.map((item, i) => {
        if (!item.children.some((child) => child.text.trim())) {
          return (
            <div key={i}>
              <span>&nbsp;</span>
            </div>
          );
        }
        return (
          <div key={i}>
            {item.children.map((child, i) => {
              let text = <>{child.text}</>;
              if ('bold' in child) text = <strong>{text}</strong>;
              if ('italic' in child) text = <em>{text}</em>;
              if ('underline' in child) text = <u>{text}</u>;
              return <span key={i}>{text}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}
