
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginGuru() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihatPassword, setLihatPassword] = useState(false);
  const [pesan, setPesan] = useState("");
  const [memuat, setMemuat] = useState(false);

  async function masuk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPesan("");
    setMemuat(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error || !data.user) {
        setPesan("Login gagal. Periksa email dan kata sandi.");
        return;
      }

      const { data: profil, error: errorProfil } = await supabase
        .from("profil_pengguna")
        .select("peran, status_pendaftaran")
        .eq("id", data.user.id)
        .maybeSingle();

      if (errorProfil || !profil) {
        await supabase.auth.signOut();
        setPesan(
          "Profil akun tidak ditemukan atau tidak dapat diperiksa. Hubungi guru pengelola LMS."
        );
        return;
      }

      if (profil.peran === "guru") {
        await router.push("/guru");
        router.refresh();
        return;
      }

      if (profil.peran === "siswa") {
        if (profil.status_pendaftaran === "disetujui") {
          await router.push("/siswa");
          router.refresh();
          return;
        }

        await supabase.auth.signOut();

        if (profil.status_pendaftaran === "menunggu") {
          setPesan(
            "Pendaftaran Anda masih menunggu verifikasi guru. Silakan coba kembali setelah disetujui."
          );
          return;
        }

        if (profil.status_pendaftaran === "ditolak") {
          setPesan(
            "Pendaftaran Anda belum disetujui. Silakan hubungi guru pengelola LMS."
          );
          return;
        }
      }

      await supabase.auth.signOut();
      setPesan("Peran akun tidak valid. Hubungi guru pengelola LMS.");
    } catch {
      setPesan("Terjadi kesalahan. Silakan coba kembali.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <a
          href="/"
          className="text-sm text-blue-700 hover:underline"
        >
          ← Kembali ke Beranda
        </a>

        <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-900 text-lg font-bold text-white">
          LMS
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Login LMS
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          LMS SMKN 4 Soppeng
        </p>

        <form onSubmit={masuk} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                color: "#0f172a",
                backgroundColor: "#ffffff",
                colorScheme: "light",
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Masukkan email akun"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Kata sandi
            </label>

            <div className="relative">
              <input
                id="password"
                type={lihatPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  color: "#0f172a",
                  backgroundColor: "#ffffff",
                  colorScheme: "light",
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-24 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="Masukkan kata sandi"
              />

              <button
                type="button"
                onClick={() =>
                  setLihatPassword((sebelumnya) => !sebelumnya)
                }
                aria-label={
                  lihatPassword
                    ? "Sembunyikan kata sandi"
                    : "Lihat kata sandi"
                }
                className="absolute inset-y-0 right-3 text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                {lihatPassword ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </div>

          {pesan && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {pesan}
            </p>
          )}

          <button
            type="submit"
            disabled={memuat}
            className="w-full rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {memuat ? "Sedang masuk..." : "Masuk"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Belum memiliki akun?{" "}
          <a
            href="/daftar"
            className="font-semibold text-blue-700 hover:underline"
          >
            Daftar sebagai siswa
          </a>
        </p>

        <p className="mt-6 text-center text-xs text-slate-500">
          LMS SMKN 4 Soppeng
        </p>
      </section>
    </main>
  );
}
