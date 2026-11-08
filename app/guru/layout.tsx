
"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const NAMA_BUCKET = "foto-profil-siswa";

export default function LayoutGuru({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [nama, setNama] = useState("Guru");
  const [foto, setFoto] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [jumlahBelumDinilai, setJumlahBelumDinilai] = useState(0);

  useEffect(() => {
    async function muatProfilGuru() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profil_pengguna")
        .select("nama, peran, foto_url")
        .eq("id", authData.user.id)
        .single();

      if (error || data?.peran !== "guru") {
        router.replace("/login");
        return;
      }

      setNama(data.nama || "Guru");

      if (data.foto_url) {
        const { data: fotoData } = await supabase.storage
          .from(NAMA_BUCKET)
          .createSignedUrl(data.foto_url, 3600);

        if (fotoData?.signedUrl) {
          setFoto(fotoData.signedUrl);
        }
      }

      setMemuat(false);
    }

    void muatProfilGuru();
  }, [router]);

  // MENGHITUNG DAN MEMANTAU PENGUMPULAN SECARA REAL-TIME
  useEffect(() => {
    let aktif = true;

    async function muatJumlahBelumDinilai() {
      const { count, error } = await supabase
        .from("pengumpulan_tugas")
        .select("id", { count: "exact", head: true })
        .eq("status", "dikumpulkan");

      if (!aktif) return;

      if (!error) {
        setJumlahBelumDinilai(count || 0);
      } else {
        console.error(
          "Gagal memuat jumlah pengumpulan:",
          error.message
        );
      }
    }

    void muatJumlahBelumDinilai();

    const channel = supabase
      .channel("notifikasi-pengumpulan-guru")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pengumpulan_tugas",
        },
        () => {
          void muatJumlahBelumDinilai();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            "Koneksi notifikasi real-time mengalami masalah."
          );
        }
      });

    return () => {
      aktif = false;
      void supabase.removeChannel(channel);
    };
  }, [pathname]);

  // MENU NAVIGASI GURU
  const menu = [
    {
      nama: "Dashboard Guru",
      alamat: "/guru",
      ikon: "🏠",
    },
    {
      nama: "Materi Pembelajaran",
      alamat: "/guru/materi",
      ikon: "📚",
    },
    {
      nama: "Tugas Pembelajaran",
      alamat: "/guru/tugas",
      ikon: "📝",
    },
    {
      nama: "Pengumpulan dan Penilaian",
      alamat: "/guru/pengumpulan",
      ikon: "📋",
    },
    {
      nama: "Rekap Nilai",
      alamat: "/guru/nilai",
      ikon: "📊",
    },
    {
      nama: "Profil Guru",
      alamat: "/guru/profil",
      ikon: "👤",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      <aside className="w-full bg-slate-900 text-white md:min-h-screen md:w-72 md:shrink-0">
        <div className="border-b border-slate-700 p-6 text-center">
          <h2 className="text-lg font-bold">
            LMS SMKN 4 SOPPENG
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Panel Guru
          </p>
        </div>

        {/* PROFIL GURU */}
        <div className="border-b border-slate-700 px-5 py-6 text-center">
          {foto ? (
            <img
              src={foto}
              alt="Foto profil guru"
              className="mx-auto h-20 w-20 rounded-full border-2 border-white object-cover"
            />
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 text-3xl">
              👤
            </div>
          )}

          <p className="mt-3 font-semibold">
            {memuat ? "Memuat profil..." : nama}
          </p>
          <p className="text-xs text-slate-300">Guru</p>
        </div>

        {/* MENU SIDEBAR */}
        <nav className="space-y-1 p-4">
          {menu.map((item) => {
            const aktif =
              item.alamat === "/guru"
                ? pathname === "/guru"
                : pathname === item.alamat ||
                  pathname.startsWith(item.alamat + "/");

            return (
              <Link
                key={item.alamat}
                href={item.alamat}
                className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm transition ${
                  aktif
                    ? "bg-blue-600 font-semibold text-white"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span>{item.ikon}</span>
                  <span>{item.nama}</span>
                </span>

                {item.alamat === "/guru/pengumpulan" &&
                  jumlahBelumDinilai > 0 && (
                    <span className="min-w-6 rounded-full bg-orange-500 px-2 py-1 text-center text-xs font-bold text-white">
                      {jumlahBelumDinilai}
                    </span>
                  )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* KONTEN HALAMAN */}
      <main className="min-w-0 flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
