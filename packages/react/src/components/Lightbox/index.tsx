import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import Image from 'components/Image';
import Thumbs from './Thumbs';

import { useLightboxStore } from 'lib/stores';
import { useKeyDown } from 'lib/hooks';

export default function Lightbox() {
  const thumbsRef = useRef<HTMLDivElement>(null);
  const { attachments, isOpen, hide, index, setIndex } = useLightboxStore();

  useKeyDown((e) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        hide();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (index === 0) return;
        setIndex(index - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (index === attachments.length - 1) return;
        setIndex(index + 1);
        break;
    }
  });

  useEffect(() => {
    if (!thumbsRef.current) return;
    const el = thumbsRef.current.querySelector(`div:nth-child(${index + 1}`);
    if (!el) return;
    el.scrollIntoView({ inline: 'center' });
  }, [index]);

  if (!isOpen) return null;

  const attachment = attachments[index];

  return createPortal(
    <div id="__aloy-lightbox" className="fixed inset-0 z-[1005]" aria-hidden="true">
      <div className="relative size-full rounded-lg bg-black/75">
        <button
          className="absolute right-4 top-4 flex size-12 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/20"
          onClick={hide}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {index > 0 && (
          <button
            className="absolute left-4 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/20"
            onClick={() => setIndex(index - 1)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}

        <div className="mx-auto flex h-[calc(100%-64px-32px)] w-[calc(100%-80px*2)] select-none items-center justify-center py-4">
          <Image
            container={{ className: 'max-h-full max-w-full' }}
            src={attachment.url}
            hash={attachment.data.hash}
            objectFit="contain"
          />
        </div>

        {index !== attachments.length - 1 && (
          <button
            className="absolute right-4 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/20"
            onClick={() => setIndex(index + 1)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}

        <Thumbs ref={thumbsRef} attachments={attachments} currentIndex={index} onClick={(i) => setIndex(i)} />
      </div>
    </div>,
    document.body,
  );
}
