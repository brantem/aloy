import { useRef, useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useSWRConfig } from 'swr';
import isHotkey from 'is-hotkey';

import TextEditor, { type TextEditorHandle } from 'components/TextEditor';

import { usePinStore } from 'lib/stores';
import { useActions } from 'lib/hooks';

type AddCommentFormProps = {
  pinId: number | null;
};

export default function AddCommentForm({ pinId }: AddCommentFormProps) {
  const { mutate } = useSWRConfig();

  const formRef = useRef<HTMLFormElement>(null);
  const textEditorRef = useRef<TextEditorHandle>(null);

  const { tempPin, reset } = usePinStore((state) => ({
    tempPin: state.tempPin,
    reset() {
      setText('');
      textEditorRef.current?.reset();
      state.setTempPin(null);
    },
  }));
  const actions = useActions();

  const [text, setText] = useState('');

  return (
    <form
      ref={formRef}
      id="__aloy-add-form"
      className="relative w-full"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pinId) {
          await actions.createComment(pinId, text.trim(), () => mutate(`/v1/pins/${pinId}/comments`));
        } else if (tempPin) {
          await actions.createPin(tempPin, text.trim(), () => mutate(`/v1/pins?_path=${window.location.pathname}`));
        }
        reset();
      }}
    >
      <TextEditor
        className="prose-sm min-h-16 w-full p-2.5"
        ref={textEditorRef}
        onChange={(v) => setText(v)}
        onKeyDown={(e) => {
          if (!isHotkey('enter', e)) return;
          if (isHotkey('shift+enter', e)) return e.preventDefault(); // shift+enter for new lines in the editor
          formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); // enter to submit the form
        }}
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
