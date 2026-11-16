import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { useCreateImageUpload } from "@workspace/api-client-react";
import { isSafeRichUrl, normalizeRichContent } from "@/components/rich-text-content";
import { translateText } from "@/lib/i18n";
import "./rich-text-editor.css";

const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
  }),
  TextAlign.configure({
    types: ["heading", "paragraph", "blockquote"],
    alignments: ["left", "center", "right", "justify"],
  }),
  Image.configure({
    allowBase64: false,
    resize: {
      enabled: true,
      directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
      minWidth: 120,
      minHeight: 80,
      alwaysPreserveAspectRatio: true,
    },
  }),
];

type RichTextEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  surfaceClassName?: string;
};

export function RichTextEditor({
  id,
  value,
  onChange,
  surfaceClassName = "",
}: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageUpload = useCreateImageUpload();
  const onChangeRef = useRef(onChange);
  const lastEmittedValue = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const [headingLevel, setHeadingLevel] = useState("paragraph");
  const [activeAlignment, setActiveAlignment] = useState("left");
  const [activeMarks, setActiveMarks] = useState({ bold: false, italic: false, underline: false, strike: false });
  onChangeRef.current = onChange;

  function syncToolbar(editor: Editor) {
    setHeadingLevel(
      editor.isActive("heading", { level: 1 }) ? "1"
        : editor.isActive("heading", { level: 2 }) ? "2"
          : editor.isActive("heading", { level: 3 }) ? "3"
            : "paragraph",
    );
    setActiveMarks({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
    });
    setActiveAlignment(
      ["center", "right", "justify"].find((alignment) => editor.isActive({ textAlign: alignment })) ?? "left",
    );
  }

  const editor = useEditor({
    extensions: editorExtensions,
    content: normalizeRichContent(value) || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: id ?? "",
        class: `rich-text-editor__surface ${surfaceClassName}`.trim(),
        "aria-label": translateText("Conteúdo"),
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      lastEmittedValue.current = html;
      onChangeRef.current(html);
      syncToolbar(currentEditor);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => syncToolbar(currentEditor),
    onCreate: ({ editor: currentEditor }) => syncToolbar(currentEditor),
  }, []);

  useEffect(() => {
    if (!editor) return;
    if (lastEmittedValue.current === value) {
      lastEmittedValue.current = null;
      return;
    }
    const content = normalizeRichContent(value) || "<p></p>";
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
      syncToolbar(editor);
    }
  }, [editor, value]);

  function setHeading(value: string) {
    if (!editor) return;
    setHeadingLevel(value);
    if (value === "paragraph") editor.chain().focus().setParagraph().run();
    else editor.chain().focus().setHeading({ level: Number(value) as 1 | 2 | 3 }).run();
  }

  function insertLink() {
    if (!editor) return;
    if (editor.state.selection.empty) {
      setMessage("Selecione o texto que será transformado em link.");
      return;
    }
    const address = window.prompt(translateText("Informe um endereço HTTPS"), "https://");
    if (!address) return;
    if (!isSafeRichUrl(address)) {
      setMessage("Informe um endereço HTTPS válido.");
      return;
    }
    setMessage("");
    editor.chain().focus().extendMarkRange("link").setLink({ href: address.trim() }).run();
  }

  async function uploadInlineImage(file: File) {
    setMessage("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Escolha JPG, PNG ou WebP de até 5 MB.");
      return;
    }
    try {
      const signed = await imageUpload.mutateAsync({
        data: {
          fileName: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
          sizeBytes: file.size,
        },
      });
      const response = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("O R2 recusou o envio.");
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Imagem";
      editor?.chain().focus().setImage({ src: signed.publicUrl, alt }).run();
      setMessage("Imagem inserida no conteúdo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    }
  }

  return (
    <div className="rich-text-editor">
      <div className="rich-text-editor__toolbar" role="toolbar" aria-label={translateText("Formatação do conteúdo")}>
        <label className="sr-only" htmlFor={id ? `${id}-heading` : undefined}>{translateText("Nível do título")}</label>
        <select
          aria-label={translateText("Nível do título")}
          className="rich-text-editor__format-select"
          disabled={!editor}
          id={id ? `${id}-heading` : undefined}
          onChange={(event) => setHeading(event.target.value)}
          value={headingLevel}
        >
          <option value="paragraph">{translateText("Texto normal")}</option>
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
        </select>
        <span className="rich-text-editor__divider" aria-hidden="true" />
        <ToolbarButton label="Negrito" pressed={activeMarks.bold} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={16} /></ToolbarButton>
        <ToolbarButton label="Itálico" pressed={activeMarks.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolbarButton>
        <ToolbarButton label="Sublinhado" pressed={activeMarks.underline} onClick={() => editor?.chain().focus().toggleUnderline().run()}><Underline size={16} /></ToolbarButton>
        <ToolbarButton label="Tachado" pressed={activeMarks.strike} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></ToolbarButton>
        <span className="rich-text-editor__divider" aria-hidden="true" />
        <ToolbarButton label="Lista com marcadores" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={16} /></ToolbarButton>
        <ToolbarButton label="Lista numerada" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></ToolbarButton>
        <ToolbarButton label="Citação" onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolbarButton>
        <span className="rich-text-editor__divider" aria-hidden="true" />
        <ToolbarButton label="Alinhar à esquerda" pressed={activeAlignment === "left"} onClick={() => editor?.chain().focus().setTextAlign("left").run()}><AlignLeft size={16} /></ToolbarButton>
        <ToolbarButton label="Centralizar texto" pressed={activeAlignment === "center"} onClick={() => editor?.chain().focus().setTextAlign("center").run()}><AlignCenter size={16} /></ToolbarButton>
        <ToolbarButton label="Alinhar à direita" pressed={activeAlignment === "right"} onClick={() => editor?.chain().focus().setTextAlign("right").run()}><AlignRight size={16} /></ToolbarButton>
        <ToolbarButton label="Justificar texto" pressed={activeAlignment === "justify"} onClick={() => editor?.chain().focus().setTextAlign("justify").run()}><AlignJustify size={16} /></ToolbarButton>
        <span className="rich-text-editor__divider" aria-hidden="true" />
        <ToolbarButton label="Inserir link" onClick={insertLink}><Link2 size={16} /></ToolbarButton>
        <span className="rich-text-editor__divider" aria-hidden="true" />
        <ToolbarButton
          label={imageUpload.isPending ? "Enviando imagem" : "Inserir imagem"}
          disabled={imageUpload.isPending || !editor}
          onClick={() => imageInputRef.current?.click()}
        >
          <ImagePlus size={16} />
        </ToolbarButton>
        <ToolbarButton label="Desfazer" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={16} /></ToolbarButton>
        <ToolbarButton label="Refazer" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={16} /></ToolbarButton>
      </div>

      <EditorContent editor={editor} />
      <input
        ref={imageInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void uploadInlineImage(file);
          event.currentTarget.value = "";
        }}
        type="file"
      />
      <div className="rich-text-editor__footer">
        <p>{translateText("Use os controles para alinhar o texto. Selecione uma imagem e arraste um canto para redimensioná-la.")}</p>
      </div>
      {imageUpload.isPending && <p className="mt-2 text-xs text-muted-foreground" role="status">{translateText("Enviando imagem…")}</p>}
      {message && <p className="mt-2 text-xs text-[#233a59]" role="status">{translateText(message)}</p>}
    </div>
  );
}

function ToolbarButton({
  label,
  children,
  onClick,
  disabled = false,
  pressed = false,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      aria-label={translateText(label)}
      aria-pressed={pressed}
      className="rich-text-editor__tool"
      disabled={disabled}
      onClick={onClick}
      title={translateText(label)}
      type="button"
    >
      {children}
    </button>
  );
}
