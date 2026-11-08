
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import EditorMateri from "@/components/editor/EditorMateri";

const BUCKET_GAMBAR = "gambar-materi";
const BUCKET_DOKUMEN = "dokumen-materi";

const MAKS_GAMBAR = 5 * 1024 * 1024;
const MAKS_DOKUMEN = 10 * 1024 * 1024;

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

function namaAman(nama: string) {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function urlValid(url: string): boolean {
  try {
    const alamat = new URL(url);

    return (
      alamat.protocol === "https:" ||
      alamat.protocol === "http:"
    );
  } catch {
    return false;
  }
}

function pathFile(bucket: string, lokasi: string | null) {
  if (
    !lokasi ||
    lokasi.startsWith("http://") ||
    lokasi.startsWith("https://")
  ) {
    return null;
  }

  return lokasi.startsWith(`${bucket}/`)
    ? lokasi.slice(bucket.length + 1)
    : lokasi;
}

async function hapusFileLama(
  bucket: string,
  lokasi: string | null
) {
  const path = pathFile(bucket, lokasi);

  if (!path) return;

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error(
      "Gagal membersihkan file lama:",
      error.message
    );
  }
}

export default function HalamanMateriGuru() {
  const router = useRouter();

  const [materi, setMateri] = useState<Materi[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);

  const [judul, setJudul] = useState("");
  const [kategori, setKategori] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const [konten, setKonten] = useState<any | null>(null);

  const [gambarFile, setGambarFile] = useState<File | null>(null);
  const [dokumenFile, setDokumenFile] = useState<File | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    let aktif = true;

    async function periksaAksesGuru() {
      const { data: sesiData } = await supabase.auth.getSession();

      if (!sesiData.session) {
        router.replace("/login");
        return;
      }

      const { data: profil, error } = await supabase
        .from("profil_pengguna")
        .select("peran")
        .eq("id", sesiData.session.user.id)
        .maybeSingle();

      if (!aktif) return;

      if (error || profil?.peran !== "guru") {
        router.replace("/login");
        return;
      }

      await ambilMateri(aktif);
    }

    void periksaAksesGuru();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      aktif = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function ambilMateri(cekAktif?: boolean) {
    setMemuat(true);

    const { data, error } = await supabase
      .from("materi")
      .select(
        "id, judul, kategori, deskripsi, gambar_url, video_url, link_url, file_url, file_nama, konten"
      )
      .order("id", { ascending: true });

    if (cekAktif === false) return;

    if (error) {
      setPesan("Gagal mengambil materi: " + error.message);
    } else {
      setMateri((data ?? []) as Materi[]);
    }

    setMemuat(false);
  }

  function batalEdit() {
    setEditId(null);
    setJudul("");
    setKategori("");
    setDeskripsi("");
    setVideoUrl("");
    setLinkUrl("");
    setKonten(null);
    setGambarFile(null);
    setDokumenFile(null);
    setPesan("");

    const inputGambar = document.getElementById(
      "gambar"
    ) as HTMLInputElement | null;

    const inputDokumen = document.getElementById(
      "dokumen"
    ) as HTMLInputElement | null;

    if (inputGambar) inputGambar.value = "";
    if (inputDokumen) inputDokumen.value = "";
  }

  function editMateri(item: Materi) {
    setEditId(item.id);
    setJudul(item.judul);
    setKategori(item.kategori);
    setDeskripsi(item.deskripsi ?? "");
    setVideoUrl(item.video_url ?? "");
    setLinkUrl(item.link_url ?? "");
    setKonten(item.konten ?? null);
    setGambarFile(null);
    setDokumenFile(null);
    setPesan("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function pilihGambar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;

    setPesan("");

    if (!file) {
      setGambarFile(null);
      return;
    }

    const tipeDiizinkan = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!tipeDiizinkan.includes(file.type)) {
      setPesan("Gambar harus berformat JPG, PNG, atau WebP.");
      e.target.value = "";
      setGambarFile(null);
      return;
    }

    if (file.size > MAKS_GAMBAR) {
      setPesan("Ukuran gambar maksimal 5 MB.");
      e.target.value = "";
      setGambarFile(null);
      return;
    }

    setGambarFile(file);
  }

  function pilihDokumen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;

    setPesan("");

    if (!file) {
      setDokumenFile(null);
      return;
    }

    const nama = file.name.toLowerCase();

    const ekstensiDiizinkan =
      nama.endsWith(".pdf") ||
      nama.endsWith(".doc") ||
      nama.endsWith(".docx");

    if (!ekstensiDiizinkan) {
      setPesan("Dokumen harus berformat PDF, DOC, atau DOCX.");
      e.target.value = "";
      setDokumenFile(null);
      return;
    }

    if (file.size > MAKS_DOKUMEN) {
      setPesan("Ukuran dokumen maksimal 10 MB.");
      e.target.value = "";
      setDokumenFile(null);
      return;
    }

    setDokumenFile(file);
  }

  async function unggahFile(
    bucket: string,
    file: File,
    userId: string
  ): Promise<string> {
    const path = `${userId}/${Date.now()}-${namaAman(file.name)}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    return path;
  }

  async function simpanMateri(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPesan("");

    const judulBersih = judul.trim();
    const kategoriBersih = kategori.trim();
    const deskripsiBersih = deskripsi.trim();
    const videoBersih = videoUrl.trim();
    const linkBersih = linkUrl.trim();

    if (!judulBersih || !kategoriBersih) {
      setPesan("Judul dan kategori wajib diisi.");
      return;
    }

    if (videoBersih && !urlValid(videoBersih)) {
      setPesan(
        "Alamat video harus berupa URL HTTP atau HTTPS yang valid."
      );
      return;
    }

    if (linkBersih && !urlValid(linkBersih)) {
      setPesan(
        "Tautan materi harus berupa URL HTTP atau HTTPS yang valid."
      );
      return;
    }

    setMenyimpan(true);

    const fileBaru: {
      bucket: string;
      path: string;
    }[] = [];

    try {
      const { data: sesiData, error: sesiError } =
        await supabase.auth.getUser();

      if (sesiError || !sesiData.user) {
        throw new Error(
          "Sesi login tidak ditemukan. Silakan login kembali."
        );
      }

      const userId = sesiData.user.id;

      let gambarUrl: string | null = null;
      let fileUrl: string | null = null;

      const materiLama =
        editId !== null
          ? materi.find((item) => item.id === editId)
          : null;

      gambarUrl = materiLama?.gambar_url ?? null;
      fileUrl = materiLama?.file_url ?? null;

      if (gambarFile) {
        const path = await unggahFile(
          BUCKET_GAMBAR,
          gambarFile,
          userId
        );

        gambarUrl = path;

        fileBaru.push({
          bucket: BUCKET_GAMBAR,
          path,
        });
      }

      if (dokumenFile) {
        const path = await unggahFile(
          BUCKET_DOKUMEN,
          dokumenFile,
          userId
        );

        fileUrl = path;

        fileBaru.push({
          bucket: BUCKET_DOKUMEN,
          path,
        });
      }

      const dataMateri = {
        judul: judulBersih,
        kategori: kategoriBersih,
        deskripsi: deskripsiBersih || null,
        gambar_url: gambarUrl,
        video_url: videoBersih || null,
        link_url: linkBersih || null,
        file_url: fileUrl,
        file_nama: dokumenFile
          ? dokumenFile.name
          : materiLama?.file_nama ?? null,
        konten: konten,
      };

      if (editId !== null) {
        const { data, error } = await supabase
          .from("materi")
          .update(dataMateri)
          .eq("id", editId)
          .select(
            "id, judul, kategori, deskripsi, gambar_url, video_url, link_url, file_url, file_nama, konten"
          )
          .single();

        if (error) {
          throw new Error(
            "Gagal memperbarui materi: " + error.message
          );
        }

        setMateri((daftar) =>
          daftar.map((item) =>
            item.id === editId ? (data as Materi) : item
          )
        );

        if (gambarFile) {
          await hapusFileLama(
            BUCKET_GAMBAR,
            materiLama?.gambar_url ?? null
          );
        }

        if (dokumenFile) {
          await hapusFileLama(
            BUCKET_DOKUMEN,
            materiLama?.file_url ?? null
          );
        }

        batalEdit();
        setPesan("Materi berhasil diperbarui.");
      } else {
        const { data, error } = await supabase
          .from("materi")
          .insert(dataMateri)
          .select(
            "id, judul, kategori, deskripsi, gambar_url, video_url, link_url, file_url, file_nama, konten"
          )
          .single();

        if (error) {
          throw new Error(
            "Gagal menambahkan materi: " + error.message
          );
        }

        setMateri((daftar) =>
          [...daftar, data as Materi].sort(
            (a, b) => a.id - b.id
          )
        );

        batalEdit();
        setPesan("Materi berhasil ditambahkan.");
      }
    } catch (error) {
      for (const file of fileBaru) {
        await supabase.storage
          .from(file.bucket)
          .remove([file.path]);
      }

      setPesan(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan materi."
      );
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapusMateri(id: number) {
    const item = materi.find((m) => m.id === id);

    if (!item) return;

    const yakin = window.confirm(
      "Yakin ingin menghapus materi ini beserta file gambar dan dokumennya?"
    );

    if (!yakin) return;

    setPesan("");

    const { error } = await supabase
      .from("materi")
      .delete()
      .eq("id", id);

    if (error) {
      setPesan("Gagal menghapus materi: " + error.message);
      return;
    }

    await hapusFileLama(BUCKET_GAMBAR, item.gambar_url);
    await hapusFileLama(BUCKET_DOKUMEN, item.file_url);

    setMateri((daftar) =>
      daftar.filter((m) => m.id !== id)
    );

    if (editId === id) batalEdit();

    setPesan("Materi berhasil dihapus.");
  }

  if (memuat) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        Memuat halaman materi...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl bg-blue-900 p-6 text-white shadow">
        <p className="text-sm text-blue-200">
          LMS SMKN 4 SOPPENG
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Materi Pembelajaran
        </h1>

        <p className="mt-2 text-blue-100">
          Kelola materi, gambar, video, tautan, dan dokumen pembelajaran.
        </p>
      </header>

      {pesan && (
        <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          {pesan}
        </div>
      )}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-bold text-slate-800">
          {editId !== null ? "Edit Materi" : "Tambah Materi Baru"}
        </h2>

        <form onSubmit={simpanMateri} className="space-y-5">
          <div>
            <label
              htmlFor="judul"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Judul Materi *
            </label>

            <input
              id="judul"
              type="text"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Sistem Pelumasan Mesin"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="kategori"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Kategori *
            </label>

            <input
              id="kategori"
              type="text"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              placeholder="Contoh: Sistem Pendingin"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="deskripsi"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Deskripsi Singkat
            </label>

            <textarea
              id="deskripsi"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Tuliskan ringkasan singkat materi pembelajaran..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div className="rounded-xl border border-blue-200 p-4">
            <h3 className="mb-2 text-lg font-bold text-slate-800">
              Isi Materi Lengkap
            </h3>

            <p className="mb-4 text-sm text-slate-500">
              Tulis materi seperti menggunakan Microsoft Word.
              Gambar dapat ditempel langsung ke dalam editor.
            </p>

            <EditorMateri
              konten={konten}
              onChange={setKonten}
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800">
              1. Gambar Pembelajaran
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Format JPG, PNG, atau WebP. Maksimal 5 MB.
            </p>

            <input
              id="gambar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={pilihGambar}
              className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:font-semibold file:text-blue-800"
            />

            {gambarFile && (
              <p className="mt-2 break-all text-sm text-green-700">
                Gambar dipilih: {gambarFile.name}
              </p>
            )}

            {editId !== null && (
              <p className="mt-2 text-xs text-slate-500">
                Kosongkan jika ingin mempertahankan gambar lama.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800">
              2. Video YouTube
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Masukkan tautan video YouTube jika tersedia.
            </p>

            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800">
              3. Tautan Materi Tambahan
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Contoh: Google Drive, website, atau sumber belajar lainnya.
            </p>

            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800">
              4. Dokumen Pembelajaran
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Format PDF, DOC, atau DOCX. Maksimal 10 MB.
            </p>

            <input
              id="dokumen"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={pilihDokumen}
              className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:font-semibold file:text-blue-800"
            />

            {dokumenFile && (
              <p className="mt-2 break-all text-sm text-green-700">
                Dokumen dipilih: {dokumenFile.name}
              </p>
            )}

            {editId !== null && (
              <p className="mt-2 text-xs text-slate-500">
                Kosongkan jika ingin mempertahankan dokumen lama.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={menyimpan}
              className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {menyimpan
                ? "Mengunggah dan menyimpan..."
                : editId !== null
                  ? "Simpan Perubahan"
                  : "Tambah Materi"}
            </button>

            {editId !== null && (
              <button
                type="button"
                onClick={batalEdit}
                disabled={menyimpan}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal Edit
              </button>
            )}
          </div>

          <p className="text-xs leading-5 text-slate-500">
            * Judul dan kategori wajib diisi. Isi materi, gambar,
            video, tautan, dan dokumen dapat ditambahkan sesuai kebutuhan.
          </p>
        </form>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Daftar Materi
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Jumlah materi: {materi.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void ambilMateri()}
            disabled={memuat}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Muat Ulang
          </button>
        </div>

        {materi.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-slate-500 shadow-sm">
            Belum ada materi di database.
          </div>
        ) : (
          <div className="space-y-4">
            {materi.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                      {item.kategori}
                    </span>

                    <h3 className="mt-3 text-lg font-bold text-slate-800">
                      {item.judul}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {item.deskripsi || "Belum ada deskripsi."}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {item.konten && (
                        <span className="rounded-full bg-indigo-100 px-3 py-1 font-semibold text-indigo-800">
                          Ada Isi Materi
                        </span>
                      )}

                      {item.gambar_url && (
                        <span className="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-800">
                          Ada Gambar
                        </span>
                      )}

                      {item.video_url && (
                        <span className="rounded-full bg-purple-100 px-3 py-1 font-semibold text-purple-800">
                          Ada Video
                        </span>
                      )}

                      {item.link_url && (
                        <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-800">
                          Ada Tautan
                        </span>
                      )}

                      {item.file_url && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                          Ada Dokumen
                        </span>
                      )}
                    </div>

                    {item.file_nama && (
                      <p className="mt-2 break-all text-xs text-slate-500">
                        Dokumen: {item.file_nama}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-slate-400">
                      ID Materi: {item.id}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2 sm:flex-col">
                    <button
                      type="button"
                      onClick={() => editMateri(item)}
                      className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-200"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => void hapusMateri(item.id)}
                      className="rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
