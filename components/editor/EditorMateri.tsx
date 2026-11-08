
"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { supabase } from "@/lib/supabase";

const BUCKET_GAMBAR = "gambar-materi";
const MAKS_GAMBAR = 5 * 1024 * 1024;

type EditorMateriProps = {
  konten?: any;
  onChange: (konten: any) => void;
};

function simpanKonten(data: any): any {
  if (!data) return data;

  const hasil = JSON.parse(JSON.stringify(data));

  function proses(node: any) {
    if (node.type === "image" && node.attrs?.storagePath) {
      node.attrs.src = node.attrs.storagePath;
    }

    node.content?.forEach(proses);
  }

  proses(hasil);
  return hasil;
}

async function tampilkanKonten(data: any): Promise<any> {
  if (!data) return data;

  const hasil = JSON.parse(JSON.stringify(data));

  async function proses(node: any): Promise<void> {
    if (node.type === "image" && node.attrs?.storagePath) {
      const { data: urlData, error } = await supabase.storage
        .from(BUCKET_GAMBAR)
        .createSignedUrl(node.attrs.storagePath, 3600);

      if (!error && urlData?.signedUrl) {
        node.attrs.src = urlData.signedUrl;
      }
    }

    if (node.content) {
      await Promise.all(node.content.map(proses));
    }
  }

  await proses(hasil);
  return hasil;
}

const GambarMateri = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),

      storagePath: {
        default: null,
      },

      width: {
        default: "100%",
      },

      align: {
        default: "center",
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const width = HTMLAttributes.width || "100%";
    const align = HTMLAttributes.align || "center";

    const margin =
      align === "left"
        ? "0 auto 0 0"
        : align === "right"
          ? "0 0 0 auto"
          : "0 auto";

    return [
      "img",
      {
        ...HTMLAttributes,
        style: `width:${width};display:block;margin:${margin};height:auto;`,
      },
    ];
  },
});

const PasteGambar = Extension.create({
  name: "pasteGambar",
});

