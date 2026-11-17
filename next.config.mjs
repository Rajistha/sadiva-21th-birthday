/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    // Alamat lama (sebelum jadi landing page) dialihkan ke bagian di halaman utama
    return [
      { source: '/surat-cinta', destination: '/#surat-cinta', permanent: false },
      { source: '/jejak-kita', destination: '/#jejak-kita', permanent: false },
      { source: '/21-alasan-sayang', destination: '/#alasan', permanent: false },
      { source: '/album-kita', destination: '/#album-kita', permanent: false },
      { source: '/layar-cinta', destination: '/#layar-cinta', permanent: false },
      { source: '/mimpi-kita', destination: '/#mimpi-kita', permanent: false },
      { source: '/untukmu-selamanya', destination: '/#penutup', permanent: false },
      { source: '/kue-harapan', destination: '/', permanent: false },
      { source: '/buku-harapan', destination: '/', permanent: false },
      { source: '/pintu-hati', destination: '/', permanent: false },
      { source: '/kupon-janji', destination: '/', permanent: false },
      { source: '/tebak-hati', destination: '/', permanent: false },
      { source: '/susun-hati', destination: '/', permanent: false },
      { source: '/pasangan-hati', destination: '/', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
