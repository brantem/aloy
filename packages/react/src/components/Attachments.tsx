import { XMarkIcon } from '@heroicons/react/16/solid';

import Image from 'components/Image';

import type { Attachment } from 'types';
import { useLightboxStore } from 'lib/stores';
import { cn } from 'lib/helpers';

type AttachmentsProps = {
  className?: string;
  items: Attachment[];
  onDelete(i: number): void;
  shouldStopPropagation?: boolean;
};

const Attachments = ({ className, items, onDelete, shouldStopPropagation }: AttachmentsProps) => {
  const showLightbox = useLightboxStore((state) => {
    return ((attachments, defaultIndex) => {
      state.show(attachments, defaultIndex);
    }) as typeof state.show;
  });

  if (!items.length) return null;

  return (
    <div className={cn('grid grid-cols-7 justify-between gap-1', className)}>
      {items.map((attachment, i) => (
        <div key={i} className="group relative">
          <div
            className="aspect-square cursor-pointer overflow-hidden rounded-md border border-neutral-200 shadow-sm hover:scale-110"
            onClick={(e) => {
              if (shouldStopPropagation) e.stopPropagation();
              showLightbox(items, i);
            }}
          >
            <Image src={attachment.url} hash={attachment.data.hash} />
          </div>

          {onDelete && (
            <button
              className="absolute -right-1.5 -top-1.5 flex size-3 items-center justify-center rounded-lg border border-rose-200 bg-rose-100 text-rose-500 opacity-0 hover:scale-110 group-hover:opacity-100"
              onClick={() => onDelete(i)}
            >
              <XMarkIcon className="size-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default Attachments;
