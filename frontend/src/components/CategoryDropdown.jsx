import React, { useState, useRef, useEffect } from 'react';
import {
  BadgeHelp,
  BookOpen,
  ChevronDown,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  Home,
  Laptop,
  Music4,
  NotebookPen,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Wrench,
  Backpack,
} from 'lucide-react';
import logo from '../assets/logo.svg';

// Horizontal, icon-style category dropdown matching navbar look
export default function CategoryDropdown({ value, onChange, options = [], inline = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const scrollRef = useRef(null);

  const handleHoverScroll = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    el.scrollLeft = ratio * maxScroll;
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const shortIcon = (label) => {
    // simple icon: first letter or two
    return label.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  };

  const getCategoryIcon = (label) => {
    const key = String(label).toLowerCase();

    if (key === 'all') return Sparkles;
    if (key.includes('book')) return BookOpen;
    if (key.includes('gadget') || key.includes('mobile')) return Smartphone;
    if (key.includes('note')) return NotebookPen;
    if (key.includes('course')) return GraduationCap;
    if (key.includes('music')) return Music4;
    if (key.includes('electronic')) return Laptop;
    if (key.includes('apparel') || key.includes('fashion')) return Shirt;
    if (key.includes('sport')) return Dumbbell;
    if (key.includes('furniture')) return Sofa;
    if (key.includes('dorm') || key.includes('bag')) return Backpack;
    if (key.includes('home')) return Home;
    if (key.includes('service')) return Wrench;

    return BadgeHelp;
  };

  // Inline bar mode: always visible categories nav (horizontal scroll)
  if (inline) {
    return (
      <div className="mx-auto w-fit max-w-full bg-gray-950/95 border border-gray-800 rounded-xl px-3 py-2.5">
        <div className="flex items-center justify-center gap-2.5">
          <div
            ref={scrollRef}
            onMouseMove={handleHoverScroll}
            className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1 scroll-smooth"
          >
            {options.map((opt) => {
              const active = opt === value;
              const Icon = getCategoryIcon(opt);
              return (
                <button
                  key={opt}
                  onClick={() => onChange(opt)}
                  className={`group relative flex min-w-[84px] flex-shrink-0 flex-col items-center justify-center rounded-lg px-3 py-2 text-center transition-all duration-200 whitespace-nowrap ${active ? 'bg-yellow-400 text-gray-900 font-semibold shadow-md' : 'bg-gray-900/20 text-gray-200 hover:-translate-y-0.5 hover:bg-gray-800/60 hover:text-white'}`}
                >
                  <span className="mb-1.5 flex h-8 w-8 items-center justify-center">
                    <Icon size={20} strokeWidth={2.1} className={`transition-transform duration-200 ${active ? 'text-gray-900' : 'text-white group-hover:-translate-y-0.5 group-hover:text-yellow-300'}`} />
                  </span>
                  <span className="text-xs leading-tight">{opt}</span>
                  <span className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-yellow-400 transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-gray-950/90 border border-gray-700 rounded-lg text-white hover:bg-gray-900 transition"
      >
        <span className="truncate">{value}</span>
        <ChevronDown size={18} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-40 overflow-hidden">
                  <div className="flex gap-2 px-3 py-2 overflow-x-auto">
            {options.map((opt) => {
              const active = opt === value;
              return (
                <button
                  key={opt}
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`flex flex-col items-center gap-1 min-w-[88px] px-3 py-2 rounded-md transform transition ${active ? 'bg-blue-600 text-white shadow-md' : 'text-white/90 hover:bg-gray-800'}`}
                >
                           <img src={logo} alt={opt} className={`w-10 h-10 rounded-full object-cover ${active ? 'ring-2 ring-white' : 'opacity-90'}`} />
                          <span className="text-xs">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
