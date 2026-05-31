'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const CATS = {
  personal: { label: 'Personal', color: '#C28E6D' },
  work:     { label: 'Work',     color: '#7E93B8' },
  health:   { label: 'Health',   color: '#8FAE8B' },
  home:     { label: 'Home',     color: '#B091A6' },
  shopping: { label: 'Shopping', color: '#C2A86A' },
} as const;

type CatKey = keyof typeof CATS;
const CAT_KEYS = Object.keys(CATS) as CatKey[];

interface Todo {
  id: string;
  text: string;
  cat: CatKey;
  done: boolean;
  time: string | null;
}

interface NotifSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const NOTIF_KEY = 'notif-settings';
const DEFAULT_NOTIF: NotifSettings = { enabled: false, hour: 9, minute: 0 };

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

// ─── 알림 스케줄러 ───────────────────────────────────────────
let notifTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleNotification(settings: NotifSettings) {
  if (notifTimer) clearTimeout(notifTimer);
  if (!settings.enabled) return;

  const now = new Date();
  const target = new Date();
  target.setHours(settings.hour, settings.minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);

  const delay = target.getTime() - now.getTime();

  notifTimer = setTimeout(() => {
    try {
      const todos: Todo[] = JSON.parse(localStorage.getItem('todos-v2') || '[]');
      const active = todos.filter(t => !t.done);
      if (active.length > 0 && Notification.permission === 'granted') {
        new Notification('Tasks 리마인더 ✅', {
          body: `완료하지 못한 할 일이 ${active.length}개 있어요.`,
          icon: '/icons/icon.svg',
          badge: '/icons/icon.svg',
          tag: 'todo-reminder',
        });
      }
    } catch { /* ignore */ }
    // 다음 날 재스케줄
    const saved = localStorage.getItem(NOTIF_KEY);
    if (saved) {
      try { scheduleNotification(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, delay);
}

// ─── 공통 컴포넌트 ────────────────────────────────────────────
function Dot({ cat, size = 7 }: { cat: CatKey; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: CATS[cat].color, display: 'inline-block', flexShrink: 0,
    }} />
  );
}

function Check({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={done ? '완료 취소' : '완료'}
      style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        border: `1.85px solid ${done ? '#1A1A18' : 'rgba(0,0,0,0.22)'}`,
        background: done ? '#1A1A18' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0, cursor: 'pointer',
        transition: 'all .22s cubic-bezier(.4,1.3,.5,1)',
      }}
    >
      <svg width={13} height={13} viewBox="0 0 14 14" style={{
        opacity: done ? 1 : 0,
        transform: done ? 'scale(1)' : 'scale(.4)',
        transition: 'all .22s cubic-bezier(.4,1.3,.5,1)',
      }}>
        <path d="M2 7.5l3 3 7-7.5" fill="none" stroke="#fff"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ─── 알림 설정 패널 ───────────────────────────────────────────
function NotifPanel({
  settings, onChange, onClose,
}: {
  settings: NotifSettings;
  onChange: (s: NotifSettings) => void;
  onClose: () => void;
}) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  async function handleToggle() {
    if (!settings.enabled) {
      if (permission !== 'granted') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') return;
      }
      onChange({ ...settings, enabled: true });
    } else {
      onChange({ ...settings, enabled: false });
    }
  }

  function handleTime(e: React.ChangeEvent<HTMLInputElement>) {
    const [h, m] = e.target.value.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) onChange({ ...settings, hour: h, minute: m });
  }

  function sendTest() {
    if (permission !== 'granted') return;
    const todos: Todo[] = JSON.parse(localStorage.getItem('todos-v2') || '[]');
    const active = todos.filter(t => !t.done);
    new Notification('Tasks 리마인더 ✅', {
      body: active.length > 0
        ? `완료하지 못한 할 일이 ${active.length}개 있어요.`
        : '오늘 할 일을 모두 완료했어요! 🎉',
      icon: '/icons/icon.svg',
      tag: 'todo-reminder',
    });
  }

  return (
    <div style={{
      margin: '0 20px 16px',
      background: '#fff', borderRadius: 18,
      padding: '16px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '0.5px solid rgba(0,0,0,0.07)',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A18' }}>매일 리마인더</span>
        <button onClick={onClose} style={{
          border: 'none', background: 'none', cursor: 'pointer', padding: 4,
          color: '#A39E94', fontSize: 18, lineHeight: 1,
        }}>✕</button>
      </div>

      {/* 권한 거부 메시지 */}
      {permission === 'denied' && (
        <div style={{
          fontSize: 13, color: '#C4615A', marginBottom: 12,
          padding: '8px 12px', background: '#FFF0EF', borderRadius: 10,
        }}>
          알림 권한이 차단됐습니다. 브라우저 설정에서 허용해주세요.
        </div>
      )}

      {/* 활성화 토글 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, color: '#5A564E' }}>알림 켜기</span>
        <button
          onClick={handleToggle}
          disabled={permission === 'denied'}
          style={{
            width: 48, height: 28, borderRadius: 999,
            border: 'none', cursor: permission === 'denied' ? 'not-allowed' : 'pointer',
            background: settings.enabled ? '#1A1A18' : '#D4D0CA',
            position: 'relative', transition: 'background .2s', padding: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: 3,
            left: settings.enabled ? 23 : 3,
            width: 22, height: 22, borderRadius: '50%',
            background: '#fff',
            transition: 'left .2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            display: 'block',
          }} />
        </button>
      </div>

      {/* 시간 선택 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, color: settings.enabled ? '#5A564E' : '#C0BAB2' }}>알림 시간</span>
        <input
          type="time"
          value={`${pad(settings.hour)}:${pad(settings.minute)}`}
          onChange={handleTime}
          disabled={!settings.enabled}
          style={{
            border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10,
            padding: '6px 10px', fontSize: 14, fontFamily: 'inherit',
            color: settings.enabled ? '#1A1A18' : '#C0BAB2',
            background: settings.enabled ? '#F9F8F6' : '#F4F1EC',
            outline: 'none', cursor: settings.enabled ? 'pointer' : 'default',
          }}
        />
      </div>

      {/* 테스트 버튼 */}
      {settings.enabled && permission === 'granted' && (
        <button onClick={sendTest} style={{
          width: '100%', padding: '10px', borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.1)', background: 'transparent',
          fontFamily: 'inherit', fontSize: 13, color: '#5A564E',
          cursor: 'pointer',
        }}>
          테스트 알림 보내기
        </button>
      )}
    </div>
  );
}

