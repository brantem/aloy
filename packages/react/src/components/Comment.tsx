import { useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import { CheckCircleIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

import Attachments from 'components/Attachments';

import type { Comment } from 'types';
import { cn, parseTextData } from 'lib/helpers';
import { useAppStore } from 'lib/stores';
import { useActions, usePins } from 'lib/hooks';

dayjs.extend(utc);
dayjs.extend(relativeTime);

type DateProps = {
  comment: Comment;
};

const Date = ({ comment }: DateProps) => {
  const enterTimeoutRef = useRef<NodeJS.Timeout>();

  const [isRelative, setIsRelative] = useState(true);

  const isEdited = !dayjs(comment.created_at).isSame(comment.updated_at);
  const value = isEdited ? comment.updated_at : comment.created_at;

  return (
    <span
      className="shrink-0 text-sm leading-5 text-neutral-400"
      onMouseEnter={() => (enterTimeoutRef.current = setTimeout(() => setIsRelative(false), 250))}
      onMouseLeave={() => {
        clearTimeout(enterTimeoutRef.current);
        setIsRelative(true);
      }}
    >
      {isEdited ? 'Edited ' : null}
      {isRelative ? dayjs.utc(value).fromNow() : dayjs.utc(value).format('DD MMM YYYY HH:mm')}
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
  const containerRef = useRef<HTMLDivElement>(null);

  const user = useAppStore((state) => state.user);
  const { setActiveId, setSelectedCommentId } = usePins();
  const actions = useActions();

  return (
    <div ref={containerRef} className={cn('relative p-3 text-sm', isFixed && 'pb-5', className)} {...props}>
      <div className="flex items-center justify-between gap-3">
        <p className="mb-0.5 truncate font-medium leading-5 text-neutral-700">
          {comment.user.id === user.id ? user.name : comment.user.name}
        </p>

        {!isReadonly && (
          <div className="flex gap-[3px]">
            {isRoot && showMarkAsDone && (
              <Button
                className={
                  isCompleted
                    ? 'rounded-full bg-lime-50 text-lime-500'
                    : 'cursor-pointer rounded-md text-neutral-400 hover:bg-lime-50 hover:text-lime-500'
                }
                onClick={async (e) => {
                  e.stopPropagation();
                  actions.completePin(comment.pin_id, isCompleted, () => {
                    mutate(`/v1/pins?_path=${window.location.pathname}`);
                  });
                }}
              >
                <CheckCircleIcon className="size-5" />
              </Button>
            )}

            {comment.user.id === user.id ? (
              <>
                <Button
                  className="text-neutral-400 hover:bg-neutral-50 hover:text-neutral-500"
                  onClick={() => setSelectedCommentId(comment.id)}
                >
                  <PencilSquareIcon className="size-5" />
                </Button>

                <Button
                  className="text-neutral-400 hover:bg-rose-50 hover:text-rose-500"
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
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>

      <Date comment={comment} />

      <Text data={parseTextData(comment.text)} isFixed={isFixed} />

      {comment.attachments.length ? (
        <>
          <div className="absolute bottom-2.5 left-2.5 right-2.5 h-5 bg-gradient-to-t from-white to-transparent" />
          <Attachments
            parentRef={containerRef}
            items={comment.attachments}
            readonly={isReadonly}
            placement={isFixed ? 'bottom' : 'side'}
          />
        </>
      ) : null}

      {showTotalReplies && totalReplies > 0 && (
        <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 rounded-full bg-black px-2 py-1 text-xs text-white">
          {totalReplies} {totalReplies > 1 ? 'Replies' : 'Reply'}
        </span>
      )}
    </div>
  );
}

function Button({ className, ...props }: React.ComponentPropsWithoutRef<'button'>) {
  return <button className={cn('flex size-6 items-center justify-center rounded-md', className)} {...props} />;
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
