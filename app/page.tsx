
const materiContoh = [
  {
    nomor: "01",
    judul: "Pengenalan Mesin Kendaraan Ringan",
    deskripsi: "Mengenal fungsi mesin, komponen utama, dan prinsip kerja mesin kendaraan.",
    kategori: "Dasar Mesin",
    durasi: "30 menit",
    ikon: "⚙",
  },
  {
    nomor: "02",
    judul: "Sistem Pelumasan Mesin",
    deskripsi: "Mempelajari fungsi oli, komponen sistem pelumasan, dan pemeriksaannya.",
    kategori: "Sistem Mesin",
    durasi: "45 menit",
    ikon: "🛠",
  },
  {
    nomor: "03",
    judul: "Sistem Pendinginan Mesin",
    deskripsi: "Mengenal radiator, termostat, pompa air, dan perawatan sistem pendingin.",
    kategori: "Sistem Mesin",
    durasi: "45 menit",
    ikon: "🌡",
  },
  {
    nomor: "04",
    judul: "Perawatan Berkala Mesin",
    deskripsi: "Mempelajari pemeriksaan rutin dan prosedur perawatan mesin sesuai panduan.",
    kategori: "Perawatan",
    durasi: "60 menit",
    ikon: "🔧",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-950 text-lg font-extrabold text-white">
              TKR
            </div>
            <div>
              <h1 className="font-bold text-blue-950">
                LMS SMKN 4 SOPPENG
              </h1>
              <p className="text-xs text-slate-500">
                Teknik Kendaraan Ringan
              </p>
            </div>
          </div>
          <span className="hidden rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 sm:inline-block">
            Portal Pembelajaran
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:py-10">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-slate-800 p-7 text-white md:p-12">
          <div className="relative z-10 max-w-3xl">
            <p className="text-sm font-semibold tracking-widest text-blue-200">
              PEMBELAJARAN KEJURUAN · TKR
            </p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight md:text-5xl">
              Pemeliharaan Mesin Kendaraan Ringan
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-blue-100 md:text-base">
              Pelajari sistem dan komponen mesin kendaraan ringan,
              prosedur pemeriksaan, serta perawatan mesin secara
              terstruktur melalui pembelajaran digital.
            </p>
            <a
              href="#daftar-materi"
              className="mt-7 inline-flex items-center rounded-xl bg-white px-5 py-3 font-bold text-blue-950 transition hover:bg-blue-50"
            >
              Lihat Daftar Materi →
            </a>
          </div>
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[36px] border-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 right-36 h-52 w-52 rounded-full bg-cyan-400/10"
          />
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Program Keahlian</p>
            <p className="mt-2 text-xl font-bold text-blue-950">TKR</p>
            <p className="mt-1 text-sm text-slate-500">
              Teknik Kendaraan Ringan
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Mata Pelajaran</p>
            <p className="mt-2 text-lg font-bold text-blue-950">
              Pemeliharaan Mesin
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Kendaraan Ringan
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Bahan Pembelajaran</p>
            <p className="mt-2 text-xl font-bold text-blue-950">
              Materi Kejuruan
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Teori dan praktik
            </p>
          </div>
        </section>

        <section id="daftar-materi" className="mt-10">
          <div className="mb-6">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
              Ruang Belajar
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              Daftar Materi Pembelajaran
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Pilih materi untuk mempelajari kompetensi pemeliharaan
              mesin kendaraan ringan.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {materiContoh.map((materi) => (
              <article
                key={materi.nomor}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                    {materi.ikon}
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {materi.kategori}
                  </span>
                </div>
                <p className="mt-5 text-xs font-bold tracking-wider text-blue-700">
                  MATERI {materi.nomor}
                </p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  {materi.judul}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {materi.deskripsi}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm text-slate-500">
                    {materi.durasi}
                  </span>
                  <span className="text-sm font-semibold text-blue-800">
                    Materi contoh
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-200 py-6 text-center text-sm text-slate-500">
          LMS SMKN 4 Soppeng · Teknik Kendaraan Ringan
        </footer>
      </div>
    </main>
  );
}
