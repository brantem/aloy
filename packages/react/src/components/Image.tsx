import { thumbHashToDataURL } from 'thumbhash';

import { cn } from 'lib/helpers';

export type ImageProps = Omit<React.ComponentPropsWithoutRef<'img'>, 'style'> & {
  hash?: string;
  objectFit?: React.CSSProperties['objectFit'];
  objectPosition?: React.CSSProperties['objectPosition'];
};

export default function Image({ hash, objectFit = 'cover', objectPosition = 'center', ...props }: ImageProps) {
  return (
    <div
      className="size-full bg-no-repeat"
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
        ref={(img) => {
          if (!img) return;
          img.onload = () => img.classList.remove('opacity-0');
        }}
        style={{ objectFit, objectPosition }}
        className={cn(props.className, 'size-full transition-opacity', hash ? 'opacity-0' : '')}
        suppressHydrationWarning={true}
      />
    </div>
  );
}
