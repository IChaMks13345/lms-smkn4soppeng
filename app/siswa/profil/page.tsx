
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const NAMA_BUCKET = "foto-profil-siswa";
const BATAS_UKURAN = 2 * 1024 * 1024;

type ProfilSiswa = {
  nama: string | null;
  nis: string | null;
  kelas: string | null;
  peran: string;
  status_pendaftaran: string;
  foto_url: string | null;
};

export default function ProfilSiswaPage() {
  const router = useRouter();

  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [mengunggah, setMengunggah] = useState(false);

  const [profil, setProfil] = useState<ProfilSiswa | null>(null);

  const [nama, setNama] = useState("");
  const [nis, setNis] = useState("");
  const [kelas, setKelas] = useState("");

  const [namaAwal, setNamaAwal] = useState("");
  const [nisAwal, setNisAwal] = useState("");
  const [kelasAwal, setKelasAwal] = useState("");

  const [fileFoto, setFileFoto] = useState<File | null>(null);
  const [fotoTampil, setFotoTampil] = useState("");
  const [fotoLama, setFotoLama] = useState("");

  const [pesan, setPesan] = useState("");
  const [berhasil, setBerhasil] = useState(false);

  useEffect(() => {
    let aktif = true;

    async function muatProfil() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (!aktif) return;

      if (userError || !userData.user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profil_pengguna")
        .select("nama, nis, kelas, peran, status_pendaftaran, foto_url")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (!aktif) return;

      if (error || !data) {
        setPesan(
          error
            ? `Gagal memuat profil: ${error.message}`
            : "Profil pengguna tidak ditemukan."
        );
        setMemuat(false);
        return;
      }

      const dataProfil = data as ProfilSiswa;

      setProfil(dataProfil);

      setNama(dataProfil.nama ?? "");
      setNis(dataProfil.nis ?? "");
      setKelas(dataProfil.kelas ?? "");

      setNamaAwal(dataProfil.nama ?? "");
      setNisAwal(dataProfil.nis ?? "");
      setKelasAwal(dataProfil.kelas ?? "");

      if (
        dataProfil.peran === "siswa" &&
        dataProfil.status_pendaftaran === "disetujui" &&
        dataProfil.foto_url
      ) {
        setFotoLama(dataProfil.foto_url);

        const { data: foto } = await supabase.storage
          .from(NAMA_BUCKET)
          .createSignedUrl(dataProfil.foto_url, 3600);

        if (!aktif) return;

        if (foto?.signedUrl) {
          setFotoTampil(foto.signedUrl);
        }
      }

      if (aktif) setMemuat(false);
    }

    void muatProfil();

    return () => {
      aktif = false;
    };
  }, [router]);

  async function simpanProfil(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setPesan("");
    setBerhasil(false);

    if (!nama.trim() || !nis.trim() || !kelas.trim()) {
      setPesan("Nama, NIS, dan kelas wajib diisi.");
      return;
    }

    if (nama.trim().length < 3 || nama.trim().length > 100) {
      setPesan("Nama harus 3 sampai 100 karakter.");
      return;
    }

    if (nis.trim().length > 30 || kelas.trim().length > 50) {
      setPesan("NIS maksimal 30 dan kelas maksimal 50 karakter.");
      return;
    }

    setMenyimpan(true);

    try {
      const { error } = await supabase.rpc(
        "simpan_profil_siswa",
        {
          p_nama: nama.trim(),
          p_nis: nis.trim(),
          p_kelas: kelas.trim(),
        }
      );

      if (error) {
        setPesan("Gagal menyimpan profil: " + error.message);
        return;
      }

      setNamaAwal(nama.trim());
      setNisAwal(nis.trim());
      setKelasAwal(kelas.trim());

      setProfil((sebelumnya) =>
        sebelumnya
          ? {
              ...sebelumnya,
              nama: nama.trim(),
              nis: nis.trim(),
              kelas: kelas.trim(),
            }
          : sebelumnya
      );

      setBerhasil(true);
      setPesan("Profil siswa berhasil diperbarui.");
    } catch {
      setPesan("Terjadi kesalahan saat menyimpan profil.");
    } finally {
      setMenyimpan(false);
    }
  }

  // Memilih dan memeriksa foto
  function pilihFoto(file: File | null) {
    setPesan("");
    setBerhasil(false);
    setFileFoto(null);

    if (!file) return;

    const tipeDiizinkan = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!tipeDiizinkan.includes(file.type)) {
      setPesan("Pilih foto berformat JPG, PNG, atau WebP.");
      return;
    }

    if (file.size > BATAS_UKURAN) {
      setPesan("Ukuran foto maksimal 2 MB.");
      return;
    }

    setFileFoto(file);
    setFotoTampil(URL.createObjectURL(file));
  }

  // Menyimpan foto profil
  async function unggahFoto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setPesan("");
    setBerhasil(false);

    if (!profil || !fileFoto) {
      setPesan("Silakan pilih foto terlebih dahulu.");
      return;
    }

    if (
      profil.peran !== "siswa" ||
      profil.status_pendaftaran !== "disetujui"
    ) {
      setPesan("Akun belum memiliki izin mengganti foto.");
      return;
    }

    setMengunggah(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        setPesan("Sesi login berakhir. Silakan login kembali.");
        router.replace("/login");
        return;
      }

      const userId = userData.user.id;

      const ekstensi =
        fileFoto.type === "image/png"
          ? "png"
          : fileFoto.type === "image/webp"
            ? "webp"
            : "jpg";

      const lokasiFoto =
        `${userId}/avatar-${Date.now()}.${ekstensi}`;

      const { error: uploadError } = await supabase.storage
        .from(NAMA_BUCKET)
        .upload(lokasiFoto, fileFoto, {
          contentType: fileFoto.type,
          upsert: false,
        });

      if (uploadError) {
        setPesan("Gagal mengunggah foto: " + uploadError.message);
        return;
      }

      const { error: simpanError } = await supabase.rpc(
        "simpan_foto_profil",
        {
          p_foto_url: lokasiFoto,
        }
      );

      if (simpanError) {
        setPesan(
          "Foto terunggah, tetapi gagal menyimpan profil: " +
            simpanError.message
        );
        return;
      }

      setProfil((sebelumnya) =>
        sebelumnya
          ? { ...sebelumnya, foto_url: lokasiFoto }
          : sebelumnya
      );

      setFotoLama(lokasiFoto);
      setFileFoto(null);

      const { data: foto, error: fotoError } =
        await supabase.storage
          .from(NAMA_BUCKET)
          .createSignedUrl(lokasiFoto, 3600);

      if (fotoError || !foto?.signedUrl) {
        setFotoTampil("");
        setBerhasil(true);
        setPesan(
          "Foto berhasil disimpan. Muat ulang halaman untuk melihat foto."
        );
        return;
      }

      setFotoTampil(foto.signedUrl);
      setBerhasil(true);
      setPesan("Foto profil berhasil diperbarui.");
    } catch {
      setPesan("Terjadi kesalahan. Silakan coba kembali.");
    } finally {
      setMengunggah(false);
    }
  }

  if (memuat) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-slate-600">Memuat profil siswa...</p>
      </main>
    );
  }

  if (
    !profil ||
    profil.peran !== "siswa" ||
    profil.status_pendaftaran !== "disetujui"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow">
          <h1 className="text-xl font-bold text-slate-800">
            Profil Siswa
          </h1>

          <p className="mt-3 text-slate-600">
            {pesan ||
              "Halaman ini hanya tersedia bagi siswa yang telah disetujui guru."}
          </p>

          <button
            type="button"
            onClick={() => router.push("/siswa")}
            className="mt-5 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Kembali ke Dashboard
          </button>
        </section>
      </main>
    );
  }

  const profilBerubah =
    nama.trim() !== namaAwal.trim() ||
    nis.trim() !== nisAwal.trim() ||
    kelas.trim() !== kelasAwal.trim();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl">
        <header className="rounded-t-2xl bg-blue-900 p-6 text-white">
          <p className="text-sm text-blue-200">
            LMS SMKN 4 SOPPENG
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            Profil Siswa
          </h1>

          <p className="mt-2 text-sm text-blue-100">
            Kelola identitas dan foto profil akun pembelajaran Anda.
          </p>
        </header>

        <section className="rounded-b-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center">
            {fotoTampil ? (
              <img
                src={fotoTampil}
                alt="Foto profil siswa"
                className="h-32 w-32 rounded-full border-4 border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-blue-100 text-4xl font-bold text-blue-800">
                {(nama || "S").trim().charAt(0).toUpperCase()}
              </div>
            )}

            <h2 className="mt-4 text-xl font-bold text-slate-800">
              {nama || "Siswa"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Status: Disetujui
            </p>
          </div>

          {/* FORM IDENTITAS SISWA */}
          <form onSubmit={simpanProfil} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Nama Lengkap
              </label>

              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                maxLength={100}
                required
                className="w-full rounded-xl border border-slate-300 p-3 text-slate-700 focus:border-blue-500 focus:outline-none"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                NIS
              </label>

              <input
                type="text"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                maxLength={30}
                required
                className="w-full rounded-xl border border-slate-300 p-3 text-slate-700 focus:border-blue-500 focus:outline-none"
                placeholder="Masukkan NIS"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Kelas
              </label>

              <input
                type="text"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                maxLength={50}
                required
                className="w-full rounded-xl border border-slate-300 p-3 text-slate-700 focus:border-blue-500 focus:outline-none"
                placeholder="Contoh: XI TKR"
              />
            </div>

            <button
              type="submit"
              disabled={menyimpan || !profilBerubah}
              className="w-full rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {menyimpan
                ? "Menyimpan..."
                : "Simpan Perubahan Profil"}
            </button>
          </form>

          {/* FORM FOTO PROFIL */}
          <form
            onSubmit={unggahFoto}
            className="mt-8 space-y-4 border-t pt-6"
          >
            <div>
              <label
                htmlFor="foto"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Ganti Foto Profil
              </label>

              <input
                id="foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  pilihFoto(e.target.files?.[0] ?? null)
                }
                className="block w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:font-semibold file:text-blue-800"
              />

              <p className="mt-2 text-xs text-slate-500">
                JPG, PNG, atau WebP. Ukuran maksimal 2 MB.
              </p>

              {fileFoto && (
                <p className="mt-2 text-sm text-slate-600">
                  File dipilih: {fileFoto.name}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!fileFoto || mengunggah}
              className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mengunggah
                ? "Mengunggah foto..."
                : "Simpan Foto Profil"}
            </button>
          </form>

          {pesan && (
            <p
              role="status"
              className={`mt-5 rounded-xl p-3 text-sm ${
                berhasil
                  ? "bg-green-50 text-green-800"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {pesan}
            </p>
          )}

          <button
            type="button"
            onClick={() => router.push("/siswa")}
            className="mt-5 w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali ke Dashboard
          </button>
        </section>
      </div>
    </main>
  );
}
