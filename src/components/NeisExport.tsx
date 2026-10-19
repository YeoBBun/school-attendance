import { useMemo, useState } from 'react';
import { addDays, formatKo, monthKey, today } from '../domain/calendar';
import { buildNeisFile } from '../domain/neis';
import { downloadBlob } from '../storage/db';
import { useStore } from '../store';
import { Modal } from './common';

/**
 * 나이스 자동 입력 키트에 넘길 파일을 만든다.
 * 파일 이름은 영문으로 한다 — 일부 브라우저가 한글 다운로드 이름을 'download' 로 바꿔 버린다.
 * 키트(github.com/YeoBBun/neis-automation-kit)의 app_to_neis.py 가 다운로드 폴더에서 읽어 나이스에 넣는다.
 */
export function NeisExport({ onClose }: { onClose: () => void }) {
  const { state, update, holidays } = useStore();
  const now = today();
  const last = state.settings.lastNeisExportTo;
  const [from, setFrom] = useState(() => (last && last < now ? addDays(last, 1) : `${monthKey(now)}-01`));
  const [to, setTo] = useState(now);

  const file = useMemo(
    () => buildNeisFile(state.students, state.records, holidays, from, to < from ? from : to),
    [state.students, state.records, holidays, from, to],
  );

  const baseName = `attendance_neis_${file.from.replace(/-/g, '')}-${file.to.replace(/-/g, '')}`;
  const markExported = () => update((s) => ({ ...s, settings: { ...s.settings, lastNeisExportTo: file.to } }));
  const [shareMsg, setShareMsg] = useState('');
  const save = () => {
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${baseName}.json`);
    markExported();
  };

  // 휴대폰: 공유 창으로 구글 드라이브에 보낸다. 안드로이드 크롬은 .json 공유를 막아서 내용은 같고 확장자만 .txt 로 보낸다.
  const shareFile = useMemo(
    () => new File([JSON.stringify(file, null, 2)], `${baseName}.txt`, { type: 'text/plain' }),
    [file, baseName],
  );
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [shareFile] });

  const share = async () => {
    try {
      await navigator.share({ files: [shareFile], title: '나이스 입력 파일' });
      markExported();
      setShareMsg('보냈어요. 학교 PC 크롬에서 구글 드라이브를 열고 이 파일을 다운로드하세요.');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return; // 선생님이 취소함
      setShareMsg('보내지 못했어요. 「파일 저장」으로 저장한 뒤 드라이브 앱에서 올려 주세요.');
    }
  };

  return (
    <Modal title="나이스 입력 파일 만들기" onClose={onClose}>
      <div className="form">
        <section className="row">
          <div>
            <label className="field-label">시작일</label>
            <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </div>
          <div>
            <label className="field-label">종료일</label>
            <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </div>
        </section>
        {last && <p className="hint">지난번에 {formatKo(last)}까지 내보냈어요.</p>}

        <section>
          <label className="field-label">나이스에 넣을 출결 {file.records.length}건</label>
          {file.records.length === 0 ? (
            <p className="muted">이 기간에 넣을 출결이 없어요.</p>
          ) : (
            <ul className="neis-list">
              {file.records.map((r) => (
                <li key={`${r.date}-${r.number}-${r.att_type}`}>
                  {formatKo(r.date)} {r.number}번 {r.name} · {r.att_type}
                  {r.note && ` (${r.note})`}
                </li>
              ))}
            </ul>
          )}
        </section>

        {file.skipped.length > 0 && (
          <section>
            <label className="field-label">자동으로 못 넣는 것 {file.skipped.length}건 — 나이스에서 직접</label>
            <ul className="warnings">
              {file.skipped.map((s) => (
                <li key={`${s.date}-${s.number}-${s.label}`}>
                  {formatKo(s.date)} {s.number}번 {s.name} {s.label}: {s.reason}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="hint">
          {canShare ? (
            <>
              휴대폰에서는 <b>드라이브로 보내기</b> → 학교 PC 크롬에서 구글 드라이브를 열어 다운로드하면, 예약해 둔 시각에 자동으로
              나이스에 들어가요.
            </>
          ) : (
            <>
              저장한 뒤 키트 폴더의 클로드 앱에 <b>"앱 출결 나이스에 넣어줘"</b> 라고 하세요 (예약해 두었다면 그 시각에 자동으로
              들어가요).
            </>
          )}{' '}
          학생 번호·이름이 나이스와 똑같아야 들어가요. 파일에는 학생 이름과 출결이 들어 있으니 다 넣은 뒤에는 드라이브에서도 지워
          주세요.
        </p>
        {shareMsg && <p className="info">{shareMsg}</p>}

        <footer className="form-actions">
          <span className="spacer" />
          <button onClick={onClose}>닫기</button>
          {canShare && (
            <button disabled={file.records.length === 0} onClick={save}>
              파일 저장
            </button>
          )}
          <button className="primary big" disabled={file.records.length === 0} onClick={canShare ? share : save}>
            {canShare ? '드라이브로 보내기' : '파일 저장'}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
