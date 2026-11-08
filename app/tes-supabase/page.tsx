
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TesSupabase() {
  const [status, setStatus] = useState("Memeriksa koneksi...");

  useEffect(() => {
    async function cekKoneksi() {
      const { error } = await supabase
        .from("materi")
        .select("id")
        .limit(1);

      if (error) {
        setStatus(`Belum berhasil: ${error.message}`);
        return;
      }

      setStatus("Koneksi berhasil! Tabel materi dapat dibaca.");
    }

    cekKoneksi();
  }, []);

  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-4 text-2xl font-bold">Tes Koneksi Supabase</h1>
      <p>{status}</p>
    </main>
  );
}
