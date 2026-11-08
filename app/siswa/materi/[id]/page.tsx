
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import { supabase } from "@/lib/supabase";

const BUCKET_GAMBAR = "gambar-materi";

type Materi = {
  id: number;
  judul: string;
  kategori: string;
  deskripsi: string | null;
  gambar_url: string | null;
  video_url: string | null;
  link_url: string | null;
  file_url: string | null;
  file_nama: string | null;
  konten: any | null;
};

function ubahKeEmbedYouTube(url: string): string | null {
  try {
    const alamat = new URL(url);
    let videoId = "";

    if (
      alamat.hostname === "youtu.be" ||
      alamat.hostname === "www.youtu.be"
    ) {
      videoId = alamat.pathname.split("/").filter(Boolean)[0] || "";
    } else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
      ].includes(alamat.hostname)
    ) {
      if (alamat.pathname === "/watch") {
        videoId = alamat.searchParams.get("v") || "";
      } else if (
        alamat.pathname.startsWith("/embed/") ||
        alamat.pathname.startsWith("/shorts/")
      ) {
        videoId = alamat.pathname.split("/")[2] || "";
      }
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function alamatAman(url: string | null): string | null {
  if (!url?.trim()) return null;

  try {
    const alamat = new URL(url);

    if (
      alamat.protocol === "https:" ||
      alamat.protocol === "http:"
    ) {
      return alamat.href;
    }

    return null;
  } catch {
    return null;
  }
}

async function buatUrlFile(
  bucket: string,
  lokasi: string | null
): Promise<string | null> {
  if (!lokasi?.trim()) return null;

  const urlLangsung = alamatAman(lokasi);

  if (urlLangsung) return urlLangsung;

  const path = lokasi.startsWith(`${bucket}/`)
    ? lokasi.slice(bucket.length + 1)
    : lokasi;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    console.error("Gagal membuat URL file:", error.message);
    return null;
  }

  return data.signedUrl;
}

async function siapkanKonten(data: any): Promise<any> {
  if (!data) return null;

  const hasil = JSON.parse(JSON.stringify(data));

  async function proses(node: any): Promise<void> {
    if (node.type === "image" && node.attrs?.storagePath) {
      const { data: urlData, error } = await supabase.storage
        .from(BUCKET_GAMBAR)
        .createSignedUrl(node.attrs.storagePath, 60 * 60);

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

function TampilanKontenMateri({
  konten,
}: {
  konten: any;
}) {
  const [memuatKonten, setMemuatKonten] = useState(true);
  const [kontenSiap, setKontenSiap] = useState<any>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      GambarMateri.configure({
        inline: false,
        allowBase64: false,
      }),
      LinkExtension.configure({
        openOnClick: true,
        autolink: true,
      }),
    ],
    content: "",
    editable: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    let aktif = true;

    async function muatKonten() {
      setMemuatKonten(true);

      try {
        const hasil = await siapkanKonten(konten);

        if (!aktif) return;

        setKontenSiap(hasil);
      } catch (error) {
        console.error("Gagal memuat isi materi:", error);

        if (aktif) {
          setKontenSiap(null);
        }
      } finally {
        if (aktif) {
          setMemuatKonten(false);
        }
      }
    }

    if (konten) {
      void muatKonten();
    } else {
      setMemuatKonten(false);
    }

    return () => {
      aktif = false;
    };
  }, [konten]);

  useEffect(() => {
    if (!editor || !kontenSiap) return;

    editor.commands.setContent(kontenSiap);
  }, [editor, kontenSiap]);

  if (memuatKonten) {
    return (
      <p className="py-5 text-sm text-slate-500">
        Memuat isi materi lengkap...
      </p>
    );
  }

  if (!konten || !editor) return null;

  return (
    <div className="materi-terformat mt-6">
      <EditorContent editor={editor} />
    </div>
  );
}

