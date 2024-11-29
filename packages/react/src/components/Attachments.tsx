import Image from 'components/Image';

import type { Attachment } from 'types';
import { cn } from 'lib/helpers';
import { useLightboxStore } from 'lib/stores';

type AttachmentsProps = {
  parentRef: React.RefObject<HTMLElement>;
  items: Attachment[];
  readonly?: boolean;
  placement?: 'side' | 'bottom';
};

const Attachments = ({ parentRef, items, readonly = false, placement = 'side' }: AttachmentsProps) => {
  const availableHeight = parentRef.current?.clientHeight || 0;
  const max = placement === 'bottom' ? 14 : Math.floor((availableHeight - /* padding */ 10 - /* attachment */ 32) / 16);
  const showLightbox = useLightboxStore((state) => {
    return ((attachments, defaultIndex) => {
      state.show(attachments, defaultIndex);
    }) as typeof state.show;
  });

  if (!items.length) return null;

  return (
    <div
      className={cn(
        'absolute flex',
        placement === 'side' && 'left-[calc(100%-10px)] top-2.5 flex-col [&>*+*]:-mt-4',
        placement === 'bottom' && 'left-2.5 right-2.5 top-[calc(100%-10px)] [&>*+*]:-ml-[15.5px]',
      )}
    >
      {items.slice(0, max).map((attachment, i) => (
        <div
          key={i}
          className={cn(
            'relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-neutral-200 shadow-sm',
            !readonly && 'hover:scale-110',
          )}
          onClick={(e) => {
            e.stopPropagation();
            showLightbox(items, i);
          }}
        >
          <Image container={{ className: 'size-full' }} src={attachment.url} hash={attachment.data.hash} />
        </div>
      ))}
      {items.length > max && (
        <button
          className={cn(
            'relative z-10 flex size-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm',
            !readonly && 'hover:scale-110',
          )}
          onClick={(e) => {
            e.stopPropagation();
            showLightbox(items);
          }}
        >
          {items.length - max}+
        </button>
      )}
    </div>
  );
};

export default Attachments;
