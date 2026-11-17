import { notFound } from 'next/navigation';
import { DemoMomen } from './DemoMomen';

export const dynamic = 'force-dynamic';

/** Hanya untuk pengembangan: contoh tampilan Telepon, Langit, dan Peta tanpa database. */
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DemoMomen />;
}
