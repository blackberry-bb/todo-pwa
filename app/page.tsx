'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── 타입 ─────────────────────────────────────────────────────
interface Category {
  id: string;
  label: string;
  color: string;
}

interface Todo {
  id: string;
  text: string;
  catId: string;
  done: boolean;
  time: string | null;
}

interface NotifSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

// ─── 상수 ─────────────────────────────────────────────────────
const DEFAULT_CATS: Category[] = [
  { id: 'personal', label: 'Personal', color: '#C28E6D' },
  { id: 'work',     label: 'Work',     color: '#7E93B8' },
  { id: 'health',   label: 'Health',   color: '#8FAE8B' },
  { id: 'home',     label: 'Home',     color: '#B091A6' },
  { id: 'shopping', label: 'Shopping', color: '#C2A86A' },
];

const PRESET_COLORS = [
  '#C28E6D', '#7E93B8', '#8FAE8B', '#B091A6', '#C2A86A',
  '#E8836E', '#7BBCB0', '#A38FD4', '#D48FAA', '#6CA8D4',
  '#98C47A', '#D4C078', '#8B8B8B', '#E8C46E', '#7BAAD4',
];

const CATS_KEY  = 'categories';
const TODOS_KEY = 'todos-v2';
const NOTIF_KEY = 'notif-settings';
const DEFAULT_NOTIF: NotifSettings = { enabled: false, hour: 9, minute: 0 };

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function pad(n: number) { return String(n).padStart(2, '0'); }

