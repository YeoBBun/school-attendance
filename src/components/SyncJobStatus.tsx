import { useEffect, useState } from 'react';
import { loadSyncConfig, refreshJob, type SyncJob } from '../sync/neisSync';

const POLL_MS = 15_000;
const LATE_MS = 10 * 60_000;

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 휴대폰에서 보낸 출결이 학교 PC 에서 나이스에 들어갔는지 보여준다. 기다리는 동안 15초마다 확인한다. */
export function SyncJobStatus({ job: initial }: { job: SyncJob }) {
  const [job, setJob] = useState(initial);
  const [, tick] = useState(0);

  useEffect(() => setJob(initial), [initial]);

  useEffect(() => {
    if (job.status !== 'pending') return;
    const cfg = loadSyncConfig();
    if (!cfg) return;
    let alive = true;
    const check = () =>
      refreshJob(cfg, job)
        .then((j) => alive && setJob(j))
        .catch(() => undefined)
        .finally(() => alive && tick((n) => n + 1));
    check();
    const t = setInterval(check, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [job]);

  const sent = `${hhmm(job.sentAt)} 보낸 출결 ${job.count}건`;
  if (job.status === 'pending') {
    const late = Date.now() - Date.parse(job.sentAt) > LATE_MS;
    return (
      <p className="sync-status pending">
        {sent} — {late ? '아직 학교 PC가 받지 않았어요. PC가 꺼져 있거나 자동 연동이 꺼져 있으면, 켜질 때 들어가요.' : '학교 PC가 받기를 기다리는 중…'}
      </p>
    );
  }
  return (
    <p className={`sync-status ${job.status}`}>
      {sent} — {job.status === 'done' ? '✓ ' : '⚠ '}
      {job.message}
    </p>
  );
}