export default function EditorMateri({
  konten,
  onChange,
}: EditorMateriProps) {
  const [mengunggah, setMengunggah] = useState(false);
  const [pesan, setPesan] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      GambarMateri.configure({
        inline: false,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      PasteGambar,
    ],

    content: "<p>Mulai tulis materi pembelajaran di sini...</p>",

    immediatelyRender: false,

    onUpdate({ editor }) {
      onChange(simpanKonten(editor.getJSON()));
    },

    editorProps: {
      attributes: {
        class:
          "min-h-[350px] p-4 focus:outline-none prose max-w-none",
      },

      handlePaste(view, event) {
        const items = event.clipboardData?.items;

        if (!items) return false;

        let file: File | null = null;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith("image/")) {
            file = items[i].getAsFile();
            break;
          }
        }

        if (!file) return false;

        event.preventDefault();

        const fileGambar = file;
        const posisiAwal = view.state.selection.from;

        void (async () => {
          let path: string | null = null;

          try {
            setMengunggah(true);
            setPesan("");

            if (fileGambar.size > MAKS_GAMBAR) {
              throw new Error("Ukuran gambar maksimal 5 MB.");
            }

            const tipeDiizinkan = [
              "image/jpeg",
              "image/png",
              "image/webp",
            ];

            if (!tipeDiizinkan.includes(fileGambar.type)) {
              throw new Error("Gambar harus JPG, PNG, atau WebP.");
            }

            const { data: sesiData, error: sesiError } =
              await supabase.auth.getUser();

            if (sesiError || !sesiData.user) {
              throw new Error(
                "Sesi login tidak ditemukan. Silakan login kembali."
              );
            }

            const ekstensi =
              fileGambar.type === "image/png"
                ? "png"
                : fileGambar.type === "image/webp"
                  ? "webp"
                  : "jpg";

            path = `${sesiData.user.id}/materi-${Date.now()}.${ekstensi}`;

            const { error: uploadError } = await supabase.storage
              .from(BUCKET_GAMBAR)
              .upload(path, fileGambar, {
                contentType: fileGambar.type,
                upsert: false,
              });

            if (uploadError) {
              throw new Error(uploadError.message);
            }

            const { data: urlData, error: urlError } =
              await supabase.storage
                .from(BUCKET_GAMBAR)
                .createSignedUrl(path, 3600);

            if (urlError || !urlData?.signedUrl) {
              throw new Error("Gagal membuat alamat gambar.");
            }

            if (view.isDestroyed) {
              await supabase.storage
                .from(BUCKET_GAMBAR)
                .remove([path]);
              return;
            }

            const node = view.state.schema.nodes.image.create({
              src: urlData.signedUrl,
              alt: fileGambar.name,
              title: fileGambar.name,
              storagePath: path,
              width: "100%",
              align: "center",
            });

            const posisi = Math.min(
              posisiAwal,
              view.state.doc.content.size
            );

            view.dispatch(view.state.tr.insert(posisi, node));

            setPesan("Gambar berhasil dimasukkan.");
          } catch (error) {
            if (path) {
              await supabase.storage
                .from(BUCKET_GAMBAR)
                .remove([path]);
            }

            setPesan(
              error instanceof Error
                ? error.message
                : "Gagal memasukkan gambar."
            );
          } finally {
            setMengunggah(false);
          }
        })();

        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor || !konten) return;

    let aktif = true;

    async function muatKonten() {
      if (!editor) return;

      const kontenEditor = simpanKonten(editor.getJSON());
      const kontenBaru = simpanKonten(konten);

      if (
        JSON.stringify(kontenEditor) ===
        JSON.stringify(kontenBaru)
      ) {
        return;
      }

      const hasil = await tampilkanKonten(konten);

      if (aktif) {
        editor.commands.setContent(hasil);
      }
    }

    void muatKonten();

    return () => {
      aktif = false;
    };
  }, [editor, konten]);

  if (!editor) {
    return <p>Menyiapkan editor...</p>;
  }

  function tombol(
    label: string,
    aksi: () => void,
    aktif = false
  ) {
    return (
      <button
        type="button"
        onClick={aksi}
        aria-pressed={aktif}
        className={`rounded border px-3 py-2 text-sm font-medium transition-colors ${
          aktif
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        }`}
      >
        {label}
      </button>
    );
  }

  function ubahUkuran(ukuran: string) {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .updateAttributes("image", {
        width: ukuran,
      })
      .run();
  }

  function ubahPosisi(posisi: string) {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .updateAttributes("image", {
        align: posisi,
      })
      .run();
  }

  const gambarDipilih = editor.isActive("image");

  const atributGambar = editor.getAttributes("image");

  const ukuranAktif = atributGambar.width || "100%";
  const posisiAktif = atributGambar.align || "center";

  function aturTautan() {
    if (!editor) return;

    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = window.prompt("Masukkan alamat tautan:");

    if (!url) return;

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      {/* TOOLBAR FORMAT TEKS */}
      <div className="flex flex-wrap gap-2 border-b bg-slate-50 p-3">
        {tombol(
          "B",
          () => editor.chain().focus().toggleBold().run(),
          editor.isActive("bold")
        )}

        {tombol(
          "I",
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive("italic")
        )}

        {tombol(
          "H2",
          () =>
            editor.chain().focus().toggleHeading({ level: 2 }).run(),
          editor.isActive("heading", { level: 2 })
        )}

        {tombol(
          "H3",
          () =>
            editor.chain().focus().toggleHeading({ level: 3 }).run(),
          editor.isActive("heading", { level: 3 })
        )}

        {tombol(
          "Daftar",
          () => editor.chain().focus().toggleBulletList().run(),
          editor.isActive("bulletList")
        )}

        {tombol(
          "Nomor",
          () => editor.chain().focus().toggleOrderedList().run(),
          editor.isActive("orderedList")
        )}

        {tombol(
          editor.isActive("link") ? "Hapus Tautan" : "Tautan",
          aturTautan,
          editor.isActive("link")
        )}
      </div>

      {/* TOOLBAR GAMBAR */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50 p-3">
        <span className="text-sm font-medium text-slate-600">
          Pengaturan gambar:
        </span>

        {tombol(
          "Kecil 25%",
          () => ubahUkuran("25%"),
          gambarDipilih && ukuranAktif === "25%"
        )}

        {tombol(
          "Sedang 50%",
          () => ubahUkuran("50%"),
          gambarDipilih && ukuranAktif === "50%"
        )}

        {tombol(
          "Besar 75%",
          () => ubahUkuran("75%"),
          gambarDipilih && ukuranAktif === "75%"
        )}

        {tombol(
          "Penuh 100%",
          () => ubahUkuran("100%"),
          gambarDipilih && ukuranAktif === "100%"
        )}

        <span className="mx-1 text-slate-300">|</span>

        {tombol(
          "Kiri",
          () => ubahPosisi("left"),
          gambarDipilih && posisiAktif === "left"
        )}

        {tombol(
          "Tengah",
          () => ubahPosisi("center"),
          gambarDipilih && posisiAktif === "center"
        )}

        {tombol(
          "Kanan",
          () => ubahPosisi("right"),
          gambarDipilih && posisiAktif === "right"
        )}
      </div>

      {/* AREA EDITOR */}
      <EditorContent editor={editor} />

      {/* PESAN DAN PETUNJUK */}
      <div className="border-t bg-slate-50 p-3">
        {mengunggah && (
          <p className="text-sm text-blue-600">
            Sedang mengunggah gambar...
          </p>
        )}

        {pesan && (
          <p className="text-sm text-slate-600">
            {pesan}
          </p>
        )}

        <p className="mt-2 text-xs text-slate-500">
          Tips: Salin gambar lalu tekan Ctrl + V di area editor.
          Klik gambar untuk memilihnya, kemudian atur ukuran dan
          posisi menggunakan tombol di atas.
        </p>
      </div>
    </div>
  );
}
