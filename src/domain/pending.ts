/**
 * 아직 받지 않은 필수 서류 목록 — 오늘 화면의 '받아야 할 서류'와 휴대폰 위젯이 같이 쓴다.
 */
import { formatKo, type HolidayIndex } from './calendar';
import { applicationDeadline, DOC_FT_APPLICATION, DOC_FT_REPORT, missingDocs, reportDeadline } from './rules';
import { KIND_SHORT, type AppState, type AttendanceRecord, type DateStr, type DocItem } from './types';

export interface PendingRow {
  record: AttendanceRecord;
  doc: DocItem;
  deadline?: DateStr;
}

/** 받을 서류를 출결 시작일 순으로. 기한은 체험학습 신청서·보고서에만 있다. */
export function pendingDocs(state: AppState, holidays: HolidayIndex): PendingRow[] {
  const out: PendingRow[] = [];
  for (const record of state.records) {
    for (const doc of missingDocs(record)) {
      let deadline: DateStr | undefined;
      if (doc.key === DOC_FT_APPLICATION) deadline = applicationDeadline(record, state.settings, holidays);
      if (doc.key === DOC_FT_REPORT) deadline = reportDeadline(record, state.settings, holidays);
      out.push({ record, doc, deadline });
    }
  }
  return out.sort((a, b) => a.record.startDate.localeCompare(b.record.startDate));
}

/** 서류 목록용 짧은 표기. 예: 질병결석, 생리 조퇴, 체험학습 */
export function shortTitle(r: AttendanceRecord): string {
  if (r.kind !== '출석인정' || !r.reason) return `${KIND_SHORT[r.kind]}${r.status}`;
  return r.reason === '체험학습' ? '체험학습' : `${r.reason} ${r.status}`;
}

export function studentName(state: AppState, id: string): string {
  const s = state.students.find((x) => x.id === id);
  return s ? `${s.number}. ${s.name}` : '?';
}

// ─── 휴대폰 위젯용 요약 ──────────────────────────────────

export const WIDGET_FORMAT = 'attendance-app/pending-v1';

export interface WidgetItem {
  /** 예: 3. 김하늘 */
  who: string;
  /** 예: 결석계 */
  doc: string;
  /** 예: 10/21(화) 질병결석 */
  what: string;
  /** 기한 (체험학습 신청서·보고서). 지나면 위젯에서 빨갛게 위로 올린다 */
  deadline?: DateStr;
  /** 체험학습 보고서: 이 날까지는 '다녀온 후'로 표시 */
  tripEnd?: DateStr;
}

export interface WidgetSummary {
  format: typeof WIDGET_FORMAT;
  className: string;
  items: WidgetItem[];
}

/**
 * 위젯에 보여줄 받을 서류 요약. 오늘 날짜에 따라 바뀌는 것(기한 지남, 다녀온 후)은 위젯이 계산하므로
 * 출결 데이터가 그대로면 요약도 그대로다 — 바뀔 때만 올린다.
 */
export function widgetSummary(state: AppState, holidays: HolidayIndex): WidgetSummary {
  return {
    format: WIDGET_FORMAT,
    className: state.settings.className,
    items: pendingDocs(state, holidays).map(({ record, doc, deadline }) => ({
      who: studentName(state, record.studentId),
      doc: doc.label,
      what: `${formatKo(record.startDate)} ${shortTitle(record)}`,
      ...(deadline ? { deadline } : {}),
      ...(doc.key === DOC_FT_REPORT ? { tripEnd: record.endDate } : {}),
    })),
  };
}
