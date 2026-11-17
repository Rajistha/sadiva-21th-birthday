import { Sprig } from '@/components/Art';
import { LoginForm } from '@/components/panel/LoginForm';
import { hasSupabase } from '@/lib/env';

export const metadata = { title: 'Kunci Rahasia', robots: { index: false, follow: false } };

export default function KunciPage() {
  return (
    <main className="relative grid min-h-[100svh] place-items-center overflow-hidden px-5 py-12" style={{ background: 'linear-gradient(180deg,#FFF9E3,#FFE9EF)' }}>
      <Sprig className="-left-8 bottom-10 w-[140px] md:w-[220px]" rotate={10} opacity={0.5} />
      <Sprig className="-right-8 top-10 w-[130px] md:w-[200px]" flip rotate={-8} opacity={0.5} />
      <div className="relative w-full max-w-[400px] text-center">
        <div className="label">Khusus pembuat</div>
        <h1 className="mb-6 mt-1 font-script text-[56px] leading-tight text-pink-600">Kunci Rahasia</h1>
        <LoginForm configured={hasSupabase} />
      </div>
    </main>
  );
}
