import { useState } from 'react';
import Textarea from 'react-textarea-autosize';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useSWRConfig } from 'swr';

import { useAppStore, usePinStore } from 'lib/stores';

type AddCommentFormProps = {
  pinId: number | null;
  shouldAutoFocus?: boolean;
};

// TODO: not autofocus

export default function AddCommentForm({ pinId, shouldAutoFocus }: AddCommentFormProps) {
  const { mutate } = useSWRConfig();

  const fetcher = useAppStore((state) => state.fetcher);
  const { tempPin, reset } = usePinStore((state) => ({
    tempPin: state.tempPin,
    reset() {
      setText('');
      state.setTempPin(null);
    },
  }));

  const [text, setText] = useState('');

  const createPin = async (text: string) => {
    if (!text) return;
    const res = await fetcher('/v1/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _path: window.location.pathname, ...tempPin, text }),
    });
    if (!res.ok) return;
    mutate(`/v1/pins?_path=${window.location.pathname}`);
  };

  const createComment = async (text: string) => {
    if (!text) return;
    const res = await fetcher(`/v1/pins/${pinId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    mutate(`/v1/pins/${pinId}/comments`);
  };

  return (
    <form
      id="__aloy-add-form"
      className="relative w-full"
      onSubmit={async (e) => {
        e.preventDefault();
        await (pinId ? createComment : createPin)(text.trim()); // lol
        reset();
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
