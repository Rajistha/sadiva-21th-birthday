'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/Art';
import { TicketStage } from '@/components/ticket/TicketStage';
import { DateTimePicker } from '@/components/ui/DatePicker';
import { toast } from '@/components/ui/toast';
import { markStep } from '@/lib/journey';
import { fromWitaInput } from '@/lib/panel';
import { getBrowserClient } from '@/lib/supabase/browser';
import { makeCode, onTicketsChange, pushTicket, readTickets, saveTicket, TICKET_MOODS, type Ticket } from '@/lib/tickets';
import type { Coupon } from '@/lib/types';
import { ScratchLayer } from './ScratchLayer';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = 'ina.coupons';
const SCRATCH = 'ina.scratched';
const ICON_KEYS: IconName[] = ['gift', 'utensils', 'film', 'heart', 'star', 'cake', 'flower'];
const couponIcon = (v: string | null): IconName => (ICON_KEYS.includes(v as IconName) ? (v as IconName) : 'gift');

const readScratched = (): string[] => {
  try { return JSON.parse(localStorage.getItem(SCRATCH) ?? '[]') as string[]; } catch { return []; }
};

type View = { t: 'list' } | { t: 'order'; c: Coupon } | { t: 'ticket'; ticket: Ticket; fresh: boolean };

/** Kupon gosok: gosok dulu untuk melihat hadiahnya, klaim, pilih tanggal, lalu tiketnya dicetak. */
const FREE_ID = 'bebas';
const FREE: Coupon = { id: FREE_ID, title: '', description: null, emoji: 'heart', claimed: false };

