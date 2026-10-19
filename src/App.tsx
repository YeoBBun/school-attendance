import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Icon, type IconName } from './components/icons';
import { RecordList } from './components/RecordList';
import { SettingsView } from './components/SettingsView';
import { Today } from './components/Today';
import { StoreProvider, useNeedBackup, useStore } from './store';

const TABS: readonly { id: 'today' | 'records' | 'stats' | 'settings'; label: string; icon: IconName }[] = [
  { id: 'today', label: '오늘', icon: 'today' },
  { id: 'records', label: '기록', icon: 'list' },
  { id: 'stats', label: '통계', icon: 'chart' },
  { id: 'settings', label: '설정', icon: 'gear' },
];
type TabId = (typeof TABS)[number]['id'];

/** 예전 주소(#dashboard, #calendar)로 들어와도 맞는 탭을 연다. */
const LEGACY: Record<string, TabId> = { dashboard: 'stats', calendar: 'records' };

function readTab(): TabId {
  const h = location.hash.slice(1);
  if (h in LEGACY) return LEGACY[h];
  return TABS.some((t) => t.id === h) ? (h as TabId) : 'today';
}

function Shell() {
  const { state, saveError, sync } = useStore();
  const [tab, setTab] = useState<TabId>(readTab);
  const needBackup = useNeedBackup();

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>
            출
          </span>
          <h1>
            출결·서류 관리
            {state.settings.className && <span className="class-name">{state.settings.className}</span>}
          </h1>
          {sync.kind !== 'off' && (
            <a href="#settings" className={`sync-badge ${sync.kind}`} title={sync.kind === 'error' ? sync.message : '휴대폰 ↔ PC 동기화'}>
              {sync.kind === 'error' ? '⚠ 동기화 안 됨' : sync.kind === 'syncing' ? '⟳ 맞추는 중' : '✓ 동기화됨'}
            </a>
          )}
        </div>
        <nav aria-label="메뉴">
          {TABS.map((t) => (
            <a key={t.id} href={`#${t.id}`} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined}>
              <Icon name={t.icon} />
              <span className="nav-label">{t.label}</span>
              {t.id === 'settings' && needBackup && <span className="dot" title="백업할 때가 됐어요" />}
            </a>
          ))}
        </nav>
      </header>
      {saveError && <div className="banner error">{saveError}</div>}
      <main>
        {tab === 'today' && <Today />}
        {tab === 'records' && <RecordList initialView={location.hash === '#calendar' ? 'calendar' : 'list'} />}
        {tab === 'stats' && <Dashboard />}
        {tab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
