import type { Attachment } from 'types';
import { cn } from 'lib/helpers';
import { useLightboxStore } from 'lib/stores';

type AttachmentsProps = {
  items: Attachment[];
  readonly?: boolean;
  placement?: 'side' | 'bottom';
  availableHeight: number;
};

const Attachments = ({ items, readonly = false, placement = 'side', availableHeight }: AttachmentsProps) => {
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
            'relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-neutral-200 bg-cover bg-center shadow-sm',
            !readonly && 'hover:scale-110',
          )}
          onClick={(e) => {
            e.stopPropagation();
            showLightbox(items, i);
          }}
          style={{ backgroundImage: `url('${attachment.url}')` }}
        />
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