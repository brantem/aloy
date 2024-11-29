import { useId, useState } from 'react';
import { thumbHashToDataURL } from 'thumbhash';

import { cn } from 'lib/helpers';

export type ImageProps = Omit<React.ComponentPropsWithoutRef<'img'>, 'style'> & {
  container?: Pick<React.ComponentPropsWithoutRef<'div'>, 'className'>;
  hash?: string;
  objectFit?: React.CSSProperties['objectFit'];
  objectPosition?: React.CSSProperties['objectPosition'];
};

export default function Image({
  container,
  hash,
  objectFit = 'cover',
  objectPosition = 'center',
  ...props
}: ImageProps) {
  const id = useId();

  const [isComplete, setIsComplete] = useState(() => {
    const el = document.getElementById(id);
    return el instanceof HTMLImageElement && !el.classList.contains('opacity-0');
  });

  return (
    <div
      className={cn(container?.className, 'bg-no-repeat')}
      style={{
        ...(hash
          ? {
              backgroundImage: `url('${thumbHashToDataURL(Uint8Array.from(atob(hash), (v) => v.charCodeAt(0)))}')`,
              backgroundSize: objectFit,
              backgroundPosition: objectPosition,
            }
          : {}),
      }}
    >
      <img
        {...props}
        id={id}
        ref={(img) => {
          if (!img) return;

          const handleLoad = () => {
            img.classList.remove('opacity-0');
            setIsComplete(true);
          };

          img.onload = handleLoad;
          if (img.complete) handleLoad();
        }}
        style={{ objectFit, objectPosition }}
        className={cn(props.className, 'size-full transition-opacity', hash ? (isComplete ? '' : 'opacity-0') : '')}
        suppressHydrationWarning={true}
      />
    </div>
  );
}