export default function DetailMateriSiswa() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [materi, setMateri] = useState<Materi | null>(null);
  const [gambarTampil, setGambarTampil] = useState<string | null>(null);
  const [fileTampil, setFileTampil] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [pesanError, setPesanError] = useState("");

  useEffect(() => {
    let aktif = true;

    async function ambilDetailMateri() {
      setMemuat(true);
      setPesanError("");
      setMateri(null);
      setGambarTampil(null);
      setFileTampil(null);

      const { data, error } = await supabase
        .from("materi")
        .select(
          "id, judul, kategori, deskripsi, gambar_url, video_url, link_url, file_url, file_nama, konten"
        )
        .eq("id", id)
        .maybeSingle();

      if (!aktif) return;

      if (error) {
        setPesanError(error.message);
        setMemuat(false);
        return;
      }

      if (!data) {
        setPesanError("Materi tidak ditemukan.");
        setMemuat(false);
        return;
      }

      const item = data as Materi;
      setMateri(item);

      const [gambar, file] = await Promise.all([
        buatUrlFile("gambar-materi", item.gambar_url),
        buatUrlFile("dokumen-materi", item.file_url),
      ]);

      if (!aktif) return;

      setGambarTampil(gambar);
      setFileTampil(file);
      setMemuat(false);
    }

    if (id) {
      void ambilDetailMateri();
    } else {
      setPesanError("ID materi tidak valid.");
      setMemuat(false);
    }

    return () => {
      aktif = false;
    };
  }, [id]);

  const videoEmbed = materi?.video_url
    ? ubahKeEmbedYouTube(materi.video_url)
    : null;

  const linkMateri = alamatAman(materi?.link_url ?? null);
  const videoLangsung = alamatAman(materi?.video_url ?? null);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-800 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">

        {/* NAVIGASI */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/siswa/materi"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#102744] shadow-sm transition hover:border-orange-300 hover:bg-orange-50"
          >
            <span aria-hidden="true">←</span>
            Kembali ke daftar materi
          </Link>

          <span className="text-xs font-semibold tracking-wide text-slate-500">
            PORTAL PEMBELAJARAN DIGITAL
          </span>
        </div>

        {/* KARTU UTAMA */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          {/* HEADER */}
          <div className="relative overflow-hidden bg-[#102744] px-6 py-9 text-white sm:px-10 sm:py-11">
            <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[35px] border-white/5" />
            <div className="absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-orange-500/10 blur-2xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-2xl shadow-lg">
                  🔧
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                    LMS SMKN 4 SOPPENG
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Teknik Kendaraan Ringan
                  </p>
                </div>
              </div>

              <div className="mt-8 max-w-2xl">
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-orange-200">
                  Ruang Belajar Siswa
                </span>

                <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-4xl">
                  Detail Materi Pembelajaran
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                  Pelajari materi, amati media pembelajaran, dan
                  tingkatkan kompetensi keahlian kendaraan ringan.
                </p>
              </div>

              <div className="mt-7 h-1 w-20 rounded-full bg-orange-500" />
            </div>
          </div>

          {/* ISI HALAMAN */}
          <div className="p-5 sm:p-9 lg:p-10">

            {memuat ? (
              <div role="status" className="py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-3xl">
                  📚
                </div>
                <p className="mt-5 font-bold text-[#102744]">
                  Memuat materi pembelajaran...
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Mohon tunggu sebentar.
                </p>
              </div>
            ) : pesanError ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-6"
              >
                <div className="text-3xl">⚠️</div>

                <h2 className="mt-3 font-extrabold text-red-800">
                  Materi belum dapat ditampilkan
                </h2>

                <p className="mt-2 break-words text-sm leading-6 text-red-700">
                  {pesanError}
                </p>

                <Link
                  href="/siswa/materi"
                  className="mt-5 inline-flex rounded-xl bg-[#102744] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b3c63]"
                >
                  Kembali ke daftar materi
                </Link>
              </div>
            ) : materi ? (
              <article>

                {/* JUDUL MATERI */}
                <div className="border-b border-slate-200 pb-7">
                  <span className="inline-flex max-w-full rounded-full bg-orange-50 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-orange-700">
                    {materi.kategori}
                  </span>

                  <h2 className="mt-5 break-words text-2xl font-extrabold leading-snug text-[#102744] sm:text-3xl">
                    {materi.judul}
                  </h2>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      Materi Pembelajaran
                    </span>
                    <span>•</span>
                    <span>Teknik Kendaraan Ringan</span>
                  </div>
                </div>

                {/* GAMBAR UTAMA */}
                {materi.gambar_url?.trim() && (
                  <section className="mt-8">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-8 w-1 rounded-full bg-orange-500" />
                      <h3 className="font-extrabold text-[#102744]">
                        Ilustrasi Materi
                      </h3>
                    </div>

                    {gambarTampil ? (
                      <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
                        <img
                          src={gambarTampil}
                          alt={`Ilustrasi ${materi.judul}`}
                          className="mx-auto h-auto max-h-[520px] w-full rounded-xl object-contain"
                          loading="lazy"
                        />
                        <figcaption className="px-3 py-3 text-center text-xs text-slate-500">
                          Ilustrasi materi {materi.judul}
                        </figcaption>
                      </figure>
                    ) : (
                      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                        Gambar belum dapat ditampilkan.
                      </p>
                    )}
                  </section>
                )}

                {/* DESKRIPSI */}
                {materi.deskripsi?.trim() && (
                  <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-8 w-1 rounded-full bg-orange-500" />
                      <h3 className="font-extrabold text-[#102744]">
                        Deskripsi Materi
                      </h3>
                    </div>

                    <p className="whitespace-pre-wrap break-words text-sm leading-8 text-slate-700 sm:text-base">
                      {materi.deskripsi}
                    </p>
                  </section>
                )}

                {/* ISI MATERI TIPTAP */}
                {materi.konten && (
                  <section className="mt-9">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl">
                        📖
                      </div>

                      <div>
                        <h3 className="font-extrabold text-[#102744]">
                          Isi Materi Pembelajaran
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Pelajari pembahasan berikut dengan saksama.
                        </p>
                      </div>
                    </div>

                    <TampilanKontenMateri konten={materi.konten} />
                  </section>
                )}

                {/* VIDEO */}
                {materi.video_url?.trim() && (
                  <section className="mt-9 border-t border-slate-200 pt-7">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl">
                        ▶️
                      </div>

                      <div>
                        <h3 className="font-extrabold text-[#102744]">
                          Video Pembelajaran
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Simak video untuk memperdalam pemahaman.
                        </p>
                      </div>
                    </div>

                    {videoEmbed ? (
                      <div className="mt-5 aspect-video overflow-hidden rounded-2xl bg-slate-950 shadow-lg">
                        <iframe
                          src={videoEmbed}
                          title={`Video pembelajaran ${materi.judul}`}
                          className="h-full w-full"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                        Tautan video tidak dikenali sebagai tautan YouTube.
                      </p>
                    )}

                    {videoLangsung && (
                      <a
                        href={videoLangsung}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-[#102744] transition hover:border-orange-300 hover:bg-orange-50"
                      >
                        Buka video di tab baru ↗
                      </a>
                    )}
                  </section>
                )}

                {/* TAUTAN TAMBAHAN */}
                {linkMateri && (
                  <section className="mt-9 border-t border-slate-200 pt-7">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl">
                        🔗
                      </div>

                      <div>
                        <h3 className="font-extrabold text-[#102744]">
                          Tautan Materi Tambahan
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Sumber belajar tambahan dari guru.
                        </p>
                      </div>
                    </div>

                    <a
                      href={linkMateri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#102744] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b3c63]"
                    >
                      Buka Tautan Materi ↗
                    </a>
                  </section>
                )}

                {/* DOKUMEN */}
                {materi.file_url?.trim() && (
                  <section className="mt-9 border-t border-slate-200 pt-7">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl">
                        📄
                      </div>

                      <div>
                        <h3 className="font-extrabold text-[#102744]">
                          Dokumen Pembelajaran
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          File pembelajaran yang disediakan guru.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                          📑
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="break-words font-bold text-[#102744]">
                            {materi.file_nama || "Dokumen Materi"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Dokumen pembelajaran dari guru
                          </p>
                        </div>
                      </div>

                      {fileTampil ? (
                        <a
                          href={fileTampil}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600"
                        >
                          Buka / Unduh Dokumen
                        </a>
                      ) : (
                        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                          Dokumen belum dapat dibuka. Silakan hubungi guru.
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* PETUNJUK BELAJAR */}
                <section className="mt-9 overflow-hidden rounded-2xl border border-orange-200 bg-orange-50">
                  <div className="flex items-start gap-4 p-5 sm:p-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-2xl text-white">
                      💡
                    </div>

                    <div>
                      <h3 className="font-extrabold text-[#102744]">
                        Petunjuk Belajar
                      </h3>

                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        Pelajari materi ini dengan saksama. Amati gambar,
                        video, tautan, dan dokumen yang tersedia. Jika ada
                        bagian yang belum dipahami, diskusikan dengan guru
                        mata pelajaran.
                      </p>
                    </div>
                  </div>
                </section>

                {/* TOMBOL KEMBALI */}
                <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
                  <p className="text-xs text-slate-500">
                    LMS SMKN 4 SOPPENG · Teknik Kendaraan Ringan
                  </p>

                  <Link
                    href="/siswa/materi"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#102744] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1b3c63]"
                  >
                    ← Kembali ke semua materi
                  </Link>
                </div>
              </article>
            ) : null}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="mt-7 pb-3 text-center">
          <p className="text-xs font-semibold text-slate-500">
            LMS SMKN 4 SOPPENG
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Portal Pembelajaran Digital
          </p>
        </footer>
      </div>

      {/* STYLE ISI EDITOR */}
      <style jsx global>{`
        .materi-terformat .tiptap {
          color: #334155;
          font-size: 1rem;
          line-height: 1.9;
          overflow-wrap: anywhere;
        }

        .materi-terformat .tiptap p {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .materi-terformat .tiptap h1 {
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          font-size: 1.75rem;
          line-height: 1.4;
          font-weight: 800;
          color: #102744;
        }

        .materi-terformat .tiptap h2 {
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          font-size: 1.5rem;
          line-height: 1.4;
          font-weight: 800;
          color: #102744;
        }

        .materi-terformat .tiptap h3 {
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          font-size: 1.25rem;
          line-height: 1.5;
          font-weight: 700;
          color: #1e293b;
        }

        .materi-terformat .tiptap ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .materi-terformat .tiptap ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .materi-terformat .tiptap li {
          padding-left: 0.25rem;
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        .materi-terformat .tiptap strong {
          font-weight: 800;
          color: #102744;
        }

        .materi-terformat .tiptap em {
          font-style: italic;
        }

        .materi-terformat .tiptap a {
          color: #1d4ed8;
          text-decoration: underline;
          overflow-wrap: anywhere;
        }

        .materi-terformat .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin-top: 1rem;
          margin-bottom: 1rem;
        }

        .materi-terformat .tiptap blockquote {
          margin-top: 1rem;
          margin-bottom: 1rem;
          border-left: 4px solid #f97316;
          padding-left: 1rem;
          color: #475569;
        }
      `}</style>
    </main>
  );
}