// ─── 알림 스케줄러 ────────────────────────────────────────────
let notifTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleNotification(settings: NotifSettings) {
  if (notifTimer) clearTimeout(notifTimer);
  if (!settings.enabled) return;
  const now = new Date();
  const target = new Date();
  target.setHours(settings.hour, settings.minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  notifTimer = setTimeout(() => {
    try {
      const todos: Todo[] = JSON.parse(localStorage.getItem(TODOS_KEY) || '[]');
      const active = todos.filter(t => !t.done);
      if (active.length > 0 && Notification.permission === 'granted') {
        new Notification('Tasks 리마인더 ✅', {
          body: `완료하지 못한 할 일이 ${active.length}개 있어요.`,
          icon: '/icons/icon.svg', badge: '/icons/icon.svg', tag: 'todo-reminder',
        });
      }
    } catch { /* ignore */ }
    const saved = localStorage.getItem(NOTIF_KEY);
    if (saved) { try { scheduleNotification(JSON.parse(saved)); } catch { /* ignore */ } }
  }, target.getTime() - now.getTime());
}

// ─── 공통 컴포넌트 ────────────────────────────────────────────
function Dot({ color, size = 7 }: { color: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />;
}

function Check({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
      border: `1.85px solid ${done ? '#1A1A18' : 'rgba(0,0,0,0.22)'}`,
      background: done ? '#1A1A18' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 0, cursor: 'pointer', transition: 'all .22s cubic-bezier(.4,1.3,.5,1)',
    }}>
      <svg width={13} height={13} viewBox="0 0 14 14" style={{
        opacity: done ? 1 : 0, transform: done ? 'scale(1)' : 'scale(.4)',
        transition: 'all .22s cubic-bezier(.4,1.3,.5,1)',
      }}>
        <path d="M2 7.5l3 3 7-7.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ─── 카테고리 관리 패널 ───────────────────────────────────────
function CatPanel({
  cats, onChange, onClose,
}: {
  cats: Category[];
  onChange: (cats: Category[]) => void;
  onClose: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [addMode, setAddMode] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditLabel(cat.label);
    setEditColor(cat.color);
    setAddMode(false);
  }

  function saveEdit() {
    if (!editLabel.trim()) return;
    onChange(cats.map(c => c.id === editingId ? { ...c, label: editLabel.trim(), color: editColor } : c));
    setEditingId(null);
  }

  function deleteCat(id: string) {
    if (cats.length <= 1) return;
    onChange(cats.filter(c => c.id !== id));
  }

  function addCat() {
    if (!newLabel.trim()) return;
    onChange([...cats, { id: generateId(), label: newLabel.trim(), color: newColor }]);
    setNewLabel('');
    setNewColor(PRESET_COLORS[0]);
    setAddMode(false);
  }

  const ColorPicker = ({ value, onPick }: { value: string; onPick: (c: string) => void }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0' }}>
      {PRESET_COLORS.map(c => (
        <button key={c} onClick={() => onPick(c)} style={{
          width: 28, height: 28, borderRadius: '50%', background: c,
          border: value === c ? '3px solid #1A1A18' : '2px solid transparent',
          cursor: 'pointer', padding: 0,
          boxShadow: value === c ? '0 0 0 1px #fff inset' : 'none',
          transition: 'border .15s',
        }} />
      ))}
    </div>
  );

  return (
    <div style={{
      margin: '0 20px 16px', background: '#fff', borderRadius: 18,
      padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '0.5px solid rgba(0,0,0,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A18' }}>카테고리 편집</span>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#A39E94', fontSize: 18, lineHeight: 1 }}>✕</button>
      </div>

      {/* 카테고리 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {cats.map(cat => (
          <div key={cat.id}>
            {editingId === cat.id ? (
              /* 수정 모드 */
              <div style={{ background: '#F9F8F6', borderRadius: 12, padding: '12px 14px', marginBottom: 4 }}>
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                  style={{
                    width: '100%', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
                    padding: '7px 10px', fontSize: 14, fontFamily: 'inherit',
                    color: '#1A1A18', background: '#fff', outline: 'none',
                  }}
                />
                <ColorPicker value={editColor} onPick={setEditColor} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveEdit} style={{
                    flex: 1, padding: '8px', borderRadius: 10, border: 'none',
                    background: '#1A1A18', color: '#fff', fontFamily: 'inherit',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>저장</button>
                  <button onClick={() => setEditingId(null)} style={{
                    flex: 1, padding: '8px', borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.1)', background: 'transparent',
                    fontFamily: 'inherit', fontSize: 13, color: '#5A564E', cursor: 'pointer',
                  }}>취소</button>
                </div>
              </div>
            ) : (
              /* 일반 모드 */
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 4px', borderBottom: '0.5px solid rgba(0,0,0,0.06)',
              }}>
                <Dot color={cat.color} size={10} />
                <span style={{ flex: 1, fontSize: 14, color: '#1A1A18' }}>{cat.label}</span>
                <button onClick={() => startEdit(cat)} style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  padding: '4px 8px', borderRadius: 8, color: '#A39E94', fontSize: 13,
                }}>편집</button>
                <button onClick={() => deleteCat(cat.id)} disabled={cats.length <= 1} style={{
                  border: 'none', background: 'none', cursor: cats.length <= 1 ? 'not-allowed' : 'pointer',
                  padding: '4px 8px', borderRadius: 8,
                  color: cats.length <= 1 ? '#D4D0CA' : '#C4615A', fontSize: 13,
                }}>삭제</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 추가 모드 */}
      {addMode ? (
        <div style={{ background: '#F9F8F6', borderRadius: 12, padding: '12px 14px', marginTop: 10 }}>
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCat(); if (e.key === 'Escape') setAddMode(false); }}
            autoFocus
            placeholder="카테고리 이름"
            style={{
              width: '100%', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
              padding: '7px 10px', fontSize: 14, fontFamily: 'inherit',
              color: '#1A1A18', background: '#fff', outline: 'none',
            }}
          />
          <ColorPicker value={newColor} onPick={setNewColor} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addCat} style={{
              flex: 1, padding: '8px', borderRadius: 10, border: 'none',
              background: '#1A1A18', color: '#fff', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>추가</button>
            <button onClick={() => setAddMode(false)} style={{
              flex: 1, padding: '8px', borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.1)', background: 'transparent',
              fontFamily: 'inherit', fontSize: 13, color: '#5A564E', cursor: 'pointer',
            }}>취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAddMode(true); setEditingId(null); }} style={{
          width: '100%', marginTop: 10, padding: '10px', borderRadius: 12,
          border: '1.5px dashed rgba(0,0,0,0.15)', background: 'transparent',
          fontFamily: 'inherit', fontSize: 13, color: '#5A564E', cursor: 'pointer',
        }}>
          + 카테고리 추가
        </button>
      )}
    </div>
  );
}

