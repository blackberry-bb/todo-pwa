'use client';

import { useState, useEffect, useRef } from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

type Filter = 'all' | 'active' | 'completed';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('todos');
    if (saved) {
      try {
        setTodos(JSON.parse(saved));
      } catch {
        setTodos([]);
      }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('todos', JSON.stringify(todos));
    }
  }, [todos, mounted]);

  function addTodo() {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [
      { id: generateId(), text, completed: false, createdAt: Date.now() },
      ...prev,
    ]);
    setInput('');
    inputRef.current?.focus();
  }

  function toggleTodo(id: string) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function clearCompleted() {
    setTodos((prev) => prev.filter((t) => !t.completed));
  }

  const filtered = todos.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <h1 className="text-4xl font-bold text-center text-blue-600 mb-8 tracking-tight">
          Todo
        </h1>

        {/* Input */}
        <div className="flex gap-2 mb-6">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="할 일을 입력하세요..."
            className="flex-1 px-4 py-3 rounded-xl border border-blue-200 bg-white shadow-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-base"
          />
          <button
            onClick={addTodo}
            disabled={!input.trim()}
            className="px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-xl font-semibold shadow-sm transition-colors text-base"
          >
            추가
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex bg-white rounded-xl shadow-sm border border-blue-100 mb-4 p-1">
          {(['all', 'active', 'completed'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-blue-500'
              }`}
            >
              {f === 'all' ? '전체' : f === 'active' ? '진행 중' : '완료'}
            </button>
          ))}
        </div>

        {/* Todo list */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              {filter === 'completed'
                ? '완료된 항목이 없습니다'
                : filter === 'active'
                ? '진행 중인 항목이 없습니다'
                : '할 일을 추가해보세요!'}
            </div>
          ) : (
            <ul>
              {filtered.map((todo, index) => (
                <li
                  key={todo.id}
                  className={`flex items-center gap-3 px-4 py-4 ${
                    index < filtered.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      todo.completed
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {todo.completed && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`flex-1 text-base leading-snug ${
                      todo.completed ? 'line-through text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {todo.text}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer stats */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between mt-4 px-1 text-sm text-gray-500">
            <span>{activeCount}개 남음</span>
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-red-400 hover:text-red-500 transition-colors"
              >
                완료 항목 삭제 ({completedCount})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