// ─── 할 일 행 ─────────────────────────────────────────────────
function TaskRow({
  t, showCat, onToggle, onDelete, isNew,
}: {
  t: Todo; showCat: boolean; onToggle: () => void;
  onDelete: () => void; isNew: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);

  const onDown = (clientX: number) => { startX.current = clientX; };
  const onMove = (clientX: number) => {
    if (startX.current == null) return;
    setOffset(Math.max(-84, Math.min(0, clientX - startX.current)));
  };
  const onUp = () => {
    if (offset < -54) setOffset(-72); else setOffset(0);
    startX.current = null;
  };

  return (
    <div style={{
      position: 'relative', borderTop: '0.5px solid rgba(0,0,0,0.07)',
      animation: isNew ? 'taskIn .28s ease' : 'none',
    }}>
      <button onClick={onDelete} style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 72,
        border: 'none', background: '#C4615A', color: '#fff',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: offset < -8 ? 1 : 0, transition: 'opacity .15s',
      }}>Delete</button>
      <div
        onMouseDown={e => onDown(e.clientX)}
        onMouseMove={e => { if (e.buttons) onMove(e.clientX); }}
        onMouseUp={onUp} onMouseLeave={() => { if (startX.current != null) onUp(); }}
        onTouchStart={e => onDown(e.touches[0].clientX)}
        onTouchMove={e => onMove(e.touches[0].clientX)}
        onTouchEnd={onUp}
        style={{
          position: 'relative', background: '#F4F1EC',
          transform: `translateX(${offset}px)`,
          transition: startX.current == null ? 'transform .25s cubic-bezier(.3,1,.4,1)' : 'none',
          display: 'flex', alignItems: 'center', gap: 13,
          padding: '13px 20px', minHeight: 36, userSelect: 'none',
        }}
      >
        <Check done={t.done} onToggle={onToggle} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16.5, color: t.done ? '#BBB6AC' : '#28261F',
            textDecoration: t.done ? 'line-through' : 'none',
            textDecorationColor: 'rgba(0,0,0,0.25)', transition: 'color .2s',
          }}>{t.text}</div>
          {showCat && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Dot cat={t.cat} size={6} />
              <span style={{ fontSize: 12.5, color: '#A39E94' }}>{CATS[t.cat].label}</span>
            </div>
          )}
        </div>
        {t.time && (
          <span style={{ fontSize: 13.5, color: '#A39E94', fontVariantNumeric: 'tabular-nums' }}>
            {t.time}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 하단 입력바 ──────────────────────────────────────────────
function AddBar({ cat, setCat, onAdd }: {
  cat: CatKey; setCat: (k: CatKey) => void;
  onAdd: (text: string, cat: CatKey) => void;
}) {
  const [v, setV] = useState('');
  const [open, setOpen] = useState(false);
  const submit = () => { const s = v.trim(); if (!s) return; onAdd(s, cat); setV(''); };
  return (
    <div style={{
      flexShrink: 0, padding: '10px 16px',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)',
      background: 'rgba(244,241,236,0.92)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderTop: '0.5px solid rgba(0,0,0,0.06)',
    }}>
      <div style={{
        maxHeight: open ? 48 : 0, overflow: 'hidden',
        transition: 'max-height .24s ease',
        display: 'flex', gap: 7, paddingBottom: open ? 10 : 0, paddingLeft: 2,
        flexWrap: 'nowrap', overflowX: 'auto',
      }}>
        {CAT_KEYS.map(k => {
          const on = cat === k;
          return (
            <button key={k} onClick={() => setCat(k)} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${on ? CATS[k].color : 'rgba(0,0,0,0.1)'}`,
              background: on ? CATS[k].color + '22' : 'transparent',
              fontFamily: 'inherit', fontSize: 13, color: '#3F3B33', fontWeight: 500,
            }}>
              <Dot cat={k} size={7} />{CATS[k].label}
            </button>
          );
        })}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff', borderRadius: 14,
        padding: '4px 4px 4px 12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        <button onClick={() => setOpen(o => !o)} style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          border: 'none', cursor: 'pointer', background: CATS[cat].color + '26',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Dot cat={cat} size={11} />
        </button>
        <input
          value={v} onChange={e => setV(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="Add a task…"
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent', fontFamily: 'inherit',
            fontSize: 16, color: '#1A1A18', padding: '8px 0',
          }}
        />
        <button onClick={submit} style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          border: 'none', background: '#1A1A18', color: '#fff',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22, lineHeight: '1', paddingBottom: 2,
        }}>+</button>
      </div>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────
export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<CatKey | 'all'>('all');
  const [cat, setCat] = useState<CatKey>('personal');
  const [newIds, setNewIds] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotifSettings>(DEFAULT_NOTIF);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  useEffect(() => {
    const savedTodos = localStorage.getItem('todos-v2');
    if (savedTodos) {
      try { setTodos(JSON.parse(savedTodos)); } catch { /* ignore */ }
    }
    const savedNotif = localStorage.getItem(NOTIF_KEY);
    if (savedNotif) {
      try {
        const s = JSON.parse(savedNotif);
        setNotifSettings(s);
        scheduleNotification(s);
      } catch { /* ignore */ }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('todos-v2', JSON.stringify(todos));
  }, [todos, mounted]);

  const handleNotifChange = useCallback((s: NotifSettings) => {
    setNotifSettings(s);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(s));
    scheduleNotification(s);
  }, []);

  const toggle = (id: string) =>
    setTodos(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const del = (id: string) =>
    setTodos(t => t.filter(x => x.id !== id));
  const add = (text: string, c: CatKey) => {
    const id = generateId();
    setTodos(t => [{ id, text, cat: c, done: false, time: null }, ...t]);
    setNewIds(n => ({ ...n, [id]: true }));
  };

  const shown = filter === 'all' ? todos : todos.filter(t => t.cat === filter);
  const countFor = (k: CatKey | 'all') =>
    (k === 'all' ? todos : todos.filter(t => t.cat === k)).filter(t => !t.done).length;

  const chips = [
    { k: 'all' as const, label: 'All' },
    ...CAT_KEYS.map(k => ({ k, label: CATS[k].label })),
  ];

  if (!mounted) return null;

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: '#F4F1EC',
      fontFamily: "'Helvetica Neue', Helvetica, system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* 제목 + 알림 버튼 */}
        <div style={{ padding: '48px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 33, fontWeight: 700, color: '#1A1A18', letterSpacing: -0.5 }}>
            Tasks
          </h1>
          <button
            onClick={() => setShowNotifPanel(p => !p)}
            aria-label="알림 설정"
            style={{
              width: 38, height: 38, borderRadius: 12, border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: notifSettings.enabled ? '#1A1A18' : 'rgba(0,0,0,0.07)',
              transition: 'background .2s',
            }}
          >
            <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
              <path d="M9 0C9.55 0 10 .45 10 1V2.07C13.39 2.56 16 5.47 16 9V14L18 16V17H0V16L2 14V9C2 5.47 4.61 2.56 8 2.07V1C8 .45 8.45 0 9 0Z"
                fill={notifSettings.enabled ? '#fff' : '#5A564E'} />
              <path d="M7 18C7 19.1 7.9 20 9 20C10.1 20 11 19.1 11 18H7Z"
                fill={notifSettings.enabled ? '#fff' : '#5A564E'} />
            </svg>
          </button>
        </div>

        {/* 알림 설정 패널 */}
        {showNotifPanel && (
          <div style={{ marginTop: 14 }}>
            <NotifPanel
              settings={notifSettings}
              onChange={handleNotifChange}
              onClose={() => setShowNotifPanel(false)}
            />
          </div>
        )}

        {/* 필터 칩 */}
        <div className="chips-scroll" style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          padding: '16px 20px 4px', scrollbarWidth: 'none',
        }}>
          {chips.map(c => {
            const on = filter === c.k;
            return (
              <button key={c.k} onClick={() => setFilter(c.k)} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                border: `1px solid ${on ? '#1A1A18' : 'rgba(0,0,0,0.1)'}`,
                background: on ? '#1A1A18' : 'transparent',
                color: on ? '#fff' : '#5A564E',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
                transition: 'all .2s', whiteSpace: 'nowrap',
              }}>
                {c.k !== 'all' && <Dot cat={c.k} size={7} />}
                {c.label}
                <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{countFor(c.k)}</span>
              </button>
            );
          })}
        </div>

        {/* 할 일 목록 */}
        <div style={{ padding: '12px 0 32px' }}>
          {shown.map(t => (
            <TaskRow
              key={t.id} t={t} showCat={filter === 'all'} isNew={!!newIds[t.id]}
              onToggle={() => toggle(t.id)} onDelete={() => del(t.id)}
            />
          ))}
          {shown.length === 0 && (
            <div style={{ textAlign: 'center', color: '#B5B0A6', padding: '60px 0', fontSize: 15 }}>
              All clear here.
            </div>
          )}
        </div>
      </div>

      <AddBar cat={cat} setCat={setCat} onAdd={add} />
    </div>
  );
}
