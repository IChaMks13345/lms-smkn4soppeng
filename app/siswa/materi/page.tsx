
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Materi = {
  id: number;
  judul: string;
  kategori: string;
  deskripsi: string | null;
};

export default function HalamanMateri() {
  const [materi, setMateri] = useState<Materi[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [pesanError, setPesanError] = useState("");
  const [pencarian, setPencarian] = useState("");
  const [kategoriAktif, setKategoriAktif] = useState("Semua");

  // MEMUAT MATERI DARI SUPABASE
  useEffect(() => {
    let aktif = true;

    async function muatMateri() {
      const { data, error } = await supabase
        .from("materi")
        .select("id, judul, kategori, deskripsi")
        .order("id", { ascending: true });

      if (!aktif) return;

      if (error) {
        setPesanError(error.message);
      } else {
        setMateri((data ?? []) as Materi[]);
      }

      setMemuat(false);
    }

    void muatMateri();

    return () => {
      aktif = false;
    };
  }, []);

  // DAFTAR KATEGORI OTOMATIS
  const daftarKategori = useMemo(
    () => [
      "Semua",
      ...Array.from(
        new Set(materi.map((item) => item.kategori).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "id")),
    ],
    [materi]
  );

  // PENCARIAN DAN FILTER
  const materiTersaring = useMemo(() => {
    const kataKunci = pencarian.trim().toLocaleLowerCase("id");

    return materi.filter((item) => {
      const cocokKategori =
        kategoriAktif === "Semua" ||
        item.kategori === kategoriAktif;

      const cocokPencarian =
        !kataKunci ||
        item.judul.toLocaleLowerCase("id").includes(kataKunci) ||
        item.kategori.toLocaleLowerCase("id").includes(kataKunci) ||
        (item.deskripsi ?? "")
          .toLocaleLowerCase("id")
          .includes(kataKunci);

      return cocokKategori && cocokPencarian;
    });
  }, [materi, pencarian, kategoriAktif]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
                Ruang Belajar Siswa
              </p>

              <h1 className="mt-2 text-2xl font-extrabold text-[#102744] sm:text-3xl">
                Materi Pembelajaran
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Pelajari materi dan tingkatkan kompetensi Teknik Kendaraan Ringan.
              </p>
            </div>

            <div className="hidden rounded-xl bg-[#102744] px-5 py-3 text-right text-white sm:block">
              <p className="text-sm font-extrabold">
                LMS SMKN 4
              </p>
              <p className="text-xs font-bold text-orange-400">
                SOPPENG
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">

        {/* PANEL PENCARIAN DAN KATEGORI */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 bg-gradient-to-r from-[#102744] to-[#1c426b] px-5 py-5 text-white sm:px-7">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-300">
              Perpustakaan Digital
            </p>

            <h2 className="mt-2 text-xl font-extrabold">
              Temukan Materi Belajarmu
            </h2>

            <p className="mt-1 text-sm text-slate-300">
              Cari berdasarkan judul, kategori, atau deskripsi materi.
            </p>
          </div>

          <div className="p-5 sm:p-7">

            <label
              htmlFor="cari-materi"
              className="mb-2 block text-sm font-bold text-[#102744]"
            >
              Cari Materi Pembelajaran
            </label>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                ⌕
              </span>

              <input
                id="cari-materi"
                type="search"
                value={pencarian}
                onChange={(e) => setPencarian(e.target.value)}
                placeholder="Ketik judul atau kategori materi..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-[#102744]">
                  Kategori Materi
                </p>

                <span className="text-xs text-slate-400">
                  Pilih kategori
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {daftarKategori.map((kategori) => (
                  <button
                    key={kategori}
                    type="button"
                    onClick={() => setKategoriAktif(kategori)}
                    aria-pressed={kategoriAktif === kategori}
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition sm:text-sm ${
                      kategoriAktif === kategori
                        ? "border-[#102744] bg-[#102744] text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-600 hover:border-orange-400 hover:text-orange-600"
                    }`}
                  >
                    {kategoriAktif === kategori && (
                      <span className="mr-1.5 text-orange-400">✓</span>
                    )}
                    {kategori}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* INFORMASI JUMLAH MATERI */}
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
                Bahan Pembelajaran
              </p>

              <h2 className="mt-1 text-xl font-extrabold text-[#102744] sm:text-2xl">
                Daftar Materi
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {memuat
                  ? "Sedang mengambil data materi..."
                  : `${materiTersaring.length} dari ${materi.length} materi tersedia`}
              </p>
            </div>

            {!memuat && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
                {kategoriAktif === "Semua" ? "SEMUA KATEGORI" : kategoriAktif.toUpperCase()}
              </div>
            )}
          </div>
        </section>

        {/* DAFTAR KARTU MATERI */}
        {memuat ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="h-12 w-12 rounded-xl bg-slate-200" />
                <div className="mt-5 h-4 w-24 rounded bg-slate-200" />
                <div className="mt-3 h-5 w-3/4 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-full rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : pesanError ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
          >
            <p className="font-bold">
              Materi gagal dimuat
            </p>

            <p className="mt-2 break-words text-sm">
              {pesanError}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-800"
            >
              Coba Lagi
            </button>
          </div>
        ) : materiTersaring.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              🔎
            </div>

            <h3 className="mt-4 text-lg font-extrabold text-[#102744]">
              Materi Tidak Ditemukan
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Coba kata kunci lain atau pilih kategori Semua.
            </p>

            <button
              type="button"
              onClick={() => {
                setPencarian("");
                setKategoriAktif("Semua");
              }}
              className="mt-5 rounded-xl bg-[#102744] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {materiTersaring.map((item, index) => (
              <Link
                key={item.id}
                href={`/siswa/materi/${item.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"
              >
                {/* AKSEN KARTU */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#102744] via-blue-600 to-orange-400" />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#102744] text-2xl text-white shadow-md transition group-hover:bg-orange-500">
                    📘
                  </div>

                  <span className="max-w-[65%] truncate rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                    {item.kategori}
                  </span>
                </div>

                <div className="mt-5 flex-1">
                  <p className="text-[11px] font-extrabold tracking-widest text-blue-700">
                    MATERI {String(index + 1).padStart(2, "0")}
                  </p>

                  <h3 className="mt-2 text-base font-extrabold leading-snug text-[#102744] transition group-hover:text-orange-600">
                    {item.judul}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                    {item.deskripsi || "Buka materi untuk membaca penjelasan pembelajaran secara lengkap."}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs font-bold text-blue-700 transition group-hover:text-orange-600">
                    Pelajari Materi
                  </span>

                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-[#102744] transition group-hover:bg-orange-500 group-hover:text-white">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-12 rounded-2xl bg-[#102744] px-6 py-7 text-center text-white shadow-lg">
          <p className="font-extrabold tracking-wide">
            LMS SMKN 4 SOPPENG
          </p>

          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-orange-500" />

          <p className="mt-3 text-xs leading-6 text-slate-300">
            Materi Pembelajaran Teknik Kendaraan Ringan
          </p>

          <p className="mt-2 text-[10px] text-slate-500">
            Learning Management System
          </p>
        </footer>
      </div>
    </div>
  );
}
