
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SiswaMenunggu = {
  id: string;
  nama: string | null;
  nis: string | null;
  kelas: string | null;
  status_pendaftaran: string;
};

type MateriTerbaru = {
  id: number;
  judul: string;
};

type TugasTerbaru = {
  id: string;
  judul: string;
  created_at: string;
};

export default function DashboardGuru() {
  const router = useRouter();

  const [memeriksaLogin, setMemeriksaLogin] = useState(true);
  const [memuatData, setMemuatData] = useState(true);
  const [namaGuru, setNamaGuru] = useState("Guru");

  const [jumlahMateri, setJumlahMateri] = useState(0);
  const [jumlahTugas, setJumlahTugas] = useState(0);
  const [jumlahPengumpulan, setJumlahPengumpulan] = useState(0);
  const [jumlahBelumDinilai, setJumlahBelumDinilai] = useState(0);

  const [siswa, setSiswa] = useState<SiswaMenunggu[]>([]);

  const [materiTerbaru, setMateriTerbaru] = useState<MateriTerbaru[]>([]);
  const [tugasTerbaru, setTugasTerbaru] = useState<TugasTerbaru[]>([]);

  const [memverifikasi, setMemverifikasi] = useState<string | null>(null);
  const [pesan, setPesan] = useState("");

  const tanggalHariIni = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  function formatTanggal(tanggal: string) {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(tanggal));
  }

  async function ambilDataDashboard() {
    const [
      hasilMateri,
      hasilTugas,
      hasilPengumpulan,
      hasilBelumDinilai,
      hasilSiswa,
      hasilMateriTerbaru,
      hasilTugasTerbaru,
    ] = await Promise.all([
      supabase
        .from("materi")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("tugas")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("pengumpulan_tugas")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("pengumpulan_tugas")
        .select("id", { count: "exact", head: true })
        .eq("status", "dikumpulkan"),

      supabase.rpc("daftar_siswa_menunggu"),

      supabase
        .from("materi")
        .select("id, judul")
        .order("id", { ascending: false })
        .limit(5),

      supabase
        .from("tugas")
        .select("id, judul, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (hasilMateri.error) {
      setPesan("Gagal memuat jumlah materi: " + hasilMateri.error.message);
    } else {
      setJumlahMateri(hasilMateri.count ?? 0);
    }

    if (hasilTugas.error) {
      setPesan("Gagal memuat jumlah tugas: " + hasilTugas.error.message);
    } else {
      setJumlahTugas(hasilTugas.count ?? 0);
    }

    if (hasilPengumpulan.error) {
      setPesan(
        "Gagal memuat jumlah pengumpulan: " +
          hasilPengumpulan.error.message
      );
    } else {
      setJumlahPengumpulan(hasilPengumpulan.count ?? 0);
    }

    if (hasilBelumDinilai.error) {
      setPesan(
        "Gagal memuat tugas yang belum dinilai: " +
          hasilBelumDinilai.error.message
      );
    } else {
      setJumlahBelumDinilai(hasilBelumDinilai.count ?? 0);
    }

    if (hasilSiswa.error) {
      setPesan("Gagal memuat daftar siswa: " + hasilSiswa.error.message);
      setSiswa([]);
    } else {
      setSiswa((hasilSiswa.data ?? []) as SiswaMenunggu[]);
    }

    if (hasilMateriTerbaru.error) {
      setPesan(
        "Gagal memuat materi terbaru: " + hasilMateriTerbaru.error.message
      );
      setMateriTerbaru([]);
    } else {
      setMateriTerbaru((hasilMateriTerbaru.data ?? []) as MateriTerbaru[]);
    }

    if (hasilTugasTerbaru.error) {
      setPesan(
        "Gagal memuat tugas terbaru: " + hasilTugasTerbaru.error.message
      );
      setTugasTerbaru([]);
    } else {
      setTugasTerbaru((hasilTugasTerbaru.data ?? []) as TugasTerbaru[]);
    }
  }

  useEffect(() => {
    let aktif = true;

    async function periksaAksesGuru() {
      try {
        const { data: sesiData, error: sesiError } =
          await supabase.auth.getSession();

        if (!aktif) return;

        const sesi = sesiData.session;

        if (sesiError || !sesi) {
          router.replace("/login");
          return;
        }

        const { data: profil, error: profilError } = await supabase
          .from("profil_pengguna")
          .select("nama, peran")
          .eq("id", sesi.user.id)
          .maybeSingle();

        if (!aktif) return;

        if (profilError || profil?.peran !== "guru") {
          router.replace("/login");
          return;
        }

        setNamaGuru(profil.nama || "Guru");
        setMemeriksaLogin(false);

        await ambilDataDashboard();
      } catch {
        if (aktif) {
          setPesan("Terjadi kesalahan saat memuat dashboard.");
        }
      } finally {
        if (aktif) {
          setMemuatData(false);
        }
      }
    }

    void periksaAksesGuru();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      aktif = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function muatUlangData() {
    setMemuatData(true);
    setPesan("");

    try {
      await ambilDataDashboard();
    } catch {
      setPesan("Terjadi kesalahan saat memuat data dashboard.");
    } finally {
      setMemuatData(false);
    }
  }

  async function verifikasiSiswa(
    item: SiswaMenunggu,
    status: "disetujui" | "ditolak"
  ) {
    const tindakan = status === "disetujui" ? "menyetujui" : "menolak";

    const yakin = window.confirm(
      `Apakah Bossku yakin ingin ${tindakan} pendaftaran ${item.nama ?? "siswa ini"}?`
    );

    if (!yakin) return;

    setMemverifikasi(item.id);
    setPesan("");

    try {
      const { error } = await supabase.rpc(
        "verifikasi_pendaftaran_siswa",
        {
          p_id: item.id,
          p_status: status,
        }
      );

      if (error) {
        setPesan("Verifikasi gagal: " + error.message);
        return;
      }

      setSiswa((daftar) => daftar.filter((s) => s.id !== item.id));

      setPesan(
        status === "disetujui"
          ? `Pendaftaran ${item.nama ?? "siswa"} berhasil disetujui.`
          : `Pendaftaran ${item.nama ?? "siswa"} berhasil ditolak.`
      );
    } catch {
      setPesan("Terjadi kesalahan saat memverifikasi siswa.");
    } finally {
      setMemverifikasi(null);
    }
  }

  function bukaHalaman(path: string) {
    router.push(path);
  }

  if (memeriksaLogin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-500">
          Memeriksa login dan hak akses guru...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">

      {/* HEADER DASHBOARD */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            LMS / Guru / Dashboard
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#102744]">
            Dashboard Guru
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Pusat pengelolaan pembelajaran SMKN 4 SOPPENG.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void muatUlangData()}
          disabled={memuatData || memverifikasi !== null}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          ↻ {memuatData ? "Memuat..." : "Muat Ulang"}
        </button>
      </header>

      {/* SAPAAN */}
      <section className="relative overflow-hidden rounded-2xl bg-[#102744] p-6 text-white shadow-lg sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-300">
            Learning Management System
          </p>

          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            Selamat Datang, {namaGuru}!
          </h2>

          <p className="mt-2 text-sm font-medium text-orange-300">
            {tanggalHariIni}
          </p>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">
            Selamat bekerja dan berkarya. Kelola pembelajaran,
            materi, tugas, dan aktivitas siswa Teknik Kendaraan
            Ringan melalui satu dashboard terpadu.
          </p>

          <button
            type="button"
            onClick={() => bukaHalaman("/guru/materi")}
            className="mt-6 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-orange-600"
          >
            Kelola Materi Pembelajaran →
          </button>
        </div>

        <div className="pointer-events-none absolute -right-10 -top-12 hidden h-64 w-64 rounded-full border-[30px] border-white/5 sm:block" />

        <div className="pointer-events-none absolute -bottom-28 right-24 hidden h-64 w-64 rounded-full border-[30px] border-orange-500/10 sm:block" />

        <div className="pointer-events-none absolute bottom-5 right-8 hidden text-7xl font-black text-white/10 xl:block">
          TKR
        </div>
      </section>

      {/* RINGKASAN DATA */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#102744]">
            Ringkasan Dashboard
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Informasi data pembelajaran saat ini.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

          {/* MENUNGGU PERSETUJUAN */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Menunggu Persetujuan
                </p>

                <p className="mt-3 text-3xl font-bold text-orange-600">
                  {memuatData ? "..." : siswa.length}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Pendaftaran siswa
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-3xl">
                👨‍🎓
              </div>
            </div>

            <div className="mt-5 h-1.5 rounded-full bg-orange-100">
              <div className="h-1.5 w-2/3 rounded-full bg-orange-500" />
            </div>
          </article>

          {/* TOTAL MATERI */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Materi
                </p>

                <p className="mt-3 text-3xl font-bold text-blue-700">
                  {memuatData ? "..." : jumlahMateri}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Materi pembelajaran
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                📚
              </div>
            </div>

            <div className="mt-5 h-1.5 rounded-full bg-blue-100">
              <div className="h-1.5 w-2/3 rounded-full bg-blue-600" />
            </div>
          </article>

          {/* TOTAL TUGAS */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Tugas
                </p>

                <p className="mt-3 text-3xl font-bold text-purple-700">
                  {memuatData ? "..." : jumlahTugas}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Tugas pembelajaran
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-3xl">
                📝
              </div>
            </div>

            <div className="mt-5 h-1.5 rounded-full bg-purple-100">
              <div className="h-1.5 w-2/3 rounded-full bg-purple-600" />
            </div>
          </article>

          {/* TOTAL PENGUMPULAN */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Pengumpulan
                </p>

                <p className="mt-3 text-3xl font-bold text-green-700">
                  {memuatData ? "..." : jumlahPengumpulan}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Tugas dari siswa
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-3xl">
                📥
              </div>
            </div>

            <div className="mt-5 h-1.5 rounded-full bg-green-100">
              <div className="h-1.5 w-2/3 rounded-full bg-green-600" />
            </div>
          </article>

          {/* BELUM DINILAI */}
          <article
            onClick={() => bukaHalaman("/guru/pengumpulan")}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Belum Dinilai
                </p>

                <p className="mt-3 text-3xl font-bold text-red-600">
                  {memuatData ? "..." : jumlahBelumDinilai}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Menunggu penilaian
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-3xl">
                🔔
              </div>
            </div>

            <div className="mt-5 h-1.5 rounded-full bg-red-100">
              <div className="h-1.5 w-2/3 rounded-full bg-red-500" />
            </div>

            <p className="mt-3 text-xs font-semibold text-red-600">
              Periksa pengumpulan →
            </p>
          </article>

        </div>
      </section>

      {/* AKTIVITAS TERBARU */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#102744]">
            Aktivitas Terbaru
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Materi dan tugas yang terakhir dibuat.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* MATERI TERBARU */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                  📚
                </div>

                <div>
                  <h3 className="font-bold text-[#102744]">
                    Materi Terbaru
                  </h3>

                  <p className="text-xs text-slate-500">
                    Materi pembelajaran
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => bukaHalaman("/guru/materi")}
                className="text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                Lihat semua →
              </button>
            </div>

            {memuatData ? (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                Memuat materi...
              </p>
            ) : materiTerbaru.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                Belum ada materi pembelajaran.
              </p>
            ) : (
              <div className="space-y-3">
                {materiTerbaru.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <span>📖</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">
                        {item.judul}
                      </p>

                      <p className="text-xs text-slate-400">
                        ID materi: {item.id}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TUGAS TERBARU */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-2xl">
                  📝
                </div>

                <div>
                  <h3 className="font-bold text-[#102744]">
                    Tugas Terbaru
                  </h3>

                  <p className="text-xs text-slate-500">
                    Tugas pembelajaran
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => bukaHalaman("/guru/tugas")}
                className="text-sm font-semibold text-purple-700 hover:text-purple-900"
              >
                Lihat semua →
              </button>
            </div>

            {memuatData ? (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                Memuat tugas...
              </p>
            ) : tugasTerbaru.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                Belum ada tugas pembelajaran.
              </p>
            ) : (
              <div className="space-y-3">
                {tugasTerbaru.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                      <span>📄</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">
                        {item.judul}
                      </p>

                      <p className="text-xs text-slate-400">
                        Dibuat: {formatTanggal(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* AKSES CEPAT */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#102744]">
            Akses Pengelolaan
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Pilih fitur yang ingin digunakan.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          <button
            type="button"
            onClick={() => bukaHalaman("/guru/materi")}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-3xl">
                📚
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-[#102744]">
                  Kelola Materi Pembelajaran
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Tambah, edit, dan hapus materi.
                </p>
              </div>

              <span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600">
                →
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => bukaHalaman("/guru/tugas")}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-purple-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-50 text-3xl">
                📝
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-[#102744]">
                  Kelola Tugas Pembelajaran
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Buat dan kelola tugas siswa.
                </p>
              </div>

              <span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-purple-600">
                →
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => bukaHalaman("/guru/pengumpulan")}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-green-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-50 text-3xl">
                📋
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-[#102744]">
                  Pengumpulan dan Penilaian
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Periksa jawaban dan nilai siswa.
                </p>
              </div>

              <span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-green-600">
                →
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => bukaHalaman("/guru/profil")}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 text-3xl">
                👤
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-[#102744]">
                  Profil Guru
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Lihat dan ubah informasi profil.
                </p>
              </div>

              <span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-orange-600">
                →
              </span>
            </div>
          </button>

        </div>
      </section>

      {/* VERIFIKASI SISWA */}
      <section
        id="verifikasi"
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#102744]">
                Verifikasi Siswa
              </h2>

              {siswa.length > 0 && (
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
                  {siswa.length} menunggu
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Periksa pendaftaran siswa sebelum memberikan akses LMS.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void muatUlangData()}
            disabled={memuatData || memverifikasi !== null}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            ↻ {memuatData ? "Memuat..." : "Muat Ulang"}
          </button>
        </div>

        {pesan && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700"
          >
            {pesan}
          </div>
        )}

        {memuatData ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            Memuat daftar pendaftar...
          </div>
        ) : siswa.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="text-4xl">✓</div>

            <p className="mt-3 font-semibold text-slate-700">
              Tidak ada pendaftaran yang menunggu verifikasi.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Daftar pendaftar siswa akan muncul di bagian ini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {siswa.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-orange-200 hover:bg-orange-50/30"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-800">
                        {item.nama || "Nama belum tersedia"}
                      </h3>

                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        Menunggu verifikasi
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      NIS: {item.nis || "Belum tersedia"}
                    </p>

                    <p className="text-sm text-slate-600">
                      Kelas: {item.kelas || "Belum tersedia"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={memverifikasi !== null}
                      onClick={() => void verifikasiSiswa(item, "disetujui")}
                      className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-60"
                    >
                      {memverifikasi === item.id ? "Memproses..." : "✓ Setujui"}
                    </button>

                    <button
                      type="button"
                      disabled={memverifikasi !== null}
                      onClick={() => void verifikasiSiswa(item, "ditolak")}
                      className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      ✕ Tolak
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">
        LMS SMKN 4 SOPPENG
        <span className="mx-2">•</span>
        Sistem Pembelajaran Teknik Kendaraan Ringan
      </footer>

    </div>
  );
}
