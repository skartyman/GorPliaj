import { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

function Toolbar({ editor }) {
  if (!editor) return null;

  const tools = [
    { label: 'B', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), style: { fontWeight: 700 } },
    { label: 'I', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), style: { fontStyle: 'italic' } },
    { label: 'S', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), style: { textDecoration: 'line-through' } },
    { label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    { label: 'H3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
    { label: '•', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
    { label: '1.', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
    { label: '"', action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
    { label: '⎯', action: () => editor.chain().focus().setHorizontalRule().run(), active: false }
  ];

  return (
    <div className="rich-editor-toolbar">
      {tools.map((tool) => (
        <button
          key={tool.label}
          type="button"
          className={`rich-editor-btn ${tool.active ? 'active' : ''}`}
          onClick={tool.action}
          style={tool.style}
        >
          {tool.label}
        </button>
      ))}
    </div>
  );
}

export default function RichEditor({ value = '', onChange, placeholder = '' }) {
  const prevValueRef = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder })
    ],
    content: value,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      if (html !== prevValueRef.current) {
        prevValueRef.current = html;
        onChange?.(html);
      }
    }
  });

  const setContent = useCallback((html) => {
    if (editor && html !== prevValueRef.current && html !== editor.getHTML()) {
      prevValueRef.current = html;
      editor.commands.setContent(html, false);
    }
  }, [editor]);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setContent(value);
    }
  }, [value, setContent]);

  useEffect(() => {
    return () => editor?.destroy();
  }, [editor]);

  return (
    <div className="rich-editor">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="rich-editor-content" />
    </div>
  );
}
