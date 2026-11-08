
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DaftarSiswaPage() {
  const [nama, setNama] = useState("");
  const [nis, setNis] = useState("");
  const [kelas, setKelas] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState("");
  const [pesan, setPesan] = useState("");
  const [error, setError] = useState("");
  const [memproses, setMemproses] = useState(false);

  useEffect(() => {
    if (!foto) {
      setPratinjau("");
      return;
    }

    const url = URL.createObjectURL(foto);
    setPratinjau(url);

    return () => URL.revokeObjectURL(url);
  }, [foto]);

  function pilihFoto(file?: File) {
    setError("");
    setPesan("");

    if (!file) {
      setFoto(null);
      return;
    }

    const tipeDiizinkan = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!tipeDiizinkan.includes(file.type)) {
      setError("Foto harus berformat JPG, PNG, atau WebP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran foto maksimal 2 MB.");
      return;
    }

    setFoto(file);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPesan("");

    const namaBersih = nama.trim();
    const nisBersih = nis.trim();
    const kelasBersih = kelas.trim();
    const emailBersih = email.trim().toLowerCase();

    if (!namaBersih || !nisBersih || !kelasBersih || !emailBersih) {
      setError("Semua kolom wajib diisi.");
      return;
    }

    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    setMemproses(true);

    try {
      // 1. Buat akun siswa.
      const { data, error: daftarError } =
        await supabase.auth.signUp({
          email: emailBersih,
          password,
          options: {
            data: {
              nama: namaBersih,
              nis: nisBersih,
              kelas: kelasBersih,
            },
          },
        });

      if (daftarError) {
        throw daftarError;
      }

      if (!data.user) {
        throw new Error(
          "Akun belum berhasil dibuat. Silakan coba kembali."
        );
      }

      // Profil dibuat otomatis oleh trigger database.
      // Peran siswa dan status menunggu ditentukan oleh trigger,
      // bukan oleh input yang dikirim dari browser.

      // Jika konfirmasi email aktif, sesi mungkin belum tersedia.
      if (!data.session) {
        setPassword("");
        setPesan(
          "Akun berhasil didaftarkan. Silakan periksa email untuk konfirmasi. " +
         "Setelah email dikonfirmasi dan akun disetujui guru, login untuk melanjutkan pengunggahan foto profil. " +
"Akun belum dapat mengakses materi sebelum disetujui guru."
        );
        return;
      }

      // 2. Jika sesi tersedia, unggah foto ke bucket privat.
      if (foto) {
        const ekstensi = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        }[foto.type];

        if (!ekstensi) {
          throw new Error("Format foto tidak didukung.");
        }

        const lokasiFoto =
          `${data.user.id}/avatar-${Date.now()}.${ekstensi}`;

        const { error: uploadError } = await supabase.storage
          .from("foto-profil-siswa")
          .upload(lokasiFoto, foto, {
            contentType: foto.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            "Akun berhasil dibuat, tetapi foto belum terunggah. " +
            "Silakan login dan coba unggah foto kembali. " +
            uploadError.message
          );
        }

        // 3. Simpan lokasi objek, bukan URL publik.
        const { error: profilError } = await supabase.rpc(
          "simpan_foto_profil",
          { p_foto_url: lokasiFoto }
        );

        if (profilError) {
          setError(
            "Akun berhasil dibuat dan foto sudah diunggah, " +
            "tetapi lokasi foto belum tersimpan pada profil. " +
            "Hubungi guru untuk membantu memperbaikinya."
          );
          return;
        }
      }

      setPassword("");
      setFoto(null);
      setPesan(
        "Pendaftaran berhasil! Akun siswa berstatus menunggu persetujuan guru. " +
        "Materi belum dapat diakses sebelum akun disetujui."
      );
    } catch (err: unknown) {
      const detail =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan yang tidak diketahui.";

      setError(detail);
    } finally {
      setMemproses(false);
    }
  }

  const inisial = nama.trim()
    ? nama
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((bagian) => bagian[0])
        .join("")
        .toUpperCase()
    : "S";

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box",
    marginTop: "6px",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6fb",
        padding: "32px 16px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.07)",
        }}
      >
        <h1 style={{ margin: "0 0 8px", color: "#173b68" }}>
          Pendaftaran Siswa
        </h1>

        <p style={{ color: "#64748b", marginTop: 0 }}>
          LMS SMKN 4 Soppeng
        </p>

        <div style={{ textAlign: "center", margin: "24px 0" }}>
          {pratinjau ? (
            <img
              src={pratinjau}
              alt="Pratinjau foto profil"
              style={{
                width: 112,
                height: 112,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 112,
                height: 112,
                borderRadius: "50%",
                margin: "0 auto",
                background: "#dbeafe",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: "bold",
              }}
            >
              {inisial}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <label
              htmlFor="foto"
              style={{
                display: "inline-block",
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                cursor: memproses ? "not-allowed" : "pointer",
              }}
            >
              Pilih Foto Profil
            </label>

            <input
              id="foto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={memproses}
              onChange={(e) => pilihFoto(e.target.files?.[0])}
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
              }}
            />

            <p style={{ fontSize: 12, color: "#64748b" }}>
              JPG, PNG, atau WebP. Maksimal 2 MB.
            </p>

            {foto && (
              <button
                type="button"
                disabled={memproses}
                onClick={() => setFoto(null)}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#b91c1c",
                  cursor: "pointer",
                }}
              >
                Hapus pilihan foto
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="nama">Nama lengkap</label>
          <input
            id="nama"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
            autoComplete="name"
            disabled={memproses}
            style={inputStyle}
            placeholder="Masukkan nama lengkap"
          />

          <label htmlFor="nis" style={{ display: "block", marginTop: 16 }}>
            NIS
          </label>
          <input
            id="nis"
            value={nis}
            onChange={(e) => setNis(e.target.value)}
            required
            disabled={memproses}
            style={inputStyle}
            placeholder="Masukkan NIS"
          />

          <label htmlFor="kelas" style={{ display: "block", marginTop: 16 }}>
            Kelas
          </label>
          <input
            id="kelas"
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            required
            disabled={memproses}
            style={inputStyle}
            placeholder="Contoh: XI TKR 1"
          />

          <label htmlFor="email" style={{ display: "block", marginTop: 16 }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={memproses}
            style={inputStyle}
            placeholder="nama@email.com"
          />

          <label
            htmlFor="password"
            style={{ display: "block", marginTop: 16 }}
          >
            Kata sandi
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={memproses}
            style={inputStyle}
            placeholder="Minimal 8 karakter"
          />

          {error && (
            <p
              role="alert"
              style={{
                color: "#b91c1c",
                background: "#fef2f2",
                padding: 12,
                borderRadius: 8,
                overflowWrap: "anywhere",
              }}
            >
              {error}
            </p>
          )}

          {pesan && (
            <p
              role="status"
              style={{
                color: "#1d4ed8",
                background: "#eff6ff",
                padding: 12,
                borderRadius: 8,
                lineHeight: 1.6,
              }}
            >
              {pesan}
            </p>
          )}

          <button
            type="submit"
            disabled={memproses}
            style={{
              width: "100%",
              marginTop: 24,
              padding: 13,
              border: 0,
              borderRadius: 8,
              background: memproses ? "#94a3b8" : "#1d4ed8",
              color: "#fff",
              fontWeight: "bold",
              fontSize: 16,
              cursor: memproses ? "wait" : "pointer",
            }}
          >
            {memproses ? "Memproses pendaftaran..." : "Daftar sebagai Siswa"}
          </button>
        </form>

        <p
          style={{
            marginTop: 20,
            fontSize: 13,
            lineHeight: 1.6,
            color: "#64748b",
          }}
        >
          Pendaftaran akan menunggu verifikasi guru. Akun yang belum disetujui
          tidak dapat mengakses materi pembelajaran.
        </p>

        <p style={{ marginTop: 16, fontSize: 14, textAlign: "center" }}>
          Sudah punya akun?{" "}
          <Link href="/login" style={{ color: "#1d4ed8" }}>
            Login di sini
          </Link>
        </p>
      </section>
    </main>
  );
}
