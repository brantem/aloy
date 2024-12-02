import { useEffect, useRef, useState } from 'react';
import { PhotoIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useSWRConfig } from 'swr';
import isHotkey from 'is-hotkey';

import TextEditor, { type TextEditorHandle } from 'components/TextEditor';
import Attachments from './Attachments';

import type { Comment } from 'types';
import { useAppStore, usePinStore } from 'lib/stores';
import { useActions } from 'lib/hooks';
import { cn, formatBytes } from 'lib/helpers';

type SaveCommentFormProps = {
  pinId: number | null;
  comment?: Comment;
};

type FileWithPreview = File & {
  preview: string;
};

export default function SaveCommentForm({ pinId, comment }: SaveCommentFormProps) {
  const { mutate } = useSWRConfig();

  const formRef = useRef<HTMLFormElement>(null);
  const textEditorRef = useRef<TextEditorHandle>(null);

  const { tempPin, reset } = usePinStore((state) => ({
    tempPin: state.tempPin,
    reset() {
      setText('');
      textEditorRef.current?.reset();
      state.setSelectedCommentId(0);
      state.setTempPin(null);
    },
  }));
  const actions = useActions();

  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<FileWithPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => () => attachments.forEach((file) => URL.revokeObjectURL(file.preview)), [attachments]); // release

  return (
    <form
      ref={formRef}
      id="__aloy-add-form"
      className="relative w-full"
      onSubmit={async (e) => {
        e.preventDefault();

        if (!text) return;

        setIsSubmitting(true);
        if (comment) {
          // TODO: support attachments
          await actions.updateComment(comment.id, text.trim(), async () => mutate(`/v1/pins/${pinId}/comments`));
        } else {
          const body = new FormData();
          body.set('text', text.trim());
          attachments.forEach((attachment) => body.append('attachments', attachment));

          if (pinId) {
            await actions.createComment(pinId, body, () => mutate(`/v1/pins/${pinId}/comments`));
          } else if (tempPin) {
            await actions.createPin(tempPin, body, () => mutate(`/v1/pins?_path=${window.location.pathname}`));
          }
        }
        reset();
        setAttachments((prev) => {
          prev.forEach((file) => URL.revokeObjectURL(file.preview));
          return [];
        }); // release and reset
        setIsSubmitting(false);
      }}
    >
      <TextEditor
        className="prose-sm min-h-16 w-full p-3"
        ref={textEditorRef}
        initialValue={comment ? comment.text : ''}
        onChange={(v) => setText(v)}
        onKeyDown={(e) => {
          if (!isHotkey('enter', e)) return;
          if (isHotkey('shift+enter', e)) return e.preventDefault(); // shift+enter for new lines in the editor
          formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); // enter to submit the form
        }}
      />

      <Attachments
        className="px-3"
        items={attachments.map((file) => ({ url: file.preview, data: { type: file.type } }))}
        // TODO: should be deletable
      />

      <div className="flex items-center justify-between p-1.5">
        {comment ? (
          <div />
        ) : (
          <AddAttachments items={attachments} onChange={(files) => setAttachments(files)} isSubmitting={isSubmitting} />
        )}

        {isSubmitting ? (
          <div className="flex h-8 w-full items-center justify-end pr-1.5">
            <span className="text-xs text-neutral-400">Submitting...</span>
          </div>
        ) : (
          <button
            className="hover:be-neutral-50 flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-50 hover:text-neutral-500"
            type="submit"
          >
            <PaperAirplaneIcon className="size-5" />
          </button>
        )}
      </div>
    </form>
  );
}

type AddAttachmentsProps = {
  items: FileWithPreview[];
  onChange(files: FileWithPreview[]): void;
  isSubmitting: boolean;
};

function AddAttachments({ items, onChange, isSubmitting }: AddAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const config = useAppStore((state) => state.config);

  const [error, setError] = useState('');

  if (!isSubmitting) return null;

  const canAdd = items.length < config.attachment.maxCount;

  return (
    <label className="flex items-center gap-2">
      {canAdd ? (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={config.attachment.supportedTypes.join(',')}
            className="hidden"
            onChange={(e) => {
              if (!e.target.files || !e.target.files.length) return;

              const raw = Array.from(e.target.files).filter((file) => file.size <= config.attachment.maxSize);
              if (raw.length < e.target.files.length) {
                if (!raw.length) return setError('Invalid files');
                return setError('Some files are invalid');
              }

              if (items.length) {
                const available = config.attachment.maxCount - items.length;
                if (raw.length > available) return setError('Too many files');
              } else if (raw.length > config.attachment.maxCount) {
                return setError('Too many files');
              }
              const files = raw.map((file) => Object.assign(file, { preview: URL.createObjectURL(file) }));

              onChange([...items, ...files]);
            }}
          />
          <button
            className="hover:be-neutral-50 flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-50 hover:text-neutral-500"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <PhotoIcon className="size-5" />
          </button>
        </>
      ) : null}

      {error ? (
        <span
          ref={() => setTimeout(() => setError(''), 2000)}
          className={cn('text-xs text-red-400', !canAdd && 'pl-1.5')}
        >
          {error}
        </span>
      ) : canAdd ? (
        <span className="text-xs text-neutral-400">
          Max: {config.attachment.maxCount} files, {formatBytes(config.attachment.maxSize)} each
        </span>
      ) : null}
    </label>
  );
}
