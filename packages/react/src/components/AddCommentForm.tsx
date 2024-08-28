import { useState } from 'react';
import Textarea from 'react-textarea-autosize';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

import { usePinStore } from 'lib/stores';

type AddCommentFormProps = {
  pinId: number | null;
  shouldAutoFocus?: boolean;
};

export default function AddCommentForm({ pinId, shouldAutoFocus }: AddCommentFormProps) {
  const { tempPin, done } = usePinStore((state) => ({
    tempPin: state.tempPin,
    done: () => {
      setText('');
      state.setTempPin(null);
    },
  }));

  const [text, setText] = useState('');

  const createPin = async (text: string) => {
    if (!text) return;
    console.log('POST', { _path: window.location.pathname, ...tempPin, text });
    // TODO: refresh pins
  };

  const createComment = async (text: string) => {
    if (!text) return;
    console.log('POST', pinId, { text });
    // TODO: refresh comments
  };

  return (
    <form
      id="__aloy-add-form"
      className="relative w-full"
      onSubmit={async (e) => {
        e.preventDefault();
        await (pinId ? createComment : createPin)(text.trim()); // lol
        done();
      }}
    >
      <Textarea
        className="w-full resize-none p-2.5 text-sm outline-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus={shouldAutoFocus}
        minRows={3}
      />
      <div className="flex items-center justify-end p-1.5">
        <button
          className="hover:be-neutral-50 flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-50 hover:text-neutral-500"
          type="submit"
        >
          <PaperAirplaneIcon className="size-5" />
        </button>
      </div>
    </form>
  );
}
