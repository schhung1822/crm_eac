"use client";

import * as React from "react";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Autoformat,
  BlockQuote,
  Bold,
  ClassicEditor,
  CodeBlock,
  Essentials,
  GeneralHtmlSupport,
  Heading,
  HorizontalLine,
  Image,
  ImageCaption,
  ImageInsert,
  ImageInsertViaUrl,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Italic,
  Link,
  List,
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  SourceEditing,
  Strikethrough,
  Table,
  TableToolbar,
  Underline,
  type Editor,
  type EditorConfig,
} from "ckeditor5";
import viTranslations from "ckeditor5/translations/vi.js";

export type CkeditorContentEditorProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

type UploadAdapter = {
  abort: () => void;
  upload: () => Promise<{ default: string }>;
};

type UploadLoader = {
  file: Promise<File | null>;
};

class NewsContentImageUploadAdapter implements UploadAdapter {
  private readonly abortController = new AbortController();

  constructor(private readonly loader: UploadLoader) {}

  abort() {
    this.abortController.abort();
  }

  async upload(): Promise<{ default: string }> {
    const file = await this.loader.file;

    if (!(file instanceof File)) {
      throw new Error("Khong the doc file anh de tai len");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/srx/news/upload", {
      method: "POST",
      body: formData,
      signal: this.abortController.signal,
    });

    const result = (await response.json().catch(() => null)) as { message?: string; url?: string } | null;

    if (!response.ok || !result?.url) {
      throw new Error(result?.message ?? "Khong the tai anh trong noi dung bai viet");
    }

    return {
      default: result.url,
    };
  }
}

function attachNewsContentUploadAdapter(editor: Editor) {
  const fileRepository = editor.plugins.get("FileRepository") as {
    createUploadAdapter?: (loader: UploadLoader) => UploadAdapter;
  };

  fileRepository.createUploadAdapter = (loader) => new NewsContentImageUploadAdapter(loader);
}

const baseConfig = {
  extraPlugins: [attachNewsContentUploadAdapter],
  htmlSupport: {
    allow: [{ attributes: true, classes: true, name: /.*/, styles: true }],
  },
  image: {
    toolbar: [
      "toggleImageCaption",
      "imageTextAlternative",
      "|",
      "imageStyle:inline",
      "imageStyle:block",
      "imageStyle:side",
      "|",
      "resizeImage",
    ],
  },
  list: {
    properties: { reversed: true, startIndex: true, styles: true },
  },
  plugins: [
    Autoformat,
    BlockQuote,
    Bold,
    CodeBlock,
    Essentials,
    GeneralHtmlSupport,
    Heading,
    HorizontalLine,
    Image,
    ImageCaption,
    ImageInsert,
    ImageInsertViaUrl,
    ImageResize,
    ImageStyle,
    ImageToolbar,
    ImageUpload,
    Italic,
    Link,
    List,
    Paragraph,
    PasteFromOffice,
    RemoveFormat,
    SourceEditing,
    Strikethrough,
    Table,
    TableToolbar,
    Underline,
  ],
  table: {
    contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
  },
  toolbar: {
    items: [
      "undo",
      "redo",
      "|",
      "heading",
      "|",
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "removeFormat",
      "|",
      "link",
      "bulletedList",
      "numberedList",
      "|",
      "insertImage",
      "insertTable",
      "blockQuote",
      "codeBlock",
      "horizontalLine",
      "|",
      "sourceEditing",
    ],
    shouldNotGroupWhenFull: false,
  },
  translations: [viTranslations],
} satisfies EditorConfig;

export function CkeditorContentEditor({
  disabled = false,
  onChange,
  placeholder = "Nhập nội dung bài viết",
  value,
}: CkeditorContentEditorProps) {
  const editorReference = React.useRef<ClassicEditor | null>(null);

  const config = React.useMemo(
    () =>
      ({
        ...baseConfig,
        language: "vi",
        licenseKey: process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY ?? "GPL",
        placeholder,
      }) satisfies EditorConfig,
    [placeholder],
  );

  React.useEffect(() => {
    const editor = editorReference.current;

    if (!editor) {
      return;
    }

    if (editor.getData() !== value) {
      void editor.setData(value);
    }
  }, [value]);

  return (
    <div className={disabled ? "srx-ckeditor is-disabled" : "srx-ckeditor"}>
      <div className="srx-ckeditor-shell">
        <CKEditor
          editor={ClassicEditor}
          config={config}
          data={value}
          disabled={disabled}
          onChange={(_, editor) => {
            onChange(editor.getData());
          }}
          onReady={(editor) => {
            editorReference.current = editor;
          }}
        />
      </div>
    </div>
  );
}
