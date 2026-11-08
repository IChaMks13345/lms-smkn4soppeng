
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Pengumpulan = {
  id: string;
  tugas_id: string;
  nilai: number | null;
  catatan_guru: string | null;
  dikumpulkan_pada: string;
  status: string;
};

type Tugas = {
  id: string;
  judul: string;
};

type RekapNilai = Pengumpulan & {
  judul_tugas: string;
};

export default function HalamanRekapNilai() {
  const [daftarNilai, setDaftarNilai] = useState<RekapNilai[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [pesanError, setPesanError] = useState("");

  useEffect(() => {
    let aktif = true;

    async function ambilNilai() {
      setMemuat(true);
      setPesanError("");

      const {
        data: { user },
        error: errorUser,
      } = await supabase.auth.getUser();

      if (errorUser || !user) {
        if (aktif) {
          setPesanError("Sesi login tidak ditemukan. Silakan login kembali.");
          setMemuat(false);
        }
        return;
      }

      const { data: dataPengumpulan, error: errorPengumpulan } =
        await supabase
          .from("pengumpulan_tugas")
          .select(
            "id, tugas_id, nilai, catatan_guru, dikumpulkan_pada, status"
          )
          .eq("siswa_id", user.id)
          .eq("status", "dinilai")
          .order("dikumpulkan_pada", { ascending: false });

      if (errorPengumpulan) {
        if (aktif) {
          setPesanError("Data nilai belum dapat dimuat. Silakan coba lagi.");
          setMemuat(false);
        }
        return;
      }

      const pengumpulan = (dataPengumpulan ?? []) as Pengumpulan[];

      if (pengumpulan.length === 0) {
        if (aktif) {
          setDaftarNilai([]);
          setMemuat(false);
        }
        return;
      }

      const daftarIdTugas = [
        ...new Set(pengumpulan.map((item) => item.tugas_id)),
      ];

      const { data: dataTugas, error: errorTugas } = await supabase
        .from("tugas")
        .select("id, judul")
        .in("id", daftarIdTugas);

      if (errorTugas) {
        if (aktif) {
          setPesanError("Informasi judul tugas belum dapat dimuat.");
          setMemuat(false);
        }
        return;
      }

      const tugas = (dataTugas ?? []) as Tugas[];

      const hasil: RekapNilai[] = pengumpulan.map((item) => {
        const informasiTugas = tugas.find(
          (t) => t.id === item.tugas_id
        );

        return {
          ...item,
          judul_tugas: informasiTugas?.judul ?? "Tugas tidak ditemukan",
        };
      });

      if (aktif) {
        setDaftarNilai(hasil);
        setMemuat(false);
      }
    }

    void ambilNilai();

    return () => {
      aktif = false;
    };
  }, []);

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  const nilaiValid = daftarNilai
    .map((item) => item.nilai)
    .filter((nilai): nilai is number => nilai !== null);

  const jumlahDinilai = daftarNilai.length;

  const rataRata =
    nilaiValid.length > 0
      ? nilaiValid.reduce((total, nilai) => total + nilai, 0) /
        nilaiValid.length
      : 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">

        {/* TOMBOL KEMBALI */}
        <Link
          href="/siswa"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-50"
        >
          ← Kembali ke Dashboard
        </Link>

        {/* HEADER */}
        <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-800 p-6 text-white shadow-lg sm:p-9">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl">
              📊
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
            Rekap Nilai Siswa
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
            Lihat hasil penilaian tugas, rata-rata nilai, dan catatan
            dari guru sebagai bahan evaluasi pembelajaran.
          </p>
        </header>

        {/* RINGKASAN NILAI */}
        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
              Hasil Pembelajaran
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              Ringkasan Nilai Saya
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">

            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">
                Tugas Sudah Dinilai
              </p>

              <p className="mt-3 text-3xl font-extrabold text-blue-700">
                {memuat ? "..." : jumlahDinilai}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Jumlah tugas yang telah dinilai guru
              </p>
            </div>

            <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">
                Rata-rata Nilai
              </p>

              <p className="mt-3 text-3xl font-extrabold text-green-700">
                {memuat ? "..." : nilaiValid.length > 0
                  ? rataRata.toFixed(1)
                  : "-"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Rata-rata dari nilai yang sudah tersedia
              </p>
            </div>

          </div>
        </section>

        {/* PESAN ERROR */}
        {pesanError && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {pesanError}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ml-2 font-bold underline"
            >
              Muat ulang
            </button>
          </div>
        )}

        {/* DAFTAR NILAI */}
        <section className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
              Evaluasi Belajar
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
              Daftar Hasil Penilaian
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Nilai tugas yang telah diberikan oleh guru.
            </p>
          </div>

          {memuat ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-3xl">⏳</div>
              <p className="mt-3 font-semibold text-slate-700">
                Memuat data nilai...
              </p>
            </div>
          ) : pesanError ? null : daftarNilai.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">📚</div>
              <h3 className="mt-4 text-lg font-bold text-slate-800">
                Belum Ada Nilai
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Hasil penilaian tugas akan muncul di halaman ini
                setelah guru memberikan nilai.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {daftarNilai.map((item, index) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-extrabold text-blue-900">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                          Tugas Pembelajaran
                        </p>

                        <h3 className="mt-1 break-words text-lg font-extrabold text-slate-900">
                          {item.judul_tugas}
                        </h3>

                        <p className="mt-2 text-xs text-slate-500">
                          Dikumpulkan: {formatTanggal(item.dikumpulkan_pada)}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-24 rounded-xl bg-green-50 px-5 py-3 text-center">
                      <p className="text-xs font-bold text-green-700">
                        NILAI
                      </p>
                      <p className="mt-1 text-2xl font-extrabold text-green-800">
                        {item.nilai ?? "-"}
                      </p>
                    </div>
                  </div>

                  {item.catatan_guru && (
                    <div className="border-t border-slate-100 bg-slate-50 p-5 sm:px-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Catatan Guru
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {item.catatan_guru}
                      </p>
                    </div>
                  )}

                  {!item.catatan_guru && (
                    <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
                      <p className="text-xs text-slate-500">
                        Tidak ada catatan tambahan dari guru.
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* TOMBOL KE HALAMAN TUGAS */}
        <div className="mt-8">
          <Link
            href="/siswa/tugas"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
          >
            Lihat Daftar Tugas →
          </Link>
        </div>

        {/* FOOTER */}
        <footer className="mt-10 rounded-2xl bg-slate-900 px-6 py-7 text-center text-white">
          <p className="font-bold">LMS SMKN 4 SOPPENG</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Belajar, berlatih, dan menjadi tenaga profesional
            di bidang otomotif.
          </p>
        </footer>

      </div>
    </main>
  );
}