export function Coupons({ coupons, wa, freeMax, printSound }: { coupons: Coupon[]; wa: string; freeMax: number; printSound?: string | null }) {
  const [claimed, setClaimed] = useState<Record<string, boolean>>(() => Object.fromEntries(coupons.map((c) => [c.id, c.claimed])));
  const [revealed, setRevealed] = useState<string[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [view, setView] = useState<View>({ t: 'list' });

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>;
      setClaimed((s) => ({ ...s, ...Object.fromEntries(Object.entries(local).filter(([id]) => !UUID.test(id))) }));
    } catch {}
    setRevealed(readScratched());
    setTickets(readTickets());
    return onTicketsChange(() => setTickets(readTickets()));
  }, []);

  const reveal = (id: string) => {
    setRevealed((r) => {
      const next = r.includes(id) ? r : [...r, id];
      try { localStorage.setItem(SCRATCH, JSON.stringify(next)); } catch {}
      return next;
    });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      import('canvas-confetti').then(({ default: f }) => f({ particleCount: 40, spread: 55, origin: { y: 0.6 }, colors: ['#FFB8CD', '#FFE58A', '#E96A96'] }));
    }
  };

  /** Tandai kupon terklaim (database atau lokal untuk kupon contoh). Mengembalikan true bila berhasil. */
  const claim = async (c: Coupon) => {
    if (UUID.test(c.id)) {
      const sb = getBrowserClient();
      if (sb) {
        const { error } = await sb.rpc('claim_coupon', { p_id: c.id });
        if (error) { toast('Yah, kuponnya belum bisa diklaim. Coba lagi sebentar ya.', false); return false; }
      }
    } else {
      try {
        const local = JSON.parse(localStorage.getItem(KEY) ?? '{}');
        localStorage.setItem(KEY, JSON.stringify({ ...local, [c.id]: true }));
      } catch {}
    }
    setClaimed((s) => ({ ...s, [c.id]: true }));
    markStep('kupon');
    return true;
  };

  const ticketOf = (c: Coupon) => tickets.find((t) => t.couponId === c.id);
  const freeTickets = tickets.filter((t) => t.kind === 'permintaan');
  const freeLeft = Math.max(0, freeMax - freeTickets.length);

  if (view.t === 'order') {
    return (
      <Order
        c={view.c}
        onBack={() => setView({ t: 'list' })}
        onPrint={async (input) => {
          const free = view.c.id === FREE_ID;
          if (free) markStep('kupon');
          else if (!(await claim(view.c))) return;
          const ticket: Ticket = {
            code: makeCode(), kind: free ? 'permintaan' : 'hadiah', title: free ? (input.title ?? '') : view.c.title, pickedAt: input.pickedAt, note: input.note, mood: input.mood,
            couponId: free ? null : view.c.id, createdAt: new Date().toISOString(), sent: false,
          };
          saveTicket(ticket);
          void pushTicket(ticket);
          setView({ t: 'ticket', ticket, fresh: true });
        }}
      />
    );
  }

  if (view.t === 'ticket') {
    return (
      <div>
        <button onClick={() => setView({ t: 'list' })} className="mb-4 inline-flex items-center gap-1 text-sm font-extrabold text-pink-700 hover:underline">
          <Icon name="back" size={16} /> Kembali ke kupon
        </button>
        <TicketStage ticket={tickets.find((t) => t.code === view.ticket.code) ?? view.ticket} wa={wa} animate={view.fresh} soundUrl={printSound} />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-center text-sm font-bold text-ink-600">Gosok kuponnya untuk melihat hadiahnya, lalu klaim dan pilih harinya.</p>
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        {coupons.map((c, i) => {
          const done = claimed[c.id];
          const open = done || revealed.includes(c.id);
          const tk = ticketOf(c);
          return (
            <div key={c.id} className="relative">
            {/* lapisan gosok sengaja di LUAR elemen bertopeng/berfilter: kanvas di dalamnya membuat tampilan rusak di beberapa browser */}
            {!open && <ScratchLayer className="left-px top-px h-[116px] w-[calc(100%-106px)] rounded-l-[21px]" onReveal={() => reveal(c.id)} />}
            <div className={`coupon-wrap ${done && !tk ? 'opacity-70' : ''}`}>
              <div className="coupon flex h-[118px]">
                <div className="relative flex-1">
                  <div className="px-[18px] py-4 text-left">
                    <div className="label !text-[10px]">Kupon janji</div>
                    <div className="mt-1 font-display text-[19px] font-bold uppercase leading-tight">{c.title}</div>
                    {c.description && <div className="mt-1 text-xs font-semibold text-ink-600">{c.description}</div>}
                    <div className="mt-2 text-[11px] font-extrabold tracking-[0.12em] text-pink-600">AB21-{String(i + 1).padStart(3, '0')}</div>
                  </div>
                </div>
                <div className="flex w-[104px] flex-col items-center justify-center gap-1.5 border-l-2 border-dashed border-pink-200 p-2">
                  {done ? (
                    tk ? (
                      <button onClick={() => setView({ t: 'ticket', ticket: tk, fresh: false })} className="btn btn-s !h-9 !px-3 !text-[13px]"><Icon name="gift" size={14} /> Tiketku</button>
                    ) : (
                      <div className="-rotate-[8deg] rounded-[10px] border-2 border-pink-400 px-2 py-1 text-xs font-extrabold text-pink-600">TERKLAIM</div>
                    )
                  ) : (
                    <>
                      <Icon name={couponIcon(c.emoji)} size={28} className={open ? 'text-pink-500' : 'text-pink-200'} />
                      <button onClick={() => setView({ t: 'order', c })} disabled={!open} className="btn btn-p !h-9 !px-4 !text-sm">{open ? 'Klaim' : 'Gosok dulu'}</button>
                    </>
                  )}
                </div>
              </div>
            </div>
            </div>
          );
        })}

        {freeMax > 0 && (
          <div className="coupon-wrap">
            <div className="coupon flex min-h-[118px] !border-dashed !border-pink-300" style={{ background: 'linear-gradient(135deg,#FFF9E3,#FFEFF3)' }}>
              <div className="flex-1 px-[18px] py-3.5 text-left">
                <div className="label !text-[10px]">Kupon bebas</div>
                <div className="mt-1 font-display text-[17px] font-bold uppercase leading-tight sm:text-[19px]">Tulis permintaanmu</div>
                <div className="mt-1 text-xs font-semibold text-ink-600">Apa pun yang kamu mau dariku</div>
                <div className="mt-2 text-[11px] font-extrabold tracking-[0.12em] text-pink-600">{freeLeft > 0 ? `TERSISA ${freeLeft} DARI ${freeMax}` : 'SUDAH HABIS'}</div>
              </div>
              <div className="flex w-[104px] flex-col items-center justify-center gap-1.5 border-l-2 border-dashed border-pink-200 p-2">
                <Icon name="pencil" size={26} className="text-pink-500" />
                <button onClick={() => setView({ t: 'order', c: FREE })} disabled={freeLeft === 0} className="btn btn-p !h-9 !px-4 !text-sm">{freeLeft > 0 ? 'Tulis' : 'Habis'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {freeTickets.length > 0 && (
        <div className="mt-6">
          <div className="label mb-2 text-center !text-[10px]">Permintaan yang sudah kamu kirim</div>
          <div className="flex flex-wrap justify-center gap-2">
            {freeTickets.map((t) => (
              <button key={t.code} onClick={() => setView({ t: 'ticket', ticket: t, fresh: false })} className="chip max-w-full !h-auto min-h-[34px] py-1 text-left leading-tight" title={t.title}>
                <Icon name="gift" size={13} className="shrink-0" /> <span className="truncate">{t.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Order({ c, onBack, onPrint }: { c: Coupon; onBack: () => void; onPrint: (i: { pickedAt: string; note: string | null; mood: string | null; title?: string }) => Promise<void> }) {
  const free = c.id === FREE_ID;
  const [request, setRequest] = useState('');
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (free && request.trim().length < 3) { toast('Tulis dulu permintaanmu ya (minimal 3 huruf).', false); return; }
    const iso = fromWitaInput(when);
    if (!iso) { toast('Pilih dulu tanggal dan jam yang kamu mau.', false); return; }
    if (new Date(iso).getTime() <= Date.now()) { toast('Pilih waktu di masa depan ya.', false); return; }
    setBusy(true);
    await onPrint({ pickedAt: iso, note: note.trim() || null, mood, title: free ? request.trim() : undefined });
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-[520px] text-left">
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm font-extrabold text-pink-700 hover:underline">
        <Icon name="back" size={16} /> Kembali ke kupon
      </button>
      <div className="card p-5">
        {free ? (
          <div>
            <label htmlFor="tk-req" className="label !text-[10px]">Permintaanmu untukku</label>
            <textarea id="tk-req" rows={2} maxLength={80} className="input mt-1.5 font-display !text-lg" value={request} onChange={(e) => setRequest(e.target.value)} placeholder="Tulis apa pun yang kamu mau…" />
            <div className="mt-1 text-right text-xs font-bold text-ink-600">{request.length}/80</div>
          </div>
        ) : (
          <>
            <div className="label !text-[10px]">Kamu memilih</div>
            <div className="mt-1 flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-butter-100 text-pink-600"><Icon name={couponIcon(c.emoji)} size={24} /></span>
              <div className="min-w-0">
                <div className="font-display text-xl font-semibold uppercase leading-tight">{c.title}</div>
                {c.description && <div className="text-sm font-semibold text-ink-600">{c.description}</div>}
              </div>
            </div>
          </>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold">{free ? 'Kapan kamu mau permintaan ini?' : 'Kapan kamu mau?'}</label>
            <DateTimePicker value={when} onChange={setWhen} label="Tanggal dan jam" placeholder="Pilih tanggal dan jam" clearable={false} />
          </div>
          <div>
            <label htmlFor="tk-note" className="mb-1 block text-sm font-bold">Pesan kecil (opsional)</label>
            <input id="tk-note" className="input" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} placeholder={free ? 'Detail tambahan kalau perlu' : 'Mis. yang pedas ya'} />
          </div>
          <div>
            <div className="mb-1.5 text-sm font-bold">Suasana hatimu hari ini</div>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Suasana hati">
              {TICKET_MOODS.map((m) => (
                <button key={m.key} type="button" onClick={() => setMood(mood === m.key ? null : m.key)} aria-pressed={mood === m.key} className={`flex flex-col items-center gap-0.5 rounded-[18px] border-2 py-2.5 transition ${mood === m.key ? 'border-pink-400 bg-pink-100' : 'border-transparent bg-pink-50 hover:bg-pink-100'}`}>
                  <span className="text-[28px] leading-none">{m.emoji}</span>
                  <span className="text-xs font-extrabold text-ink-600">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button disabled={busy} className="btn btn-p mt-6 !h-12 w-full !text-[16px]"><Icon name="gift" size={18} /> {busy ? 'Menyiapkan…' : 'Cetak tiketku'}</button>
      </div>
    </form>
  );
}
