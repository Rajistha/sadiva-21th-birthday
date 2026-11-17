import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * - Menyegarkan sesi Supabase di setiap permintaan.
 * - Melindungi /ruang-rahasia/* (kecuali /kunci). Buku Harapan kini pop-up dan memeriksa masuk sendiri.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const needsAuth = pathname.startsWith('/ruang-rahasia') && !pathname.startsWith('/ruang-rahasia/kunci');

  if (!URL_ || !ANON) {
    if (needsAuth) {
      const to = request.nextUrl.clone();
      to.pathname = '/ruang-rahasia/kunci';
      return NextResponse.redirect(to);
    }
    return response;
  }

  const supabase = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  if (needsAuth && !data.user) {
    const to = request.nextUrl.clone();
    to.pathname = '/ruang-rahasia/kunci';
    to.search = '';
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  // hanya Ruang Rahasia: situs publik tidak perlu memanggil Supabase di tiap permintaan
  matcher: ['/ruang-rahasia/:path*'],
};
