import { useCallback, useMemo, useState } from 'react';
import { Editor, createEditor } from 'slate';
import { Slate, Editable, withReact, type RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';
import isHotkey from 'is-hotkey';

import type { Any } from 'types';
import { cn } from 'lib/helpers';

const HOTKEYS: Record<string, string> = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
};

type TextEditorProps = {
  initialValue: string;
  onChange(value: string): void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
};

export default function TextEditor({ className, initialValue: _initialValue, onChange, onKeyDown }: TextEditorProps) {
  const [initialValue] = useState(() => {
    try {
      return JSON.parse(_initialValue);
    } catch {
      return [
        {
          type: 'paragraph',
          children: [{ text: _initialValue.trim() }],
        },
      ];
    }
  });

  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const renderLeaf = useCallback((props: RenderLeafProps) => <Leaf {...props} />, []);

  return (
    <Slate editor={editor} initialValue={initialValue} onChange={(v) => onChange(JSON.stringify(v))}>
      <Editable
        className={cn('outline-none', className)}
        renderLeaf={renderLeaf}
        spellCheck
        autoFocus
        onKeyDown={(e) => {
          for (const hotkey in HOTKEYS) {
            if (isHotkey(hotkey, e)) {
              e.preventDefault();
              const mark = HOTKEYS[hotkey];

              const marks = Editor.marks(editor) as Any;
              const isMarkActive = marks ? marks[mark] === true : false;

              if (isMarkActive) {
                Editor.removeMark(editor, mark);
              } else {
                Editor.addMark(editor, mark, true);
              }
              return;
            }
          }

          onKeyDown?.(e);
        }}
      />
    </Slate>
  );
}

function Leaf({ attributes, children, leaf }: RenderLeafProps) {
  if ('bold' in leaf) children = <strong>{children}</strong>;
  if ('italic' in leaf) children = <em>{children}</em>;
  if ('underline' in leaf) children = <u>{children}</u>;
  return <span {...attributes}>{children}</span>;
}