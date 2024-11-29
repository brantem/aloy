import Image from 'components/Image';

import type { Attachment } from 'types';
import { useLightboxStore } from 'lib/stores';

type AttachmentsProps = {
  items: Attachment[];
};

const Attachments = ({ items }: AttachmentsProps) => {
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
          className="aspect-square cursor-pointer overflow-hidden rounded-md border border-neutral-200 shadow-sm hover:scale-110"
          onClick={() => showLightbox(items, i)}
        >
          <Image src={attachment.url} hash={attachment.data.hash} />
        </div>
      ))}
    </div>
  );
};

export default Attachments;
