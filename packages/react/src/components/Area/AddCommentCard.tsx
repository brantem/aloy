import { createPortal } from 'react-dom';

import AddCommentForm from 'components/AddCommentForm';

import type { PinPosition } from 'types';
import { usePinPosition } from 'lib/hooks';

const AddCommentCard = ({ p }: { p: PinPosition }) => {
  const position = usePinPosition(p);
  if (!position) return null;

  return createPortal(
    <div
      id="__aloy-add"
      className="absolute z-[1003] flex w-72 flex-col items-center justify-center overflow-hidden rounded-lg rounded-tl-none border border-neutral-200 bg-white shadow-sm"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <AddCommentForm pinId={null} shouldAutoFocus />
    </div>,
    document.body,
  );
};

export default AddCommentCard;
