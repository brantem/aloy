import { forwardRef } from 'react';

import Image from 'components/Image';

import type { Attachment } from 'types';
import { cn } from 'lib/helpers';

type ThumbsProps = {
  attachments: Attachment[];
  currentIndex: number;
  onClick: (i: number) => void;
};

const Thumbs = forwardRef<HTMLDivElement, ThumbsProps>(function Thumbs({ attachments, currentIndex, onClick }, ref) {
  return (
    <div
      ref={ref}
      className="absolute bottom-0 left-0 right-0 ml-[50%] flex w-screen shrink-0 -translate-x-1/2 snap-x snap-mandatory overflow-x-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {attachments.map((attachment, i) => (
        <div
          key={i}
          className="mr-3 box-content size-16 shrink-0 first:pl-[calc(50vw-88px)] last:mr-0 last:pr-[calc(50vw-88px)]"
        >
          <div
            className={cn(
              'size-full cursor-pointer select-none overflow-hidden rounded-lg',
              i === currentIndex ? 'outline outline-2 outline-offset-4 outline-white' : 'opacity-75',
            )}
            onClick={() => onClick(i)}
          >
            <Image src={attachment.url} hash={attachment.data.hash} objectFit="cover" />
          </div>
        </div>
      ))}
    </div>
  );
});

export default Thumbs;
