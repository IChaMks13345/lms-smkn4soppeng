
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type Pengumpulan = {
  id: string;
  tugas_id: string;
  siswa_id: string;
  nama_siswa: string | null;
  nis_siswa: string | null;
  kelas_siswa: string | null;
  email_siswa: string | null;
  judul_tugas: string | null;
  jawaban: string | null;
  file_url: string | null;
  status: "dikumpulkan" | "dinilai";
  nilai: number | null;
  catatan_guru: string | null;
  dikumpulkan_pada: string;
  dinilai_pada: string | null;
};

type TugasExcel = {
  id: string;
  judul: string;
  created_at?: string;
};

type SiswaRekap = {
  siswa_id: string;
  nama: string;
  nis: string;
  kelas: string;
  nilaiTugas: Map<string, number>;
  jumlahNilai: number;
  rataRata: number;
};

export default function RekapNilaiGuruPage() {
  const [data, setData] = useState<Pengumpulan[]>([]);
  const [daftarTugas, setDaftarTugas] = useState<TugasExcel[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [pesan, setPesan] = useState("");
  const [pencarian, setPencarian] = useState("");
  const [kelasAktif, setKelasAktif] = useState("Semua");

  // MEMUAT DATA REKAP NILAI
  const muatRekapNilai = useCallback(async () => {
    setMemuat(true);
    setPesan("");

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser();

    const user = authData.user;

    if (authError || !user) {
      window.location.href = "/login";
      return;
    }

    // MEMASTIKAN PENGGUNA ADALAH GURU
    const { data: profil, error: profilError } =
      await supabase
        .from("profil_pengguna")
        .select("peran")
        .eq("id", user.id)
        .single();

    if (profilError || profil?.peran !== "guru") {
      setPesan("Halaman ini hanya dapat diakses oleh guru.");
      setMemuat(false);
      return;
    }

    // MENGAMBIL DATA PENGUMPULAN
    const { data: hasil, error } = await supabase.rpc(
      "daftar_pengumpulan_guru"
    );

    if (error) {
      setPesan("Gagal memuat rekap nilai: " + error.message);
      setMemuat(false);
      return;
    }

    const hasilPengumpulan = (hasil ?? []) as Pengumpulan[];
    setData(hasilPengumpulan);

    // MENGAMBIL DAFTAR TUGAS
    const {
      data: tugasDatabase,
      error: tugasError,
    } = await supabase
      .from("tugas")
      .select("id, judul, created_at")
      .order("created_at", { ascending: true });

    if (!tugasError && tugasDatabase) {
      setDaftarTugas(tugasDatabase as TugasExcel[]);
    } else {
      // CADANGAN JIKA DAFTAR TUGAS GAGAL DIAMBIL
      const tugasUnik = new Map<string, TugasExcel>();

      hasilPengumpulan.forEach((item) => {
        if (item.tugas_id) {
          tugasUnik.set(item.tugas_id, {
            id: item.tugas_id,
            judul: item.judul_tugas || "Tugas",
          });
        }
      });

      setDaftarTugas(
        Array.from(tugasUnik.values()).sort((a, b) =>
          a.judul.localeCompare(b.judul, "id")
        )
      );
    }

    setMemuat(false);
  }, []);

  useEffect(() => {
    void muatRekapNilai();
  }, [muatRekapNilai]);

  // DAFTAR KELAS
  const daftarKelas = useMemo(() => {
    const kelas = data
      .map((item) => item.kelas_siswa)
      .filter((item): item is string => Boolean(item?.trim()));

    return ["Semua", ...Array.from(new Set(kelas)).sort()];
  }, [data]);

  // DATA YANG SUDAH DIFILTER
  const dataTersaring = useMemo(() => {
    const kataKunci = pencarian.toLocaleLowerCase("id").trim();

    return data.filter((item) => {
      const cocokKelas =
        kelasAktif === "Semua" ||
        item.kelas_siswa === kelasAktif;

      const cocokPencarian = [
        item.nama_siswa,
        item.nis_siswa,
        item.kelas_siswa,
        item.judul_tugas,
      ].some((teks) =>
        (teks ?? "")
          .toLocaleLowerCase("id")
          .includes(kataKunci)
      );

      return cocokKelas && cocokPencarian;
    });
  }, [data, pencarian, kelasAktif]);

  // STATISTIK
  const jumlahPengumpulan = data.length;

  const daftarDinilai = data.filter(
    (item) =>
      item.status === "dinilai" &&
      item.nilai !== null &&
      Number.isFinite(Number(item.nilai))
  );

  const jumlahDinilai = daftarDinilai.length;

  const jumlahBelumDinilai = data.filter(
    (item) => item.status === "dikumpulkan"
  ).length;

  const jumlahSiswaDinilai = new Set(
    daftarDinilai.map((item) => item.siswa_id)
  ).size;

  const rataRata =
    jumlahDinilai > 0
      ? daftarDinilai.reduce(
          (total, item) => total + Number(item.nilai),
          0
        ) / jumlahDinilai
      : 0;

  const nilaiTertinggi =
    jumlahDinilai > 0
      ? Math.max(
          ...daftarDinilai.map((item) => Number(item.nilai))
        )
      : 0;

  const nilaiTerendah =
    jumlahDinilai > 0
      ? Math.min(
          ...daftarDinilai.map((item) => Number(item.nilai))
        )
      : 0;

  // MEMBUAT DATA REKAP PER SISWA UNTUK TAMPILAN HALAMAN
  const dataRekapSiswa = useMemo(() => {
    const siswaTerpilih = new Set(
      dataTersaring.map((item) => item.siswa_id)
    );

    const dataSiswa = data.filter(
      (item) => siswaTerpilih.has(item.siswa_id)
    );

    const kelompok = new Map<string, SiswaRekap>();

    dataSiswa.forEach((item) => {
      if (!kelompok.has(item.siswa_id)) {
        kelompok.set(item.siswa_id, {
          siswa_id: item.siswa_id,
          nama: item.nama_siswa || "Belum tersedia",
          nis: item.nis_siswa || "-",
          kelas: item.kelas_siswa || "-",
          nilaiTugas: new Map<string, number>(),
          jumlahNilai: 0,
          rataRata: 0,
        });
      }

      const siswa = kelompok.get(item.siswa_id)!;

      if (
        item.status === "dinilai" &&
        item.nilai !== null &&
        Number.isFinite(Number(item.nilai))
      ) {
        siswa.nilaiTugas.set(
          item.tugas_id,
          Number(item.nilai)
        );
      }
    });

    return Array.from(kelompok.values())
      .map((siswa) => {
        const semuaNilai = Array.from(siswa.nilaiTugas.values());

        siswa.jumlahNilai = semuaNilai.reduce(
          (total, nilai) => total + nilai,
          0
        );

        siswa.rataRata =
          semuaNilai.length > 0
            ? siswa.jumlahNilai / semuaNilai.length
            : 0;

        return siswa;
      })
      .sort((a, b) => {
        const bandingKelas = a.kelas.localeCompare(b.kelas, "id");

        if (bandingKelas !== 0) return bandingKelas;

        return a.nama.localeCompare(b.nama, "id");
      });
  }, [data, dataTersaring]);

  // EKSPOR EXCEL SEMUA KELAS
  function eksporExcel() {
    if (data.length === 0) {
      alert("Belum ada data siswa untuk diekspor.");
      return;
    }

    // MENENTUKAN DAFTAR TUGAS
    const tugasExcel =
      daftarTugas.length > 0
        ? daftarTugas
        : Array.from(
            new Map(
              data.map((item) => [
                item.tugas_id,
                {
                  id: item.tugas_id,
                  judul: item.judul_tugas || "Tugas",
                },
              ])
            ).values()
          );

    // MENGELOMPOKKAN SISWA BERDASARKAN KELAS
    const kelompokKelas = new Map<
      string,
      Map<string, SiswaRekap>
    >();

    data.forEach((item) => {
      const namaKelas =
        item.kelas_siswa?.trim() || "Kelas Tidak Diketahui";

      if (!kelompokKelas.has(namaKelas)) {
        kelompokKelas.set(namaKelas, new Map());
      }

      const kelompokSiswa = kelompokKelas.get(namaKelas)!;

      if (!kelompokSiswa.has(item.siswa_id)) {
        kelompokSiswa.set(item.siswa_id, {
          siswa_id: item.siswa_id,
          nama: item.nama_siswa || "Belum tersedia",
          nis: item.nis_siswa || "-",
          kelas: namaKelas,
          nilaiTugas: new Map<string, number>(),
          jumlahNilai: 0,
          rataRata: 0,
        });
      }

      const siswa = kelompokSiswa.get(item.siswa_id)!;

      if (
        item.status === "dinilai" &&
        item.nilai !== null &&
        Number.isFinite(Number(item.nilai))
      ) {
        siswa.nilaiTugas.set(
          item.tugas_id,
          Number(item.nilai)
        );
      }
    });

    // MEMBUAT WORKBOOK
    const workbook = XLSX.utils.book_new();

    const daftarNamaKelas = Array.from(
      kelompokKelas.keys()
    ).sort((a, b) => a.localeCompare(b, "id"));

    const namaSheetTerpakai = new Set<string>();

    // MEMBUAT SATU SHEET UNTUK SETIAP KELAS
    daftarNamaKelas.forEach((namaKelas) => {
      const kelompokSiswa = kelompokKelas.get(namaKelas)!;

      const daftarSiswa = Array.from(
        kelompokSiswa.values()
      ).map((siswa) => {
        const semuaNilai = Array.from(
          siswa.nilaiTugas.values()
        );

        siswa.jumlahNilai = semuaNilai.reduce(
          (total, nilai) => total + nilai,
          0
        );

        siswa.rataRata =
          semuaNilai.length > 0
            ? siswa.jumlahNilai / semuaNilai.length
            : 0;

        return siswa;
      });

      daftarSiswa.sort((a, b) =>
        a.nama.localeCompare(b.nama, "id")
      );

      // HEADER LAPORAN
      const barisExcel: (string | number | null)[][] = [
        ["LMS SMKN 4 SOPPENG"],
        ["REKAPITULASI NILAI SISWA"],
        [`Kelas: ${namaKelas}`],
        [
          "Tanggal Ekspor: " +
          new Date().toLocaleDateString("id-ID"),
        ],
        [
          "No.",
          "Nama Siswa",
          "NIS",
          "Kelas",
          ...tugasExcel.map(
            (_, index) => `Tugas ${index + 1}`
          ),
          "Jumlah Nilai",
          "Rata-rata",
        ],
      ];

      // DATA SISWA
      daftarSiswa.forEach((siswa, index) => {
        const nilaiPerTugas = tugasExcel.map(
          (tugas) => siswa.nilaiTugas.get(tugas.id) ?? null
        );

        barisExcel.push([
          index + 1,
          siswa.nama,
          siswa.nis,
          siswa.kelas,
          ...nilaiPerTugas,
          siswa.jumlahNilai,
          siswa.nilaiTugas.size > 0
            ? Number(siswa.rataRata.toFixed(2))
            : null,
        ]);
      });

      // TOTAL SETIAP TUGAS
      const totalPerTugas = tugasExcel.map((tugas) =>
        daftarSiswa.reduce(
          (total, siswa) =>
            total +
            (siswa.nilaiTugas.get(tugas.id) ?? 0),
          0
        )
      );

      const totalSeluruhNilai = totalPerTugas.reduce(
        (total, nilai) => total + nilai,
        0
      );

      const jumlahSeluruhNilai = daftarSiswa.reduce(
        (total, siswa) =>
          total + siswa.nilaiTugas.size,
        0
      );

      const rataRataKeseluruhan =
        jumlahSeluruhNilai > 0
          ? totalSeluruhNilai / jumlahSeluruhNilai
          : 0;

      // BARIS TOTAL
      barisExcel.push([
        "",
        "TOTAL",
        "",
        "",
        ...totalPerTugas,
        totalSeluruhNilai,
        jumlahSeluruhNilai > 0
          ? Number(rataRataKeseluruhan.toFixed(2))
          : null,
      ]);

      // MEMBUAT WORKSHEET
      const worksheet = XLSX.utils.aoa_to_sheet(
        barisExcel
      );

      const jumlahKolom = 6 + tugasExcel.length;

      // MENGGABUNGKAN JUDUL
      worksheet["!merges"] = [
        {
          s: { r: 0, c: 0 },
          e: { r: 0, c: jumlahKolom - 1 },
        },
        {
          s: { r: 1, c: 0 },
          e: { r: 1, c: jumlahKolom - 1 },
        },
        {
          s: { r: 2, c: 0 },
          e: { r: 2, c: jumlahKolom - 1 },
        },
        {
          s: { r: 3, c: 0 },
          e: { r: 3, c: jumlahKolom - 1 },
        },
      ];

      // LEBAR KOLOM
      worksheet["!cols"] = [
        { wch: 7 },
        { wch: 25 },
        { wch: 15 },
        { wch: 18 },
        ...tugasExcel.map(() => ({ wch: 12 })),
        { wch: 16 },
        { wch: 14 },
      ];

      // FILTER TABEL
      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: 4, c: 0 },
          e: {
            r: 4 + daftarSiswa.length,
            c: jumlahKolom - 1,
          },
        }),
      };

      // NAMA SHEET MAKSIMAL 31 KARAKTER
      let namaSheet = namaKelas
        .replace(/[\\/?*:\[\]]/g, " ")
        .trim()
        .slice(0, 31);

      if (!namaSheet) namaSheet = "Kelas";

      const namaDasar = namaSheet;
      let nomor = 2;

      while (namaSheetTerpakai.has(namaSheet)) {
        const akhiran = ` (${nomor})`;
        namaSheet =
          namaDasar.slice(0, 31 - akhiran.length) +
          akhiran;
        nomor++;
      }

      namaSheetTerpakai.add(namaSheet);

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        namaSheet
      );
    });

    // DOWNLOAD FILE EXCEL
    const tanggal = new Date()
      .toISOString()
      .slice(0, 10);

    XLSX.writeFile(
      workbook,
      `Rekap_Nilai_Semua_Kelas_${tanggal}.xlsx`
    );
  }

  // FORMAT TANGGAL
  function formatTanggal(tanggal: string | null) {
    if (!tanggal) return "-";

    return new Date(tanggal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // MEMUAT HALAMAN
  if (memuat) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-600">
            Memuat rekap nilai siswa...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              LMS SMKN 4 SOPPENG
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-800 md:text-3xl">
              Rekap Nilai Siswa
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Ringkasan hasil penilaian tugas siswa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={eksporExcel}
              disabled={data.length === 0}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              ↓ Download Excel Semua Kelas
            </button>

            <button
              type="button"
              onClick={() => void muatRekapNilai()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              ↻ Muat Ulang
            </button>
          </div>
        </div>

        {/* PESAN ERROR */}
        {pesan && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {pesan}
          </div>
        )}

        {/* KARTU STATISTIK */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Pengumpulan
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {jumlahPengumpulan}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Seluruh tugas yang dikumpulkan
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Siswa Sudah Dinilai
            </p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {jumlahSiswaDinilai}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Jumlah siswa unik yang sudah memperoleh nilai
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Belum Dinilai
            </p>
            <p className="mt-2 text-3xl font-bold text-orange-500">
              {jumlahBelumDinilai}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Pengumpulan menunggu penilaian
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Rata-rata Nilai
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {rataRata.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Dari seluruh pengumpulan yang sudah dinilai
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Nilai Tertinggi
            </p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {jumlahDinilai > 0 ? nilaiTertinggi : "-"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Nilai terbaik yang sudah diberikan
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Nilai Terendah
            </p>
            <p className="mt-2 text-3xl font-bold text-red-500">
              {jumlahDinilai > 0 ? nilaiTerendah : "-"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Nilai terendah yang sudah diberikan
            </p>
          </div>

        </div>

        {/* FILTER DAN PENCARIAN */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-bold text-slate-800">
              Daftar Hasil Penilaian
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Cari siswa atau tampilkan berdasarkan kelas.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={pencarian}
              onChange={(e) => setPencarian(e.target.value)}
              placeholder="Cari nama, NIS, kelas, atau tugas..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              value={kelasAktif}
              onChange={(e) => setKelasAktif(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {daftarKelas.map((kelas) => (
                <option key={kelas} value={kelas}>
                  {kelas === "Semua" ? "Semua Kelas" : kelas}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Menampilkan {dataTersaring.length} dari {data.length} pengumpulan.
          </p>
        </section>

        {/* TABEL REKAP NILAI */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-800">
              Tabel Rekap Nilai
            </h2>
          </div>

          {dataTersaring.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl">📊</div>
              <p className="mt-3 font-semibold text-slate-700">
                Data tidak ditemukan
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Belum ada data yang sesuai dengan pencarian.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-4">No.</th>
                    <th className="px-4 py-4">Nama Siswa</th>
                    <th className="px-4 py-4">NIS</th>
                    <th className="px-4 py-4">Kelas</th>
                    <th className="px-4 py-4">Judul Tugas</th>
                    <th className="px-4 py-4 text-center">Nilai</th>
                    <th className="px-4 py-4">Tanggal</th>
                    <th className="px-4 py-4 text-center">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {dataTersaring.map((item, index) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-800">
                          {item.nama_siswa || "Belum tersedia"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.email_siswa || ""}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {item.nis_siswa || "-"}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {item.kelas_siswa || "-"}
                      </td>

                      <td className="max-w-xs px-4 py-4 font-medium text-slate-700">
                        {item.judul_tugas || "Tugas"}
                      </td>

                      <td className="px-4 py-4 text-center">
                        {item.status === "dinilai" &&
                        item.nilai !== null ? (
                          <span className="inline-flex min-w-12 justify-center rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-700">
                            {item.nilai}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {formatTanggal(
                          item.dinilai_pada ||
                          item.dikumpulkan_pada
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === "dinilai"
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {item.status === "dinilai"
                            ? "Sudah Dinilai"
                            : "Belum Dinilai"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* CATATAN */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">
            Informasi Rekap Nilai
          </p>
          <p className="mt-1 text-sm leading-relaxed text-blue-800">
            Rata-rata, nilai tertinggi, dan nilai terendah dihitung
            berdasarkan pengumpulan tugas yang sudah dinilai.
            Ekspor Excel menyusun nilai berdasarkan siswa dan tugas.
            Setiap kelas memiliki lembar kerja tersendiri.
            Nilai yang belum tersedia tidak dihitung sebagai nol.
          </p>
        </div>

      </div>
    </main>
  );
}
