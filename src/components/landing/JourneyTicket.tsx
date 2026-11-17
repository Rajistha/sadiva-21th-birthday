'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Art';
import { TicketStage } from '@/components/ticket/TicketStage';
import { useJourney, type StepId } from '@/lib/journey';
import { makeCode, onTicketsChange, pushTicket, readTickets, saveTicket, type Ticket } from '@/lib/tickets';
import { Sheet } from './Sheet';

/**
 * "Tiket Perjalanan 21": muncul di penutup setelah SEMUA stempel terkumpul.
 * Dicetak sekali; sesudahnya bisa dilihat dan dikirim ulang.
 */
export function JourneyTicket({ ids, wa, printSound }: { ids: StepId[]; wa: string; printSound?: string | null }) {
  const done = useJourney();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(false);

  const sync = useCallback(() => setTicket(readTickets().find((t) => t.kind === 'perjalanan') ?? null), []);
  useEffect(() => { sync(); return onTicketsChange(sync); }, [sync]);

  const all = ids.length > 0 && ids.every((id) => done[id]);
  if (!all) return null;

  const print = () => {
    let t = ticket;
    if (!t) {
      const now = new Date().toISOString();
      t = {
        code: makeCode(), kind: 'perjalanan', title: 'Perjalanan Selesai', pickedAt: now,
        note: `${ids.length} stempel hati terkumpul`, mood: null, couponId: null, createdAt: now, sent: false,
      };
      saveTicket(t);
      void pushTicket(t);
      setTicket(t);
      setFresh(true);
    } else setFresh(false);
    setOpen(true);
  };

  return (
    <>
      <div className="mx-auto mt-8 flex max-w-[460px] flex-col items-center gap-2 rounded-[26px] border-2 border-white bg-white/70 p-5 shadow-float backdrop-blur-sm">
        <div className="label !text-[10px]">Semua stempel terkumpul</div>
        <p className="font-display text-xl font-semibold">Ada tiket kenang-kenangan untukmu</p>
        <button onClick={print} className="btn btn-p mt-1 !h-12 !px-7 !text-[16px]">
          <Icon name="gift" size={18} /> {ticket ? 'Lihat Tiket Perjalanan 21' : 'Cetak Tiket Perjalanan 21'}
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} label="Kenang-kenangan" title="Tiket Perjalanan 21" sub="Bukti kamu sudah menempuh seluruh perjalanannya." art="envelope">
        {ticket && <TicketStage ticket={ticket} wa={wa} animate={fresh} stampText="SELESAI" soundUrl={printSound} />}
      </Sheet>
    </>
  );
}
