'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { JourneyDetail } from '@/types/domain';
import { Icon } from '@/components/ui/Icon';

function countdown(deadline?: string | null) {
  if (!deadline) return 'Deadline not set';
  const distance = new Date(deadline).getTime() - Date.now();
  if (distance <= 0) return 'Deadline passed';
  const days = Math.floor(distance / 86_400_000);
  const hours = Math.floor((distance % 86_400_000) / 3_600_000);
  const minutes = Math.floor((distance % 3_600_000) / 60_000);
  const seconds = Math.floor((distance % 60_000) / 1000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export default function HomePage() {
  const [detail, setDetail] = useState<JourneyDetail | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [remindersOn, setRemindersOn] = useState(false);
  const [timerPosition, setTimerPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    async function load() {
      const journeys = await fetch('/api/journeys').then((r) => r.json());
      if (journeys.journeys?.[0]) {
        const response = await fetch(`/api/journeys/${journeys.journeys[0].id}`);
        if (response.ok) setDetail(await response.json());
      }
    }
    load().catch(() => undefined);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const deadline = detail?.journey.deadline;
    if (!deadline || !remindersOn || !('Notification' in window) || Notification.permission !== 'granted') return;
    const remaining = new Date(deadline).getTime() - clock;
    const reminderKey = `raasta-reminder-${detail.journey.id}`;
    if (remaining > 0 && remaining <= 86_400_000 && !localStorage.getItem(reminderKey)) {
      new Notification('Raasta: deadline tomorrow', { body: `${detail.journey.title} is due within 24 hours.` });
      localStorage.setItem(reminderKey, 'sent');
    }
  }, [clock, detail, remindersOn]);

  useEffect(() => {
    if (!dragStart) return;
    const move = (event: PointerEvent) => setTimerPosition({
      x: dragStart.ox + event.clientX - dragStart.x,
      y: dragStart.oy + event.clientY - dragStart.y,
    });
    const stop = () => setDragStart(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
  }, [dragStart]);

  const enableReminders = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setRemindersOn(permission === 'granted');
    if (permission === 'granted') new Notification('Raasta reminders are on', { body: 'We will keep your deadlines visible.' });
  };

  const journey = detail?.journey;
  const next = detail?.nextAction;
  const tasks = detail?.nodes.filter((node) => node.status !== 'COMPLETED').slice(0, 3) ?? [];

  return (
    <div className="reminder-home">
      <section className="reminder-hero">
        <p className="eyebrow">YOUR REAL-WORLD REMINDER BOOK</p>
        <h1>Know it <span>before</span> it is too late.</h1>
        <p className="reminder-lede">Upload a notice. Raasta finds the deadline, what can block you, and the one thing to do next.</p>
        <div className="hero-actions">
          <Link href="/documents" className="sketch-button"><Icon name="upload" /> Upload a scholarship notice</Link>
          <button className="scribble-control" onClick={enableReminders}><Icon name="bell" /> {remindersOn ? 'Reminders on' : 'Turn on reminders'}</button>
        </div>
      </section>

      {journey ? (
        <section className="deadline-board" aria-label="Active deadline">
          <div className="deadline-copy">
            <p className="eyebrow">ACTIVE JOURNEY · {journey.category}</p>
            <h2>{journey.title}</h2>
            <p>{journey.deadline ? `Deadline: ${new Date(journey.deadline).toLocaleString()}` : 'Add a deadline to start your countdown.'}</p>
          </div>
          <div className="countdown-note" aria-live="polite" style={{ transform: `translate(${timerPosition.x}px, ${timerPosition.y}px) rotate(1.5deg)` }} onPointerDown={(event) => setDragStart({ x: event.clientX, y: event.clientY, ox: timerPosition.x, oy: timerPosition.y })} title="Drag the timer anywhere on your page">
            <span>TIME LEFT</span>
            <strong key={clock}>{countdown(journey.deadline)}</strong>
            <small><Icon name="clock" /> live countdown</small>
            <em>drag me</em>
          </div>
        </section>
      ) : (
        <section className="empty-note"><span><Icon name="pin" size={30} /></span><div><h2>No deadline yet.</h2><p>Start with a goal or upload the scholarship notice you want Raasta to track.</p></div></section>
      )}

      {next && (
        <section className="do-now" aria-label="Most useful next action">
          <div className="do-now-sticker">DO THIS<br />NOW</div>
          <div>
            <p className="eyebrow">ONE USEFUL THING. NOT TWENTY TASKS.</p>
            <h2><Icon name="arrow" /> {next.title}</h2>
            <p>{next.reason}</p>
          </div>
          <Link href={`/journeys/${journey?.id}`} className="sketch-button">Open plan →</Link>
        </section>
      )}

      <section className="reminder-list">
        <div className="section-heading"><div><p className="eyebrow">COMING UP</p><h2>Your reminder list</h2></div><Link href="/journeys">See all →</Link></div>
        <div className="reminder-items">
          {tasks.map((task) => <Link key={task.id} href={`/journeys/${journey?.id}`} className="reminder-item"><span><Icon name={task.status === 'NEEDS_VERIFICATION' ? 'warning' : task.status === 'BLOCKED' ? 'warning' : 'calendar'} /></span><div><strong>{task.title}</strong><small>{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : 'No date set'}</small></div><b><Icon name="arrow" /></b></Link>)}
          {!tasks.length && <p className="quiet-copy">Your next reminders will appear here after you create a journey.</p>}
        </div>
      </section>
    </div>
  );
}
