
"use client";

import {
  ReactNode,
  Suspense,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ProfilSiswa = {
  nama: string | null;
  peran: string;
  foto_url: string | null;
};

function SiswaLayoutContent({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [profil, setProfil] = useState<ProfilSiswa | null>(null);
  const [fotoProfil, setFotoProfil] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuTerbuka, setMenuTerbuka] = useState(false);
  const [notifikasiPenilaian, setNotifikasiPenilaian] = useState(false);

  // MEMERIKSA AKUN SISWA
  useEffect(() => {
    let aktif = true;

    async function periksaSiswa() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      const { data, error: errorProfil } = await supabase
        .from("profil_pengguna")
        .select("nama, peran, foto_url")
        .eq("id", user.id)
        .single();

      if (errorProfil || !data || data.peran !== "siswa") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!aktif) return;

      setProfil(data);

      if (data.foto_url) {
        const { data: foto } = await supabase.storage
          .from("foto-profil-siswa")
          .createSignedUrl(data.foto_url, 3600);

        if (aktif && foto?.signedUrl) {
          setFotoProfil(foto.signedUrl);
        }
      }

      if (aktif) setLoading(false);
    }

    void periksaSiswa();

    return () => {
      aktif = false;
    };
  }, [router]);

  // NOTIFIKASI REAL-TIME HASIL PENILAIAN
  useEffect(() => {
    let aktif = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function pasangNotifikasi() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!aktif || !user) return;

      channel = supabase
        .channel(`notifikasi-nilai-siswa-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "pengumpulan_tugas",
            filter: `siswa_id=eq.${user.id}`,
          },
          (payload) => {
            const dataBaru = payload.new as {
              status?: string;
            };

            if (dataBaru.status === "dinilai") {
              setNotifikasiPenilaian(true);
            }
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.error(
              "Koneksi notifikasi penilaian mengalami masalah."
            );
          }
        });
    }

    void pasangNotifikasi();

    return () => {
      aktif = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  // KELUAR DARI APLIKASI
  async function keluar() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // MENU NAVIGASI SISWA
  const menu = [
    { nama: "Dashboard", alamat: "/siswa", ikon: "⌂" },
    {
      nama: "Materi Pembelajaran",
      alamat: "/siswa/materi",
      ikon: "▤",
    },
    {
      nama: "Tugas Siswa",
      alamat: "/siswa/tugas",
      ikon: "▣",
    },
    {
      nama: "Rekap Nilai",
      alamat: "/siswa/nilai",
      ikon: "▥",
    },
    {
      nama: "Profil Saya",
      alamat: "/siswa/profil",
      ikon: "◉",
    },
  ];

  // MENENTUKAN MENU AKTIF
  function menuAktif(alamat: string) {
    if (alamat === "/siswa") {
      return pathname === "/siswa";
    }

    return pathname === alamat || pathname.startsWith(alamat + "/");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />

          <p className="text-sm font-medium text-slate-600">
            Memeriksa akun siswa...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">

      {/* NOTIFIKASI PENILAIAN */}
      {notifikasiPenilaian && (
        <div className="fixed right-4 top-20 z-[60] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-green-200 bg-white p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-xl">
              🔔
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-800">
                Tugas Sudah Dinilai!
              </p>

              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Guru telah memberikan penilaian. Silakan buka halaman tugas
                untuk melihat nilai dan catatan guru.
              </p>

              <button
                type="button"
                onClick={() => {
                  setNotifikasiPenilaian(false);
                  router.push("/siswa/tugas");
                }}
                className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                Lihat Hasil Penilaian
              </button>
            </div>

            <button
              type="button"
              onClick={() => setNotifikasiPenilaian(false)}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Tutup notifikasi"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* HEADER MOBILE */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-700 bg-[#102744] px-4 py-3 text-white shadow-lg lg:hidden">
        <div>
          <p className="text-sm font-extrabold tracking-wide">
            LMS <span className="text-orange-400">SMKN 4 SOPPENG</span>
          </p>

          <p className="text-[10px] text-slate-300">
            Portal Pembelajaran Siswa
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMenuTerbuka(!menuTerbuka)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold transition hover:bg-slate-700"
        >
          {menuTerbuka ? "Tutup ✕" : "☰ Menu"}
        </button>
      </header>

      {/* LATAR MENU MOBILE */}
      {menuTerbuka && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuTerbuka(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-700 bg-[#102744] text-white shadow-xl transition-transform duration-300 ${
          menuTerbuka ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* IDENTITAS LMS */}
        <div className="border-b border-slate-700 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-xl font-black text-white shadow-lg shadow-orange-950/30">
              4
            </div>

            <div>
              <h1 className="text-base font-extrabold tracking-wide">
                LMS SMKN 4
              </h1>

              <p className="text-xs font-semibold text-orange-400">
                SOPPENG
              </p>
            </div>
          </div>

          <p className="mt-4 text-[11px] tracking-wide text-slate-400">
            LEARNING MANAGEMENT SYSTEM
          </p>
        </div>

        {/* PROFIL SISWA */}
        <div className="border-b border-slate-700 px-5 py-5">
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/70 p-3">
            {fotoProfil ? (
              <img
                src={fotoProfil}
                alt="Foto profil siswa"
                className="h-12 w-12 shrink-0 rounded-xl border-2 border-orange-400 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-slate-600 bg-slate-700 text-xl">
                👤
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {profil?.nama || "Siswa"}
              </p>

              <div className="mt-1 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400" />

                <p className="text-xs text-slate-400">
                  Siswa Aktif
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MENU NAVIGASI */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          <p className="mb-4 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
            Menu Utama
          </p>

          {menu.map((item) => {
            const aktif = menuAktif(item.alamat);

            return (
              <button
                key={item.nama}
                type="button"
                onClick={() => {
                  setMenuTerbuka(false);
                  router.push(item.alamat);
                }}
                className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  aktif
                    ? "border-blue-400/20 bg-blue-600 text-white shadow-lg shadow-blue-950/20"
                    : "border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${
                    aktif
                      ? "bg-white/15 text-white"
                      : "bg-slate-800 text-slate-300 group-hover:bg-slate-700"
                  }`}
                >
                  {item.ikon}
                </span>

                <span>{item.nama}</span>

                {aktif && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-orange-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* INFORMASI BAWAH SIDEBAR */}
        <div className="border-t border-slate-700 px-5 py-4">
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/50 p-3">
            <p className="text-xs font-bold text-white">
              Teknik Kendaraan Ringan
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              Portal Pembelajaran Digital
            </p>
          </div>

          <button
            type="button"
            onClick={keluar}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-600 hover:text-white"
          >
            <span>↪</span>
            Keluar dari Aplikasi
          </button>

          <p className="mt-4 text-center text-[10px] text-slate-500">
            LMS SMKN 4 SOPPENG
          </p>
        </div>
      </aside>

      {/* KONTEN HALAMAN */}
      <main className="min-h-screen pt-[68px] lg:ml-72 lg:pt-0">
        {children}
      </main>
    </div>
  );
}

// PEMBUNGKUS SUSPENSE UNTUK usePathname()
export default function SiswaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100">
          <p className="text-sm font-medium text-slate-600">
            Memuat halaman siswa...
          </p>
        </div>
      }
    >
      <SiswaLayoutContent>{children}</SiswaLayoutContent>
    </Suspense>
  );
}
