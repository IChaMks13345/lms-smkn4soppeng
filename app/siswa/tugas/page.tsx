
"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tugas = {
  id: string;
  judul: string;
  deskripsi: string | null;
  batas_waktu: string | null;
  created_at: string;
};

type Pengumpulan = {
  id: string;
  tugas_id: string;
  jawaban: string | null;
  file_url: string | null;
  status: string;
  nilai: number | null;
  catatan_guru: string | null;
  dikumpulkan_pada: string;
};

const MAKSIMUM_FILE = 10 * 1024 * 1024;

const TIPE_FILE_DIIZINKAN = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export default function HalamanTugasSiswa() {
  const [daftarTugas, setDaftarTugas] = useState<Tugas[]>([]);
  const [pengumpulan, setPengumpulan] = useState<Pengumpulan[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [pesanError, setPesanError] = useState("");
  const [pesanSukses, setPesanSukses] = useState("");

  const [tugasTerbuka, setTugasTerbuka] = useState<string | null>(null);
  const [formTerbuka, setFormTerbuka] = useState<string | null>(null);

  const [jawaban, setJawaban] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sedangMengirim, setSedangMengirim] = useState(false);

  // PERHITUNGAN RINGKASAN TUGAS
  const jumlahBelumDikumpulkan = daftarTugas.filter(
    (tugas) =>
      !pengumpulan.some((item) => item.tugas_id === tugas.id)
  ).length;

  const jumlahMenungguPenilaian = daftarTugas.filter((tugas) =>
    pengumpulan.some(
      (item) =>
        item.tugas_id === tugas.id && item.status !== "dinilai"
    )
  ).length;

  const jumlahSudahDinilai = daftarTugas.filter((tugas) =>
    pengumpulan.some(
      (item) =>
        item.tugas_id === tugas.id && item.status === "dinilai"
    )
  ).length;

  async function ambilData() {
    setMemuat(true);
    setPesanError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPesanError("Sesi login tidak ditemukan. Silakan login kembali.");
      setMemuat(false);
      return;
    }

    const [hasilTugas, hasilPengumpulan] = await Promise.all([
      supabase
        .from("tugas")
        .select("id, judul, deskripsi, batas_waktu, created_at")
        .eq("status", "diterbitkan")
        .order("created_at", { ascending: false }),

      supabase
        .from("pengumpulan_tugas")
        .select(
          "id, tugas_id, jawaban, file_url, status, nilai, catatan_guru, dikumpulkan_pada"
        )
        .eq("siswa_id", user.id),
    ]);

    if (hasilTugas.error) {
      setPesanError(
        "Daftar tugas belum dapat dimuat. Silakan muat ulang halaman."
      );
      setDaftarTugas([]);
    } else {
      setDaftarTugas((hasilTugas.data ?? []) as Tugas[]);
    }

    if (hasilPengumpulan.error) {
      setPesanError(
        "Status pengumpulan belum dapat diperiksa. Periksa kebijakan akses tabel pengumpulan_tugas."
      );
      setPengumpulan([]);
    } else {
      setPengumpulan((hasilPengumpulan.data ?? []) as Pengumpulan[]);
    }

    setMemuat(false);
  }

  useEffect(() => {
    void ambilData();
  }, []);

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function bukaTutupDetail(id: string) {
    setTugasTerbuka((sebelumnya) =>
      sebelumnya === id ? null : id
    );
  }

  function pilihFile(event: ChangeEvent<HTMLInputElement>) {
    const fileDipilih = event.target.files?.[0] ?? null;

    setPesanError("");
    setPesanSukses("");

    if (!fileDipilih) {
      setFile(null);
      return;
    }

    if (!TIPE_FILE_DIIZINKAN.includes(fileDipilih.type)) {
      setPesanError(
        "Format berkas harus PDF, Word, JPG, atau PNG."
      );
      event.target.value = "";
      setFile(null);
      return;
    }

    if (fileDipilih.size > MAKSIMUM_FILE) {
      setPesanError("Ukuran berkas maksimal 10 MB.");
      event.target.value = "";
      setFile(null);
      return;
    }

    setFile(fileDipilih);
  }

  async function kumpulkanTugas(
    event: FormEvent<HTMLFormElement>,
    tugas: Tugas
  ) {
    event.preventDefault();

    setPesanError("");
    setPesanSukses("");

    if (!jawaban.trim() && !file) {
      setPesanError(
        "Tuliskan jawaban atau pilih berkas sebelum mengumpulkan tugas."
      );
      return;
    }

    setSedangMengirim(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPesanError(
        "Sesi login tidak ditemukan. Silakan login kembali."
      );
      setSedangMengirim(false);
      return;
    }

    let lokasiBerkas: string | null = null;

    if (file) {
      const namaAman = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const lokasi = `${user.id}/${tugas.id}/${Date.now()}-${namaAman}`;

      const { error: uploadError } = await supabase.storage
        .from("pengumpulan-tugas")
        .upload(lokasi, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        setPesanError(
          `Berkas gagal diunggah: ${uploadError.message}`
        );
        setSedangMengirim(false);
        return;
      }

      lokasiBerkas = lokasi;
    }

    const { error: simpanError } = await supabase
      .from("pengumpulan_tugas")
      .insert({
        tugas_id: tugas.id,
        siswa_id: user.id,
        jawaban: jawaban.trim() || null,
        file_url: lokasiBerkas,
      });

    if (simpanError) {
      if (lokasiBerkas) {
        await supabase.storage
          .from("pengumpulan-tugas")
          .remove([lokasiBerkas]);
      }

      setPesanError(
        simpanError.code === "23505"
          ? "Tugas ini sudah pernah dikumpulkan. Pengumpulan ulang belum tersedia."
          : `Pengumpulan gagal disimpan: ${simpanError.message}`
      );

      setSedangMengirim(false);
      return;
    }

    setPesanSukses(
      `Tugas "${tugas.judul}" berhasil dikumpulkan.`
    );

    setJawaban("");
    setFile(null);
    setFormTerbuka(null);

    await ambilData();

    setSedangMengirim(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">

        {/* TOMBOL KEMBALI */}
        <Link
          href="/siswa"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
        >
          <span>←</span>
          Kembali ke Dashboard
        </Link>

        {/* HEADER HALAMAN */}
        <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-800 p-6 text-white shadow-lg sm:p-9">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl">
              📋
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
                LMS SMKN 4 SOPPENG
              </p>
              <p className="text-sm text-blue-100">
                Portal Pembelajaran Siswa
              </p>
            </div>
          </div>

          <h1 className="mt-7 text-3xl font-extrabold sm:text-4xl">
            Tugas Siswa
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
            Baca instruksi tugas dengan teliti, kerjakan dengan baik,
            kemudian kumpulkan jawaban atau berkas melalui halaman ini.
          </p>
        </header>

        {/* PESAN SUKSES */}
        {pesanSukses && (
          <div
            role="status"
            className="mt-6 flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800"
          >
            <span className="text-xl">✓</span>
            <div>
              <p className="font-bold">Berhasil!</p>
              <p className="mt-1 text-sm">{pesanSukses}</p>
            </div>
          </div>
        )}

        {/* PESAN ERROR */}
        {pesanError && (
          <div
            role="alert"
            className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <span className="text-xl">!</span>
            <div>
              <p className="font-bold">Perhatian</p>
              <p className="mt-1 text-sm">{pesanError}</p>
            </div>
          </div>
        )}

        {/* RINGKASAN TUGAS */}
        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
              Progres Belajar
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              Ringkasan Tugas Saya
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* BELUM DIKUMPULKAN */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-600">
                  Belum Dikumpulkan
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl">
                  📝
                </span>
              </div>

              <p className="mt-3 text-3xl font-extrabold text-blue-700">
                {memuat ? "..." : jumlahBelumDikumpulkan}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Tugas yang belum dikirim
              </p>
            </div>

            {/* MENUNGGU PENILAIAN */}
            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-600">
                  Menunggu Penilaian
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl">
                  ⏳
                </span>
              </div>

              <p className="mt-3 text-3xl font-extrabold text-amber-600">
                {memuat ? "..." : jumlahMenungguPenilaian}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Sudah dikumpulkan oleh siswa
              </p>
            </div>

            {/* SUDAH DINILAI */}
            <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-600">
                  Sudah Dinilai
                </p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-xl">
                  ✓
                </span>
              </div>

              <p className="mt-3 text-3xl font-extrabold text-green-700">
                {memuat ? "..." : jumlahSudahDinilai}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Hasil penilaian guru
              </p>
            </div>
          </div>
        </section>

        {/* DAFTAR TUGAS */}
        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                Ruang Belajar
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                Daftar Tugas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tugas yang diterbitkan oleh guru.
              </p>
            </div>

            {!memuat && (
              <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800">
                {daftarTugas.length} Tugas
              </span>
            )}
          </div>

          {memuat ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-3xl">⏳</div>
              <p className="mt-3 font-semibold text-slate-700">
                Memuat daftar tugas...
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Mohon tunggu sebentar.
              </p>
            </div>
          ) : daftarTugas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">📚</div>
              <h3 className="mt-4 text-lg font-bold text-slate-800">
                Belum ada tugas
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Tugas yang diterbitkan guru akan muncul di halaman ini.
                Silakan periksa kembali nanti.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {daftarTugas.map((tugas, index) => {
                const detailTerbuka = tugasTerbuka === tugas.id;
                const formSedangTerbuka = formTerbuka === tugas.id;

                const hasil = pengumpulan.find(
                  (item) => item.tugas_id === tugas.id
                );

                // PEMERIKSAAN BATAS WAKTU
                const terlambat =
                  !hasil &&
                  !!tugas.batas_waktu &&
                  new Date(tugas.batas_waktu).getTime() < Date.now();

                return (
                  <article
                    key={tugas.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    {/* BAGIAN JUDUL KARTU */}
                    <div className="border-b border-slate-100 bg-white p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl font-extrabold text-blue-900">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                              Tugas Pembelajaran
                            </p>

                            <h3 className="mt-1 break-words text-lg font-extrabold text-slate-900 sm:text-xl">
                              {tugas.judul}
                            </h3>
                          </div>
                        </div>

                        {/* STATUS TUGAS */}
                        {hasil ? (
                          hasil.status === "dinilai" ? (
                            <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800">
                              ✓ Sudah Dinilai
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                              Menunggu Penilaian
                            </span>
                          )
                        ) : terlambat ? (
                          <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800">
                            ⚠ Terlambat
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-800">
                            Belum Dikumpulkan
                          </span>
                        )}
                      </div>

                      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <span className="text-lg">📅</span>
                          <div>
                            <p className="text-xs text-slate-500">
                              Batas Pengumpulan
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {tugas.batas_waktu
                                ? formatTanggal(tugas.batas_waktu)
                                : "Belum ditentukan"}
                            </p>

                            {terlambat && (
                              <p className="mt-1 text-xs font-semibold text-red-600">
                                Batas waktu pengumpulan telah lewat.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-lg">🕒</span>
                          <div>
                            <p className="text-xs text-slate-500">
                              Tanggal Diterbitkan
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {formatTanggal(tugas.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DETAIL TUGAS */}
                    {detailTerbuka && (
                      <div className="border-b border-blue-100 bg-blue-50 p-5 sm:p-6">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📖</span>
                          <h4 className="font-bold text-slate-900">
                            Instruksi Tugas
                          </h4>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                          {tugas.deskripsi ||
                            "Tidak ada deskripsi tugas."}
                        </p>
                      </div>
                    )}

                    {/* HASIL PENGUMPULAN */}
                    {hasil && (
                      <div className="border-b border-green-100 bg-green-50 p-5 sm:p-6">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">✓</span>
                          <h4 className="font-bold text-green-900">
                            Informasi Pengumpulan
                          </h4>
                        </div>

                        <div className="mt-4 rounded-xl border border-green-200 bg-white p-4">
                          <p className="text-xs text-slate-500">
                            Waktu Pengumpulan
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatTanggal(hasil.dikumpulkan_pada)}
                          </p>

                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <p className="text-xs text-slate-500">
                              Status Penilaian
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-800">
                              {hasil.status === "dinilai"
                                ? "Sudah dinilai oleh guru"
                                : "Menunggu penilaian dari guru"}
                            </p>
                          </div>

                          {hasil.nilai !== null && (
                            <div className="mt-4 rounded-xl bg-blue-50 p-4">
                              <p className="text-xs font-semibold text-blue-700">
                                NILAI TUGAS
                              </p>
                              <p className="mt-1 text-3xl font-extrabold text-blue-900">
                                {hasil.nilai}
                                <span className="ml-1 text-sm font-medium text-blue-700">
                                  / 100
                                </span>
                              </p>
                            </div>
                          )}

                          {hasil.catatan_guru && (
                            <div className="mt-4 border-t border-slate-100 pt-4">
                              <p className="text-xs font-semibold text-slate-500">
                                CATATAN GURU
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                {hasil.catatan_guru}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* FORMULIR PENGUMPULAN */}
                    {formSedangTerbuka && !hasil && (
                      <form
                        onSubmit={(event) =>
                          void kumpulkanTugas(event, tugas)
                        }
                        className="border-b border-blue-100 bg-blue-50 p-5 sm:p-6"
                      >
                        <div className="mb-5 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl">
                            ✍️
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">
                              Formulir Pengumpulan
                            </h4>
                            <p className="text-xs text-slate-500">
                              Lengkapi jawaban sebelum dikirim.
                            </p>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor={`jawaban-${tugas.id}`}
                            className="mb-2 block text-sm font-bold text-slate-800"
                          >
                            Jawaban Tertulis
                          </label>

                          <textarea
                            id={`jawaban-${tugas.id}`}
                            value={jawaban}
                            onChange={(event) =>
                              setJawaban(event.target.value)
                            }
                            rows={6}
                            placeholder="Tuliskan jawaban tugas di sini..."
                            className="w-full rounded-xl border border-slate-300 bg-white p-4 text-sm leading-7 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                        </div>

                        <div className="mt-5">
                          <label
                            htmlFor={`file-${tugas.id}`}
                            className="mb-2 block text-sm font-bold text-slate-800"
                          >
                            Lampiran Berkas
                            <span className="ml-2 font-normal text-slate-500">
                              (Opsional)
                            </span>
                          </label>

                          <input
                            id={`file-${tugas.id}`}
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={pilihFile}
                            className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-800 hover:file:bg-blue-200"
                          />

                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            Format PDF, Word, JPG, atau PNG.
                            Ukuran maksimal 10 MB.
                          </p>

                          {file && (
                            <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-white p-3 text-sm text-blue-800">
                              <span>📎</span>
                              <span className="break-all font-medium">
                                {file.name}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={sedangMengirim}
                            className="min-h-11 rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {sedangMengirim
                              ? "Mengirim Pengumpulan..."
                              : "Kirim Pengumpulan"}
                          </button>

                          <button
                            type="button"
                            disabled={sedangMengirim}
                            onClick={() => {
                              setFormTerbuka(null);
                              setJawaban("");
                              setFile(null);
                              setPesanError("");
                            }}
                            className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                          >
                            Batal
                          </button>
                        </div>
                      </form>
                    )}

                    {/* TOMBOL AKSI */}
                    <div className="flex flex-wrap gap-3 p-5 sm:px-6">
                      <button
                        type="button"
                        onClick={() => bukaTutupDetail(tugas.id)}
                        aria-expanded={detailTerbuka}
                        className="min-h-11 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-800 transition hover:bg-blue-50"
                      >
                        {detailTerbuka
                          ? "Tutup Detail"
                          : "Lihat Detail Tugas"}
                      </button>

                      {!hasil && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormTerbuka((sebelumnya) =>
                              sebelumnya === tugas.id
                                ? null
                                : tugas.id
                            );

                            setJawaban("");
                            setFile(null);
                            setPesanError("");
                          }}
                          className="min-h-11 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-800"
                        >
                          {formSedangTerbuka
                            ? "Tutup Formulir"
                            : "Kumpulkan Tugas"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="mt-10 rounded-2xl bg-slate-900 px-6 py-7 text-center text-white">
          <p className="font-bold">LMS SMKN 4 Soppeng</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Belajar, berlatih, dan menjadi tenaga profesional
            di bidang otomotif.
          </p>
        </footer>
      </div>
    </main>
  );
}
