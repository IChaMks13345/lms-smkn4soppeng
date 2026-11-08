
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tugas = {
  id: string;
  judul: string;
  deskripsi: string | null;
  batas_waktu: string | null;
  status: string;
  created_at: string;
};

function waktuLokalUntukInput(waktu: string | null) {
  if (!waktu) return "";

  const tanggal = new Date(waktu);
  const offset = tanggal.getTimezoneOffset() * 60000;

  return new Date(tanggal.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

export default function HalamanTugasGuru() {
  const router = useRouter();

  const [tugas, setTugas] = useState<Tugas[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [judulTugas, setJudulTugas] = useState("");
  const [deskripsiTugas, setDeskripsiTugas] = useState("");
  const [batasWaktu, setBatasWaktu] = useState("");
  const [statusTugas, setStatusTugas] = useState("draft");
  const [editTugasId, setEditTugasId] = useState<string | null>(null);
  const [menyimpanTugas, setMenyimpanTugas] = useState(false);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    let aktif = true;

    async function periksaGuruDanMuatTugas() {
      const { data: authData } = await supabase.auth.getSession();

      if (!authData.session) {
        router.replace("/login");
        return;
      }

      const { data: profil, error: errorProfil } = await supabase
        .from("profil_pengguna")
        .select("peran")
        .eq("id", authData.session.user.id)
        .single();

      if (errorProfil || profil?.peran !== "guru") {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("tugas")
        .select("id, judul, deskripsi, batas_waktu, status, created_at")
        .order("created_at", { ascending: false });

      if (!aktif) return;

      if (error) {
        setPesan("Gagal memuat tugas: " + error.message);
      } else {
        setTugas(data || []);
      }

      setMemuat(false);
    }

    periksaGuruDanMuatTugas();

    return () => {
      aktif = false;
    };
  }, [router]);

  function resetForm() {
    setJudulTugas("");
    setDeskripsiTugas("");
    setBatasWaktu("");
    setStatusTugas("draft");
    setEditTugasId(null);
  }

  async function simpanTugas(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPesan("");

    if (!judulTugas.trim()) {
      setPesan("Judul tugas wajib diisi.");
      return;
    }

    if (batasWaktu && new Date(batasWaktu) <= new Date()) {
      setPesan("Batas waktu harus lebih dari waktu sekarang.");
      return;
    }

    setMenyimpanTugas(true);

    const dataTugas = {
      judul: judulTugas.trim(),
      deskripsi: deskripsiTugas.trim() || null,
      batas_waktu: batasWaktu
        ? new Date(batasWaktu).toISOString()
        : null,
      status: statusTugas,
    };

    let error;

    if (editTugasId) {
      const hasil = await supabase
        .from("tugas")
        .update(dataTugas)
        .eq("id", editTugasId);

      error = hasil.error;
    } else {
      const { data: authData } = await supabase.auth.getSession();

      const hasil = await supabase.from("tugas").insert({
        ...dataTugas,
        created_by: authData.session?.user.id,
      });

      error = hasil.error;
    }

    if (error) {
      setPesan("Gagal menyimpan tugas: " + error.message);
      setMenyimpanTugas(false);
      return;
    }

    const { data, error: errorMuat } = await supabase
      .from("tugas")
      .select("id, judul, deskripsi, batas_waktu, status, created_at")
      .order("created_at", { ascending: false });

    if (!errorMuat) {
      setTugas(data || []);
    }

    setPesan(
      editTugasId
        ? "Tugas berhasil diperbarui."
        : "Tugas berhasil ditambahkan."
    );

    resetForm();
    setMenyimpanTugas(false);
  }

  function mulaiEdit(item: Tugas) {
    setEditTugasId(item.id);
    setJudulTugas(item.judul);
    setDeskripsiTugas(item.deskripsi || "");
    setBatasWaktu(waktuLokalUntukInput(item.batas_waktu));
    setStatusTugas(item.status);
    setPesan("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function hapusTugas(id: string) {
    const yakin = window.confirm(
      "Apakah Bossku yakin ingin menghapus tugas ini?"
    );

    if (!yakin) return;

    const { error } = await supabase
      .from("tugas")
      .delete()
      .eq("id", id);

    if (error) {
      setPesan("Gagal menghapus tugas: " + error.message);
      return;
    }

    setTugas((sebelumnya) =>
      sebelumnya.filter((item) => item.id !== id)
    );

    if (editTugasId === id) {
      resetForm();
    }

    setPesan("Tugas berhasil dihapus.");
  }

  if (memuat) {
    return (
      <main className="p-6">
        <p>Memuat halaman tugas...</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Tugas Pembelajaran
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Kelola tugas, batas waktu, dan penerbitan tugas untuk siswa.
        </p>
      </div>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          {editTugasId ? "Edit Tugas" : "Tambah Tugas Baru"}
        </h2>

        <form onSubmit={simpanTugas} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Judul Tugas
            </label>
            <input
              type="text"
              value={judulTugas}
              onChange={(e) => setJudulTugas(e.target.value)}
              placeholder="Masukkan judul tugas"
              className="w-full rounded-lg border p-3"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Deskripsi atau Petunjuk Tugas
            </label>
            <textarea
              value={deskripsiTugas}
              onChange={(e) => setDeskripsiTugas(e.target.value)}
              placeholder="Tuliskan petunjuk pengerjaan tugas..."
              rows={5}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Batas Waktu Pengumpulan
            </label>
            <input
              type="datetime-local"
              value={batasWaktu}
              onChange={(e) => setBatasWaktu(e.target.value)}
              className="w-full rounded-lg border p-3"
            />
            <p className="mt-1 text-xs text-gray-500">
              Kosongkan jika tugas tidak memiliki batas waktu.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Status Tugas
            </label>
            <select
              value={statusTugas}
              onChange={(e) => setStatusTugas(e.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option value="draft">Simpan sebagai Draf</option>
              <option value="diterbitkan">Terbitkan untuk Siswa</option>
            </select>
          </div>

          {pesan && (
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              {pesan}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={menyimpanTugas}
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {menyimpanTugas
                ? "Menyimpan..."
                : editTugasId
                  ? "Simpan Perubahan"
                  : "Tambah Tugas"}
            </button>

            {editTugasId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-5 py-3 font-medium text-gray-700 hover:bg-gray-100"
              >
                Batal Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-800">
            Daftar Tugas
          </h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
            {tugas.length} tugas
          </span>
        </div>

        {tugas.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-gray-500">
            Belum ada tugas yang dibuat.
          </div>
        ) : (
          tugas.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {item.judul}
                  </h3>

                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      item.status === "diterbitkan"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.status === "diterbitkan"
                      ? "Diterbitkan"
                      : "Draf"}
                  </span>

                  {item.deskripsi && (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                      {item.deskripsi}
                    </p>
                  )}

                  <p className="mt-3 text-sm text-gray-500">
                    Batas waktu:{" "}
                    {item.batas_waktu
                      ? new Date(item.batas_waktu).toLocaleString("id-ID")
                      : "Tidak ditentukan"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => mulaiEdit(item)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => hapusTugas(item.id)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Hapus
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
