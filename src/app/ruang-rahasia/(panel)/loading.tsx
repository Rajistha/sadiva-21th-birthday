/** Tampil seketika saat pindah halaman di Ruang Rahasia, selama isi halaman dimuat. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Memuat">
      <div className="mb-6 h-4 w-24 animate-pulse rounded-full bg-pink-100" />
      <div className="mb-8 h-9 w-64 animate-pulse rounded-full bg-pink-100" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-[72px] animate-pulse rounded-lg bg-white shadow-soft" />)}
      </div>
    </div>
  );
}
