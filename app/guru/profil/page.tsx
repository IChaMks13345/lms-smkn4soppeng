
"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";

const NAMA_BUCKET = "foto-profil-siswa";
const BATAS_UKURAN = 2 * 1024 * 1024;

export default function ProfilGuru() {
  const [userId, setUserId] = useState("");
  const [nama, setNama] = useState("");
  const [namaAwal, setNamaAwal] = useState("");
  const [email, setEmail] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [menyimpanFoto, setMenyimpanFoto] = useState(false);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    async function muatProfil() {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setPesan("Silakan login kembali.");
        setMemuat(false);
        return;
      }

      const user = authData.user;
      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data, error } = await supabase
        .from("profil_pengguna")
        .select("nama, peran, foto_url")
        .eq("id", user.id)
        .single();

      if (error) {
        setPesan("Gagal memuat profil: " + error.message);
        setMemuat(false);
        return;
      }

      if (data.peran !== "guru") {
        setPesan("Halaman ini khusus untuk guru.");
        setMemuat(false);
        return;
      }

      setNama(data.nama ?? "");
      setNamaAwal(data.nama ?? "");

      if (data.foto_url) {
        const { data: fotoData } = await supabase.storage
          .from(NAMA_BUCKET)
          .createSignedUrl(data.foto_url, 3600);

        if (fotoData?.signedUrl) {
          setFotoUrl(fotoData.signedUrl);
        }
      }

      setMemuat(false);
    }

    muatProfil();
  }, []);

  async function simpanNama() {
    if (nama.trim().length < 3) {
      setPesan("Nama minimal 3 karakter.");
      return;
    }

    if (nama.trim().length > 100) {
      setPesan("Nama maksimal 100 karakter.");
      return;
    }

    setMenyimpan(true);
    setPesan("");

    const { error } = await supabase.rpc("simpan_nama_profil", {
      p_nama: nama.trim(),
    });

    if (error) {
      setPesan("Gagal menyimpan nama: " + error.message);
      setMenyimpan(false);
      return;
    }

    setNama(nama.trim());
    setNamaAwal(nama.trim());
    setPesan("Nama guru berhasil diperbarui.");
    setMenyimpan(false);
  }

  function pilihFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPesan("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPesan("Gunakan foto JPG, PNG, atau WebP.");
      e.target.value = "";
      return;
    }

    if (file.size > BATAS_UKURAN) {
      setPesan("Ukuran foto maksimal 2 MB.");
      e.target.value = "";
      return;
    }

    setFotoFile(file);
    setFotoUrl(URL.createObjectURL(file));
  }

  async function simpanFoto() {
    if (!fotoFile || !userId) {
      setPesan("Pilih foto terlebih dahulu.");
      return;
    }

    setMenyimpanFoto(true);
    setPesan("");

    const ekstensi =
      fotoFile.name.split(".").pop()?.toLowerCase() || "jpg";

    const lokasiFoto = `${userId}/avatar-${Date.now()}.${ekstensi}`;

    const { error: uploadError } = await supabase.storage
      .from(NAMA_BUCKET)
      .upload(lokasiFoto, fotoFile, {
        upsert: false,
        contentType: fotoFile.type,
      });

    if (uploadError) {
      setPesan("Gagal mengunggah foto: " + uploadError.message);
      setMenyimpanFoto(false);
      return;
    }

    const { error: simpanError } = await supabase.rpc(
      "simpan_foto_profil",
      { p_foto_url: lokasiFoto }
    );

    if (simpanError) {
      setPesan(
        "Foto terunggah, tetapi gagal menyimpan profil: " +
          simpanError.message
      );
      setMenyimpanFoto(false);
      return;
    }

    const { data: fotoData } = await supabase.storage
      .from(NAMA_BUCKET)
      .createSignedUrl(lokasiFoto, 3600);

    if (fotoData?.signedUrl) {
      setFotoUrl(fotoData.signedUrl);
    }

    setFotoFile(null);
    setPesan("Foto profil berhasil disimpan.");
    setMenyimpanFoto(false);
  }

  if (memuat) {
    return <main className="p-6">Memuat profil...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">
          Profil Guru
        </h1>

        <p className="mb-6 text-sm text-gray-500">
          Informasi akun dan pengaturan profil guru.
        </p>

        <div className="flex flex-col items-center gap-4 border-b pb-6">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt="Foto profil guru"
              className="h-36 w-36 rounded-full border-4 border-blue-100 object-cover"
            />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-gray-200 text-5xl text-gray-500">
              👤
            </div>
          )}

          <label className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Pilih Foto
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={pilihFoto}
              className="hidden"
            />
          </label>

          <p className="text-xs text-gray-500">
            JPG, PNG, atau WebP. Maksimal 2 MB.
          </p>

          <button
            onClick={simpanFoto}
            disabled={!fotoFile || menyimpanFoto}
            className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {menyimpanFoto ? "Menyimpan Foto..." : "Simpan Foto Profil"}
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Nama Guru
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border p-3 text-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="Masukkan nama lengkap"
            />

            <button
              onClick={simpanNama}
              disabled={
                menyimpan || nama.trim() === namaAwal.trim()
              }
              className="mt-3 w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {menyimpan ? "Menyimpan..." : "Simpan Perubahan Nama"}
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-lg border bg-gray-50 p-3 text-gray-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Peran
            </label>
            <input
              type="text"
              value="Guru"
              readOnly
              className="w-full rounded-lg border bg-gray-50 p-3 text-gray-700"
            />
          </div>

          {pesan && (
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              {pesan}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
