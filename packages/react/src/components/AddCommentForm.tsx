import { useRef, useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useSWRConfig } from 'swr';
import isHotkey from 'is-hotkey';

import TextEditor from 'components/TextEditor';

import { useAppStore, usePinStore } from 'lib/stores';

type AddCommentFormProps = {
  pinId: number | null;
};

export default function AddCommentForm({ pinId }: AddCommentFormProps) {
  const { mutate } = useSWRConfig();

  const fetcher = useAppStore((state) => state.fetcher);
  const { tempPin, reset } = usePinStore((state) => ({
    tempPin: state.tempPin,
    reset() {
      setText('');
      state.setTempPin(null);
    },
  }));

  const formRef = useRef<HTMLFormElement>(null);

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
      ref={formRef}
      id="__aloy-add-form"
      className="relative w-full"
      onSubmit={async (e) => {
        e.preventDefault();
        await (pinId ? createComment : createPin)(text.trim()); // lol
        reset();
      }}
    >
      <div className="prose-sm min-h-16 w-full p-2.5">
        <TextEditor
          initialValue=""
          onChange={(v) => setText(v)}
          onKeyDown={(e) => {
            if (!isHotkey('enter', e)) return;
            if (isHotkey('shift+enter', e)) return e.preventDefault(); // shift+enter for new lines in the editor
            formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); // enter to submit the form
          }}
        />
      </div>

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
