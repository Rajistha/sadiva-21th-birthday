'use client';

import { useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/** Teks surat dengan efek mengetik saat terlihat. Bisa dilewati. */
export function Typewriter({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const done = reduce || n >= text.length;

  useEffect(() => {
    if (!inView || reduce) return;
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 22);
    return () => clearInterval(id);
  }, [inView, reduce, text.length]);

  const shown = done ? text : text.slice(0, n);

  return (
    <div ref={ref}>
      <p className="sr-only">{text}</p>
      <div
        aria-hidden
        className="whitespace-pre-line font-hand text-2xl font-semibold leading-9 md:text-[31px] md:leading-[46px]"
        style={{ backgroundImage: 'repeating-linear-gradient(transparent,transparent 35px,#FFE9EF 36px)' }}
      >
        {shown}
        {!done && <span className="animate-pulse text-pink-500">|</span>}
      </div>
      {inView && !done && (
        <button onClick={() => setN(text.length)} className="btn btn-g mt-1 !h-8 !px-0 !text-xs">Lewati animasi</button>
      )}
    </div>
  );
}
