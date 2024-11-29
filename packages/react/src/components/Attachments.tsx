import Image from 'components/Image';

import type { Attachment } from 'types';
import { cn } from 'lib/helpers';
import { useLightboxStore } from 'lib/stores';

type AttachmentsProps = {
  items: Attachment[];
  isReadonly?: boolean;
};

const Attachments = ({ items, isReadonly = false }: AttachmentsProps) => {
  const showLightbox = useLightboxStore((state) => {
    return ((attachments, defaultIndex) => {
      state.show(attachments, defaultIndex);
    }) as typeof state.show;
  });

  if (!items.length) return null;

  return (
    <div className="mt-2 grid grid-cols-7 justify-between gap-1">
      {items.map((attachment, i) => (
        <div
          key={i}
          className={cn(
            'aspect-square cursor-pointer overflow-hidden rounded-md border border-neutral-200 shadow-sm',
            !isReadonly && 'hover:scale-110',
          )}
          onClick={(e) => {
            if (isReadonly) return;
            e.stopPropagation();
            showLightbox(items, i);
          }}
        >
          <Image src={attachment.url} hash={attachment.data.hash} />
        </div>
      ))}
    </div>
  );
};

export default Attachments;
