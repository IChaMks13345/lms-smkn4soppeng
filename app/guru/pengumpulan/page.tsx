
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Pengumpulan = {
  id: string;
  tugas_id: string;
  siswa_id: string;
  nama_siswa: string | null;
  nis_siswa: string | null;
  kelas_siswa: string | null;
  email_siswa: string | null;
  judul_tugas: string | null;
  jawaban: string | null;
  file_url: string | null;
  status: "dikumpulkan" | "dinilai";
  nilai: number | null;
  catatan_guru: string | null;
  dikumpulkan_pada: string;
  dinilai_pada: string | null;
  signed_url?: string | null;
};

export default function PengumpulanGuruPage() {
  const [data, setData] = useState<Pengumpulan[]>([]);
  const [nilai, setNilai] = useState<Record<string, string>>({});
  const [catatan, setCatatan] = useState<Record<string, string>>({});
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState<string | null>(null);
  const [pesan, setPesan] = useState("");
  const [jenisPesan, setJenisPesan] =
    useState<"sukses" | "error">("sukses");

  const tampilkanPesan = (
    teks: string,
    jenis: "sukses" | "error" = "sukses"
  ) => {
    setPesan(teks);
    setJenisPesan(jenis);
  };

  // Memuat data pengumpulan tugas
  const muatPengumpulan = useCallback(async () => {
    setMemuat(true);
    setPesan("");

    // Memeriksa akun yang sedang login
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    const user = authData.user;

    if (authError || !user) {
      window.location.href = "/login";
      return;
    }

    // Memastikan akun memiliki peran guru
    const { data: profil, error: profilError } =
      await supabase
        .from("profil_pengguna")
        .select("peran")
        .eq("id", user.id)
        .single();

    if (profilError || profil?.peran !== "guru") {
      tampilkanPesan(
        "Halaman ini hanya dapat diakses oleh guru.",
        "error"
      );
      setMemuat(false);
      return;
    }

    // Mengambil data melalui fungsi Supabase
    const { data: hasil, error } = await supabase.rpc(
      "daftar_pengumpulan_guru"
    );

    if (error) {
      tampilkanPesan(
        "Gagal memuat pengumpulan: " + error.message,
        "error"
      );
      setMemuat(false);
      return;
    }

    const daftar = (hasil ?? []) as Pengumpulan[];

    // Membuat tautan sementara untuk lampiran privat
    const denganLampiran = await Promise.all(
      daftar.map(async (item) => {
        if (!item.file_url) {
          return { ...item, signed_url: null };
        }

        const { data: fileData, error: fileError } =
          await supabase.storage
            .from("pengumpulan-tugas")
            .createSignedUrl(item.file_url, 3600);

        return {
          ...item,
          signed_url: fileError
            ? null
            : fileData?.signedUrl ?? null,
        };
      })
    );

    setData(denganLampiran);

    // Mengisi nilai yang sudah tersimpan
    setNilai(
      Object.fromEntries(
        denganLampiran.map((item) => [
          item.id,
          item.nilai === null ? "" : String(item.nilai),
        ])
      )
    );

    // Mengisi catatan yang sudah tersimpan
    setCatatan(
      Object.fromEntries(
        denganLampiran.map((item) => [
          item.id,
          item.catatan_guru ?? "",
        ])
      )
    );

    setMemuat(false);
  }, []);

  useEffect(() => {
    void muatPengumpulan();
  }, [muatPengumpulan]);

  // Menyimpan nilai dan catatan guru
  const simpanPenilaian = async (item: Pengumpulan) => {
    const nilaiInput = nilai[item.id] ?? "";
    const nilaiAngka = Number(nilaiInput);

    if (
      nilaiInput.trim() === "" ||
      !Number.isFinite(nilaiAngka) ||
      nilaiAngka < 0 ||
      nilaiAngka > 100
    ) {
      tampilkanPesan(
        "Masukkan nilai antara 0 sampai 100.",
        "error"
      );
      return;
    }

    setMenyimpan(item.id);
    setPesan("");

    const waktuPenilaian = new Date().toISOString();

    const { error } = await supabase
      .from("pengumpulan_tugas")
      .update({
        nilai: nilaiAngka,
        catatan_guru: catatan[item.id] ?? "",
        status: "dinilai",
        dinilai_pada: waktuPenilaian,
      })
      .eq("id", item.id);

    if (error) {
      tampilkanPesan(
        "Penilaian gagal disimpan: " + error.message,
        "error"
      );
    } else {
      setData((sebelumnya) =>
        sebelumnya.map((baris) =>
          baris.id === item.id
            ? {
                ...baris,
                nilai: nilaiAngka,
                catatan_guru: catatan[item.id] ?? "",
                status: "dinilai",
                dinilai_pada: waktuPenilaian,
              }
            : baris
        )
      );

      tampilkanPesan("Penilaian berhasil disimpan.");
    }

    setMenyimpan(null);
  };

  // Tampilan saat memuat
  if (memuat) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-sm">
          Memuat pengumpulan tugas siswa...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Judul dan navigasi */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Pengumpulan dan Penilaian Tugas
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Periksa identitas dan jawaban siswa,
              buka lampiran, lalu berikan penilaian.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void muatPengumpulan()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Muat Ulang
            </button>

            <Link
              href="/guru"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>

        {/* Pesan berhasil atau gagal */}
        {pesan && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              jenisPesan === "sukses"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {pesan}
          </div>
        )}

        {/* Jumlah pengumpulan */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">
            Jumlah pengumpulan masuk
          </p>

          <p className="text-2xl font-bold text-slate-800">
            {data.length}
          </p>
        </div>

        {/* Daftar pengumpulan siswa */}
        {data.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Belum ada siswa yang mengumpulkan tugas.
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item) => (
              <section
                key={item.id}
                className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                {/* Identitas siswa dan tugas */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-slate-800">
                      {item.judul_tugas || "Tugas"}
                    </h2>

                    {/* Kartu identitas siswa */}
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <h3 className="mb-3 font-bold text-slate-800">
                        Identitas Siswa
                      </h3>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-slate-500">
                            Nama Lengkap
                          </p>
                          <p className="font-semibold text-slate-800">
                            {item.nama_siswa || "Belum tersedia"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Nomor Induk Siswa (NIS)
                          </p>
                          <p className="font-semibold text-slate-800">
                            {item.nis_siswa || "Belum tersedia"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Kelas
                          </p>
                          <p className="font-semibold text-slate-800">
                            {item.kelas_siswa || "Belum tersedia"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Email
                          </p>
                          <p className="break-all font-semibold text-slate-800">
                            {item.email_siswa || "Belum tersedia"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-500">
                      Waktu pengumpulan:{" "}
                      {item.dikumpulkan_pada
                        ? new Date(
                            item.dikumpulkan_pada
                          ).toLocaleString("id-ID")
                        : "Tidak tersedia"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === "dinilai"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.status === "dinilai"
                      ? "Sudah dinilai"
                      : "Belum dinilai"}
                  </span>
                </div>

                {/* Jawaban tertulis */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Jawaban Tertulis
                  </h3>

                  <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {item.jawaban?.trim()
                      ? item.jawaban
                      : "Siswa tidak mengirim jawaban tertulis."}
                  </div>
                </div>

                {/* Lampiran */}
                {item.file_url && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">
                      Lampiran Siswa
                    </h3>

                    {item.signed_url ? (
                      <a
                        href={item.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Buka / Unduh Lampiran
                      </a>
                    ) : (
                      <p className="text-sm text-red-600">
                        Tautan lampiran belum dapat dibuat.
                        Coba muat ulang halaman.
                      </p>
                    )}
                  </div>
                )}

                {/* Form penilaian */}
                <div className="grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                      Nilai (0–100)
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={nilai[item.id] ?? ""}
                      onChange={(e) =>
                        setNilai((sebelumnya) => ({
                          ...sebelumnya,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Contoh: 85"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                      Catatan Guru
                    </span>

                    <textarea
                      rows={3}
                      value={catatan[item.id] ?? ""}
                      onChange={(e) =>
                        setCatatan((sebelumnya) => ({
                          ...sebelumnya,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Tulis masukan atau umpan balik untuk siswa..."
                    />
                  </label>
                </div>

                {/* Tombol simpan */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {item.status === "dinilai" &&
                    item.dinilai_pada && (
                      <p className="text-xs text-slate-500">
                        Terakhir dinilai:{" "}
                        {new Date(
                          item.dinilai_pada
                        ).toLocaleString("id-ID")}
                      </p>
                    )}

                  <button
                    type="button"
                    onClick={() => void simpanPenilaian(item)}
                    disabled={menyimpan === item.id}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {menyimpan === item.id
                      ? "Menyimpan..."
                      : "Simpan Penilaian"}
                  </button>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
