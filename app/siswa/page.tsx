
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MateriTerbaru = {
  id: number;
  judul: string;
  kategori: string;
  deskripsi: string | null;
};

type TugasTerbaru = {
  id: string;
  judul: string;
  deskripsi: string | null;
  batas_waktu: string | null;
  created_at: string;
};

function formatTanggal(tanggal: string | null) {
  if (!tanggal) return "Tidak ditentukan";

  const hasil = new Date(tanggal);

  if (Number.isNaN(hasil.getTime())) {
    return "Tidak ditentukan";
  }

  return hasil.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function HalamanSiswa() {
  const [materiTerbaru, setMateriTerbaru] = useState<MateriTerbaru[]>([]);
  const [tugasTerbaru, setTugasTerbaru] = useState<TugasTerbaru[]>([]);

  const [memuatMateri, setMemuatMateri] = useState(true);
  const [memuatTugas, setMemuatTugas] = useState(true);

  const [errorMateri, setErrorMateri] = useState("");
  const [errorTugas, setErrorTugas] = useState("");

  useEffect(() => {
    let aktif = true;

    async function ambilMateriTerbaru() {
      setMemuatMateri(true);
      setErrorMateri("");

      const { data, error } = await supabase
        .from("materi")
        .select("id, judul, kategori, deskripsi")
        .order("id", { ascending: false })
        .limit(3);

      if (!aktif) return;

      if (error) {
        console.error("Gagal mengambil materi terbaru:", error.message);
        setErrorMateri("Materi terbaru belum dapat dimuat.");
      } else {
        setMateriTerbaru((data || []) as MateriTerbaru[]);
      }

      setMemuatMateri(false);
    }

    async function ambilTugasTerbaru() {
      setMemuatTugas(true);
      setErrorTugas("");

      const { data, error } = await supabase
        .from("tugas")
        .select("id, judul, deskripsi, batas_waktu, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      if (!aktif) return;

      if (error) {
        console.error("Gagal mengambil tugas terbaru:", error.message);
        setErrorTugas("Tugas terbaru belum dapat dimuat.");
      } else {
        setTugasTerbaru((data || []) as TugasTerbaru[]);
      }

      setMemuatTugas(false);
    }

    void ambilMateriTerbaru();
    void ambilTugasTerbaru();

    return () => {
      aktif = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">

      {/* HEADER */}
      <header className="hidden items-center justify-between border-b border-slate-200 bg-white px-8 py-5 lg:flex">
        <div>
          <p className="text-lg font-extrabold tracking-tight text-[#102744]">
            Dashboard Siswa
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Portal Pembelajaran Digital
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-extrabold text-[#102744]">
            LMS SMKN 4 SOPPENG
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Teknik Kendaraan Ringan
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* SAMBUTAN */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#102744] via-[#173b63] to-[#24517b] p-6 text-white shadow-xl sm:p-10">

          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-28 right-32 h-64 w-64 rounded-full border-[25px] border-orange-400/10" />

          <div className="relative z-10 max-w-3xl">

            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-400/10 px-4 py-2 text-[11px] font-bold tracking-widest text-orange-300">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              DASHBOARD SISWA
            </span>

            <h1 className="mt-6 text-3xl font-extrabold leading-tight sm:text-5xl">
              Selamat Datang
              <br />
              di Ruang Belajar!
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
              Selamat belajar di LMS SMKN 4 Soppeng.
              Manfaatkan fasilitas pembelajaran untuk mempelajari
              materi, mengerjakan tugas, dan meningkatkan
              kompetensi di bidang Teknik Kendaraan Ringan.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/siswa/materi"
                className="inline-flex items-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-600"
              >
                Mulai Belajar
                <span className="ml-2">→</span>
              </Link>

              <Link
                href="/siswa/tugas"
                className="inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Lihat Tugas
              </Link>
            </div>
          </div>
        </section>

        {/* AKTIVITAS PEMBELAJARAN */}
        <section className="mt-9">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
              Fasilitas LMS
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-[#102744]">
              Aktivitas Pembelajaran
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Akses fasilitas belajar yang tersedia untuk siswa.
            </p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">

            {/* KARTU MATERI */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">

              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                  📚
                </div>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Pembelajaran
                </span>
              </div>

              <h3 className="mt-5 text-lg font-extrabold text-[#102744]">
                Materi Pembelajaran
              </h3>

              <p className="mt-2 text-sm leading-7 text-slate-500">
                Pelajari materi yang telah disediakan guru.
                Tersedia bahan bacaan, gambar, video, dan
                sumber belajar pendukung.
              </p>

              <Link
                href="/siswa/materi"
                className="mt-5 inline-flex items-center text-sm font-bold text-blue-700 transition group-hover:text-orange-600"
              >
                Buka Materi
                <span className="ml-2 transition group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>

            {/* KARTU TUGAS */}
            <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg">

              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-3xl">
                  📝
                </div>

                <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                  Penugasan
                </span>
              </div>

              <h3 className="mt-5 text-lg font-extrabold text-[#102744]">
                Tugas Siswa
              </h3>

              <p className="mt-2 text-sm leading-7 text-slate-500">
                Lihat tugas yang diberikan guru, kerjakan
                sesuai petunjuk, dan kirimkan hasil pekerjaan
                melalui LMS.
              </p>

              <Link
                href="/siswa/tugas"
                className="mt-5 inline-flex items-center text-sm font-bold text-orange-600 transition group-hover:text-orange-700"
              >
                Buka Tugas
                <span className="ml-2 transition group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* MATERI TERBARU */}
        <section className="mt-10">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
                Pembelajaran
              </p>

              <h2 className="mt-2 text-2xl font-extrabold text-[#102744]">
                Materi Terbaru
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Materi pembelajaran yang baru ditambahkan oleh guru.
              </p>
            </div>

            <Link
              href="/siswa/materi"
              className="inline-flex items-center text-sm font-bold text-blue-700 hover:text-orange-600"
            >
              Lihat Semua Materi →
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {memuatMateri ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                Memuat materi terbaru...
              </div>
            ) : errorMateri ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 md:col-span-2 xl:col-span-3">
                {errorMateri}
              </div>
            ) : materiTerbaru.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center md:col-span-2 xl:col-span-3">
                <div className="text-3xl">📚</div>
                <p className="mt-3 font-bold text-[#102744]">
                  Belum ada materi
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Materi terbaru dari guru akan muncul di sini.
                </p>
              </div>
            ) : (
              materiTerbaru.map((item, index) => (
                <article
                  key={item.id}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                      {item.kategori || "Materi"}
                    </span>

                    <span className="text-xs font-semibold text-slate-400">
                      #{index + 1}
                    </span>
                  </div>

                  <h3 className="mt-4 line-clamp-2 text-base font-extrabold leading-6 text-[#102744]">
                    {item.judul}
                  </h3>

                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">
                    {item.deskripsi || "Belum ada deskripsi materi."}
                  </p>

                  <Link
                    href={`/siswa/materi/${item.id}`}
                    className="mt-5 inline-flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-bold text-blue-700 transition group-hover:text-orange-600"
                  >
                    Pelajari Materi
                    <span className="transition group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>

        {/* TUGAS TERBARU */}
        <section className="mt-10">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
                Penugasan
              </p>

              <h2 className="mt-2 text-2xl font-extrabold text-[#102744]">
                Tugas Terbaru
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Daftar tugas yang baru diberikan oleh guru.
              </p>
            </div>

            <Link
              href="/siswa/tugas"
              className="inline-flex items-center text-sm font-bold text-orange-600 hover:text-orange-700"
            >
              Lihat Semua Tugas →
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {memuatTugas ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                Memuat tugas terbaru...
              </div>
            ) : errorTugas ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 md:col-span-2 xl:col-span-3">
                {errorTugas}
              </div>
            ) : tugasTerbaru.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center md:col-span-2 xl:col-span-3">
                <div className="text-3xl">📝</div>
                <p className="mt-3 font-bold text-[#102744]">
                  Belum ada tugas
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Tugas terbaru dari guru akan muncul di sini.
                </p>
              </div>
            ) : (
              tugasTerbaru.map((item, index) => (
                <article
                  key={item.id}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-orange-700">
                      Tugas Siswa
                    </span>

                    <span className="text-xs font-semibold text-slate-400">
                      #{index + 1}
                    </span>
                  </div>

                  <h3 className="mt-4 line-clamp-2 text-base font-extrabold leading-6 text-[#102744]">
                    {item.judul}
                  </h3>

                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">
                    {item.deskripsi || "Tidak ada deskripsi tugas."}
                  </p>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Batas Pengumpulan
                    </p>

                    <p className="mt-1 text-sm font-bold text-[#102744]">
                      {formatTanggal(item.batas_waktu)}
                    </p>
                  </div>

                  <Link
                    href="/siswa/tugas"
                    className="mt-4 inline-flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-bold text-orange-600 transition group-hover:text-orange-700"
                  >
                    Lihat dan Kerjakan Tugas
                    <span className="transition group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>

        {/* IDENTITAS JURUSAN */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-7">

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#102744] text-3xl text-white">
              ⚙️
            </div>

            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
                Kompetensi Keahlian
              </p>

              <h3 className="mt-2 text-lg font-extrabold text-[#102744]">
                Teknik Kendaraan Ringan
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Belajar, berlatih, dan mengembangkan kompetensi
                di bidang teknologi otomotif untuk menjadi
                tenaga profesional yang kompeten.
              </p>
            </div>

            <div className="hidden h-16 w-px bg-slate-200 sm:block" />

            <div className="sm:min-w-36 sm:text-right">
              <p className="text-xs font-semibold text-slate-400">
                PLATFORM
              </p>
              <p className="mt-1 text-sm font-extrabold text-[#102744]">
                LMS DIGITAL
              </p>
              <p className="mt-1 text-xs text-slate-500">
                SMKN 4 Soppeng
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-10 rounded-2xl bg-[#102744] px-6 py-7 text-center text-white shadow-lg">
          <p className="font-extrabold tracking-wide">
            LMS SMKN 4 SOPPENG
          </p>

          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-orange-500" />

          <p className="mt-3 text-xs leading-6 text-slate-300">
            Belajar, berlatih, dan menjadi tenaga profesional
            di bidang otomotif.
          </p>

          <p className="mt-4 text-[10px] text-slate-500">
            Learning Management System
          </p>
        </footer>

      </div>
    </div>
  );
}