// ─── 알림 설정 패널 ───────────────────────────────────────────
function NotifPanel({ settings, onChange, onClose }: {
  settings: NotifSettings; onChange: (s: NotifSettings) => void; onClose: () => void;
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
  function sendTest() {
    if (permission !== 'granted') return;
    const todos: Todo[] = JSON.parse(localStorage.getItem(TODOS_KEY) || '[]');
    const active = todos.filter(t => !t.done);
    new Notification('Tasks 리마인더 ✅', {
      body: active.length > 0 ? `완료하지 못한 할 일이 ${active.length}개 있어요.` : '오늘 할 일을 모두 완료했어요! 🎉',
      icon: '/icons/icon.svg', tag: 'todo-reminder',
    });
  }
  return (
    <div style={{ margin: '0 20px 16px', background: '#fff', borderRadius: 18, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A18' }}>매일 리마인더</span>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#A39E94', fontSize: 18, lineHeight: 1 }}>✕</button>
      </div>
      {permission === 'denied' && (
        <div style={{ fontSize: 13, color: '#C4615A', marginBottom: 12, padding: '8px 12px', background: '#FFF0EF', borderRadius: 10 }}>
          알림 권한이 차단됐습니다. 브라우저 설정에서 허용해주세요.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, color: '#5A564E' }}>알림 켜기</span>
        <button onClick={handleToggle} disabled={permission === 'denied'} style={{
          width: 48, height: 28, borderRadius: 999, border: 'none',
          cursor: permission === 'denied' ? 'not-allowed' : 'pointer',
          background: settings.enabled ? '#1A1A18' : '#D4D0CA',
          position: 'relative', transition: 'background .2s', padding: 0,
        }}>
          <span style={{ position: 'absolute', top: 3, left: settings.enabled ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', display: 'block' }} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: settings.enabled && permission === 'granted' ? 14 : 0 }}>
        <span style={{ fontSize: 14, color: settings.enabled ? '#5A564E' : '#C0BAB2' }}>알림 시간</span>
        {/* 커스텀 타임피커 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: settings.enabled ? 1 : 0.4, pointerEvents: settings.enabled ? 'auto' : 'none' }}>
          <select
            value={settings.hour}
            onChange={e => onChange({ ...settings, hour: Number(e.target.value) })}
            style={{ appearance: 'none', WebkitAppearance: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '7px 10px', fontSize: 15, fontFamily: 'inherit', fontWeight: 600, color: '#1A1A18', background: '#F9F8F6', outline: 'none', cursor: 'pointer', textAlign: 'center', width: 56 }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{pad(i)}</option>
            ))}
          </select>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A18' }}>:</span>
          <select
            value={settings.minute}
            onChange={e => onChange({ ...settings, minute: Number(e.target.value) })}
            style={{ appearance: 'none', WebkitAppearance: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '7px 10px', fontSize: 15, fontFamily: 'inherit', fontWeight: 600, color: '#1A1A18', background: '#F9F8F6', outline: 'none', cursor: 'pointer', textAlign: 'center', width: 56 }}
          >
            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
              <option key={m} value={m}>{pad(m)}</option>
            ))}
          </select>
        </div>
      </div>
      {settings.enabled && permission === 'granted' && (
        <button onClick={sendTest} style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontFamily: 'inherit', fontSize: 13, color: '#5A564E', cursor: 'pointer' }}>
          테스트 알림 보내기
        </button>
      )}
    </div>
  );
}

// ─── 할 일 행 ─────────────────────────────────────────────────
function TaskRow({ t, cats, showCat, onToggle, onDelete, isNew }: {
  t: Todo; cats: Category[]; showCat: boolean;
  onToggle: () => void; onDelete: () => void; isNew: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const cat = cats.find(c => c.id === t.catId) ?? cats[0];

  const onDown = (x: number) => { startX.current = x; };
  const onMove = (x: number) => {
    if (startX.current == null) return;
    setOffset(Math.max(-84, Math.min(0, x - startX.current)));
  };
  const onUp = () => { setOffset(offset < -54 ? -72 : 0); startX.current = null; };

  return (
    <div style={{ position: 'relative', borderTop: '0.5px solid rgba(0,0,0,0.07)', animation: isNew ? 'taskIn .28s ease' : 'none' }}>
      <button onClick={onDelete} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 72, border: 'none', background: '#C4615A', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: offset < -8 ? 1 : 0, transition: 'opacity .15s' }}>Delete</button>
      <div
        onMouseDown={e => onDown(e.clientX)} onMouseMove={e => { if (e.buttons) onMove(e.clientX); }}
        onMouseUp={onUp} onMouseLeave={() => { if (startX.current != null) onUp(); }}
        onTouchStart={e => onDown(e.touches[0].clientX)} onTouchMove={e => onMove(e.touches[0].clientX)} onTouchEnd={onUp}
        style={{ position: 'relative', background: '#F4F1EC', transform: `translateX(${offset}px)`, transition: startX.current == null ? 'transform .25s cubic-bezier(.3,1,.4,1)' : 'none', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 20px', minHeight: 36, userSelect: 'none' }}
      >
        <Check done={t.done} onToggle={onToggle} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16.5, color: t.done ? '#BBB6AC' : '#28261F', textDecoration: t.done ? 'line-through' : 'none', textDecorationColor: 'rgba(0,0,0,0.25)', transition: 'color .2s' }}>{t.text}</div>
          {showCat && cat && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Dot color={cat.color} size={6} />
              <span style={{ fontSize: 12.5, color: '#A39E94' }}>{cat.label}</span>
            </div>
          )}
        </div>
        {t.time && <span style={{ fontSize: 13.5, color: '#A39E94', fontVariantNumeric: 'tabular-nums' }}>{t.time}</span>}
      </div>
    </div>
  );
}

// ─── 하단 입력바 ──────────────────────────────────────────────
function AddBar({ cats, catId, setCatId, onAdd }: {
  cats: Category[]; catId: string;
  setCatId: (id: string) => void; onAdd: (text: string, catId: string) => void;
}) {
  const [v, setV] = useState('');
  const [open, setOpen] = useState(false);
  const cat = cats.find(c => c.id === catId) ?? cats[0];
  const submit = () => { const s = v.trim(); if (!s) return; onAdd(s, catId); setV(''); };
  return (
    <div style={{ flexShrink: 0, padding: '10px 16px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)', background: 'rgba(244,241,236,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
      <div style={{ maxHeight: open ? 52 : 0, overflow: 'hidden', transition: 'max-height .24s ease', display: 'flex', gap: 7, paddingBottom: open ? 10 : 0, paddingLeft: 2, flexWrap: 'nowrap', overflowX: 'auto' }}>
        {cats.map(c => (
          <button key={c.id} onClick={() => setCatId(c.id)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${catId === c.id ? c.color : 'rgba(0,0,0,0.1)'}`, background: catId === c.id ? c.color + '22' : 'transparent', fontFamily: 'inherit', fontSize: 13, color: '#3F3B33', fontWeight: 500 }}>
            <Dot color={c.color} size={7} />{c.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 14, padding: '4px 4px 4px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <button onClick={() => setOpen(o => !o)} style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, border: 'none', cursor: 'pointer', background: (cat?.color ?? '#ccc') + '26', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Dot color={cat?.color ?? '#ccc'} size={11} />
        </button>
        <input value={v} onChange={e => setV(e.target.value)} onFocus={() => setOpen(true)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="Add a task…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 16, color: '#1A1A18', padding: '8px 0' }} />
        <button onClick={submit} style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, border: 'none', background: '#1A1A18', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, lineHeight: '1', paddingBottom: 2 }}>+</button>
      </div>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────
export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [cats, setCats] = useState<Category[]>(DEFAULT_CATS);
  const [filter, setFilter] = useState<string>('all');
  const [catId, setCatId] = useState<string>(DEFAULT_CATS[0].id);
  const [newIds, setNewIds] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotifSettings>(DEFAULT_NOTIF);
  const [panel, setPanel] = useState<'none' | 'notif' | 'cats'>('none');

  useEffect(() => {
    const savedTodos = localStorage.getItem(TODOS_KEY);
    if (savedTodos) { try { setTodos(JSON.parse(savedTodos)); } catch { /* ignore */ } }

    const savedCats = localStorage.getItem(CATS_KEY);
    if (savedCats) { try { setCats(JSON.parse(savedCats)); } catch { /* ignore */ } }

    const savedNotif = localStorage.getItem(NOTIF_KEY);
    if (savedNotif) { try { const s = JSON.parse(savedNotif); setNotifSettings(s); scheduleNotification(s); } catch { /* ignore */ } }

    setMounted(true);
  }, []);

  useEffect(() => { if (mounted) localStorage.setItem(TODOS_KEY, JSON.stringify(todos)); }, [todos, mounted]);

  const handleCatsChange = useCallback((next: Category[]) => {
    setCats(next);
    localStorage.setItem(CATS_KEY, JSON.stringify(next));
    // 삭제된 카테고리의 할 일 → 첫 번째 카테고리로 이동
    const ids = new Set(next.map(c => c.id));
    setTodos(prev => prev.map(t => ids.has(t.catId) ? t : { ...t, catId: next[0]?.id ?? '' }));
    if (!ids.has(catId)) setCatId(next[0]?.id ?? '');
    if (!ids.has(filter) && filter !== 'all') setFilter('all');
  }, [catId, filter]);

  const handleNotifChange = useCallback((s: NotifSettings) => {
    setNotifSettings(s);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(s));
    scheduleNotification(s);
  }, []);

  const toggle = (id: string) => setTodos(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const del = (id: string) => setTodos(t => t.filter(x => x.id !== id));
  const add = (text: string, cid: string) => {
    const id = generateId();
    setTodos(t => [{ id, text, catId: cid, done: false, time: null }, ...t]);
    setNewIds(n => ({ ...n, [id]: true }));
  };

  const shown = filter === 'all' ? todos : todos.filter(t => t.catId === filter);
  const countFor = (k: string) => (k === 'all' ? todos : todos.filter(t => t.catId === k)).filter(t => !t.done).length;

  if (!mounted) return null;

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#F4F1EC', fontFamily: "'Helvetica Neue', Helvetica, system-ui, sans-serif", WebkitFontSmoothing: 'antialiased', paddingTop: 'env(safe-area-inset-top)' }}>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* 제목 + 버튼들 */}
        <div style={{ padding: '48px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: 33, fontWeight: 700, color: '#1A1A18', letterSpacing: -0.5 }}>Tasks</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* 카테고리 편집 버튼 */}
            <button onClick={() => setPanel(p => p === 'cats' ? 'none' : 'cats')} aria-label="카테고리 편집" style={{ width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: panel === 'cats' ? '#1A1A18' : 'rgba(0,0,0,0.07)', transition: 'background .2s' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="3" cy="3" r="2" fill={panel === 'cats' ? '#fff' : '#5A564E'}/>
                <circle cx="3" cy="9" r="2" fill={panel === 'cats' ? '#fff' : '#5A564E'}/>
                <circle cx="3" cy="15" r="2" fill={panel === 'cats' ? '#fff' : '#5A564E'}/>
                <rect x="7" y="2" width="11" height="2" rx="1" fill={panel === 'cats' ? '#fff' : '#5A564E'}/>
                <rect x="7" y="8" width="9" height="2" rx="1" fill={panel === 'cats' ? '#fff' : '#5A564E'}/>
                <rect x="7" y="14" width="10" height="2" rx="1" fill={panel === 'cats' ? '#fff' : '#5A564E'}/>
              </svg>
            </button>
            {/* 알림 버튼 */}
            <button onClick={() => setPanel(p => p === 'notif' ? 'none' : 'notif')} aria-label="알림 설정" style={{ width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: notifSettings.enabled ? '#1A1A18' : panel === 'notif' ? '#1A1A18' : 'rgba(0,0,0,0.07)', transition: 'background .2s' }}>
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
                <path d="M9 0C9.55 0 10 .45 10 1V2.07C13.39 2.56 16 5.47 16 9V14L18 16V17H0V16L2 14V9C2 5.47 4.61 2.56 8 2.07V1C8 .45 8.45 0 9 0Z" fill={(notifSettings.enabled || panel === 'notif') ? '#fff' : '#5A564E'}/>
                <path d="M7 18C7 19.1 7.9 20 9 20C10.1 20 11 19.1 11 18H7Z" fill={(notifSettings.enabled || panel === 'notif') ? '#fff' : '#5A564E'}/>
              </svg>
            </button>
          </div>
        </div>

        {/* 패널 */}
        {panel === 'cats' && (
          <div style={{ marginTop: 14 }}>
            <CatPanel cats={cats} onChange={handleCatsChange} onClose={() => setPanel('none')} />
          </div>
        )}
        {panel === 'notif' && (
          <div style={{ marginTop: 14 }}>
            <NotifPanel settings={notifSettings} onChange={handleNotifChange} onClose={() => setPanel('none')} />
          </div>
        )}

        {/* 필터 칩 */}
        <div className="chips-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '16px 20px 4px', scrollbarWidth: 'none' }}>
          {[{ id: 'all', label: 'All', color: '' }, ...cats].map(c => {
            const on = filter === c.id;
            return (
              <button key={c.id} onClick={() => setFilter(c.id)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? '#1A1A18' : 'rgba(0,0,0,0.1)'}`, background: on ? '#1A1A18' : 'transparent', color: on ? '#fff' : '#5A564E', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, transition: 'all .2s', whiteSpace: 'nowrap' }}>
                {c.color && <Dot color={c.color} size={7} />}
                {c.label}
                <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{countFor(c.id)}</span>
              </button>
            );
          })}
        </div>

        {/* 할 일 목록 */}
        <div style={{ padding: '12px 0 32px' }}>
          {shown.map(t => (
            <TaskRow key={t.id} t={t} cats={cats} showCat={filter === 'all'} isNew={!!newIds[t.id]} onToggle={() => toggle(t.id)} onDelete={() => del(t.id)} />
          ))}
          {shown.length === 0 && (
            <div style={{ textAlign: 'center', color: '#B5B0A6', padding: '60px 0', fontSize: 15 }}>All clear here.</div>
          )}
        </div>
      </div>

      <AddBar cats={cats} catId={catId} setCatId={setCatId} onAdd={add} />
    </div>
  );
}
