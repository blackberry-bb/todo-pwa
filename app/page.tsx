'use client';

import { useState, useRef, useEffect } from 'react';

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

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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
      <svg
        width={13} height={13} viewBox="0 0 14 14"
        style={{
          opacity: done ? 1 : 0,
          transform: done ? 'scale(1)' : 'scale(.4)',
          transition: 'all .22s cubic-bezier(.4,1.3,.5,1)',
        }}
      >
        <path d="M2 7.5l3 3 7-7.5" fill="none" stroke="#fff"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function TaskRow({
  t, showCat, onToggle, onDelete, isNew,
}: {
  t: Todo; showCat: boolean; onToggle: () => void;
  onDelete: () => void; isNew: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const onDown = (clientX: number) => {
    startX.current = clientX;
    isDragging.current = false;
  };
  const onMove = (clientX: number) => {
    if (startX.current == null) return;
    const dx = clientX - startX.current;
    if (Math.abs(dx) > 5) isDragging.current = true;
    setOffset(Math.max(-84, Math.min(0, dx)));
  };
  const onUp = () => {
    if (offset < -54) setOffset(-72);
    else setOffset(0);
    startX.current = null;
  };

  return (
    <div style={{
      position: 'relative',
      borderTop: '0.5px solid rgba(0,0,0,0.07)',
      animation: isNew ? 'taskIn .28s ease' : 'none',
    }}>
      {/* 삭제 버튼 */}
      <button
        onClick={onDelete}
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 72,
          border: 'none', background: '#C4615A', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: offset < -8 ? 1 : 0, transition: 'opacity .15s',
        }}
      >
        Delete
      </button>

      {/* 할 일 행 */}
      <div
        onMouseDown={(e) => onDown(e.clientX)}
        onMouseMove={(e) => { if (e.buttons) onMove(e.clientX); }}
        onMouseUp={onUp}
        onMouseLeave={() => { if (startX.current != null) onUp(); }}
        onTouchStart={(e) => onDown(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onUp}
        style={{
          position: 'relative', background: '#F4F1EC',
          transform: `translateX(${offset}px)`,
          transition: startX.current == null ? 'transform .25s cubic-bezier(.3,1,.4,1)' : 'none',
          display: 'flex', alignItems: 'center', gap: 13,
          padding: '13px 20px', minHeight: 36,
          userSelect: 'none', cursor: 'default',
        }}
      >
        <Check done={t.done} onToggle={onToggle} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16.5,
            color: t.done ? '#BBB6AC' : '#28261F',
            textDecoration: t.done ? 'line-through' : 'none',
            textDecorationColor: 'rgba(0,0,0,0.25)',
            transition: 'color .2s',
          }}>
            {t.text}
          </div>
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

function AddBar({ cat, setCat, onAdd }: {
  cat: CatKey; setCat: (k: CatKey) => void;
  onAdd: (text: string, cat: CatKey) => void;
}) {
  const [v, setV] = useState('');
  const [open, setOpen] = useState(false);

  const submit = () => {
    const s = v.trim();
    if (!s) return;
    onAdd(s, cat);
    setV('');
  };

  return (
    <div style={{
      flexShrink: 0,
      padding: '10px 16px',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)',
      background: 'rgba(244,241,236,0.92)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderTop: '0.5px solid rgba(0,0,0,0.06)',
    }}>
      {/* 카테고리 선택 */}
      <div style={{
        maxHeight: open ? 48 : 0, overflow: 'hidden',
        transition: 'max-height .24s ease',
        display: 'flex', gap: 7,
        paddingBottom: open ? 10 : 0, paddingLeft: 2,
        flexWrap: 'nowrap', overflowX: 'auto',
      }}>
        {CAT_KEYS.map(k => {
          const on = cat === k;
          return (
            <button
              key={k}
              onClick={() => setCat(k)}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
                border: `1px solid ${on ? CATS[k].color : 'rgba(0,0,0,0.1)'}`,
                background: on ? CATS[k].color + '22' : 'transparent',
                fontFamily: 'inherit', fontSize: 13,
                color: '#3F3B33', fontWeight: 500,
              }}
            >
              <Dot cat={k} size={7} />
              {CATS[k].label}
            </button>
          );
        })}
      </div>

      {/* 입력 필드 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff', borderRadius: 14,
        padding: '4px 4px 4px 12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="카테고리 선택"
          style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            border: 'none', cursor: 'pointer',
            background: CATS[cat].color + '26',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Dot cat={cat} size={11} />
        </button>
        <input
          value={v}
          onChange={e => setV(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="Add a task…"
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent', fontFamily: 'inherit',
            fontSize: 16, color: '#1A1A18', padding: '8px 0',
          }}
        />
        <button
          onClick={submit}
          aria-label="추가"
          style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            border: 'none', background: '#1A1A18', color: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22, lineHeight: '1',
            paddingBottom: 2,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<CatKey | 'all'>('all');
  const [cat, setCat] = useState<CatKey>('personal');
  const [newIds, setNewIds] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('todos-v2');
    if (saved) {
      try { setTodos(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('todos-v2', JSON.stringify(todos));
  }, [todos, mounted]);

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
      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {/* 제목 */}
        <div style={{ padding: '48px 20px 0' }}>
          <h1 style={{
            margin: 0, fontSize: 33, fontWeight: 700,
            color: '#1A1A18', letterSpacing: -0.5,
          }}>
            Tasks
          </h1>
        </div>

        {/* 필터 칩 */}
        <div
          className="chips-scroll"
          style={{
            display: 'flex', gap: 8, overflowX: 'auto',
            padding: '16px 20px 4px',
            scrollbarWidth: 'none',
          }}
        >
          {chips.map(c => {
            const on = filter === c.k;
            return (
              <button
                key={c.k}
                onClick={() => setFilter(c.k)}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                  border: `1px solid ${on ? '#1A1A18' : 'rgba(0,0,0,0.1)'}`,
                  background: on ? '#1A1A18' : 'transparent',
                  color: on ? '#fff' : '#5A564E',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
                  transition: 'all .2s', whiteSpace: 'nowrap',
                }}
              >
                {c.k !== 'all' && <Dot cat={c.k} size={7} />}
                {c.label}
                <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>
                  {countFor(c.k)}
                </span>
              </button>
            );
          })}
        </div>

        {/* 할 일 목록 */}
        <div style={{ padding: '12px 0 32px' }}>
          {shown.map(t => (
            <TaskRow
              key={t.id}
              t={t}
              showCat={filter === 'all'}
              isNew={!!newIds[t.id]}
              onToggle={() => toggle(t.id)}
              onDelete={() => del(t.id)}
            />
          ))}
          {shown.length === 0 && (
            <div style={{
              textAlign: 'center', color: '#B5B0A6',
              padding: '60px 0', fontSize: 15,
            }}>
              All clear here.
            </div>
          )}
        </div>
      </div>

      {/* 하단 입력바 */}
      <AddBar cat={cat} setCat={setCat} onAdd={add} />
    </div>
  );
}
