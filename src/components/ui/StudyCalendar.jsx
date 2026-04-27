import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Flame } from 'lucide-react';
import { Card } from './Card';

export function StudyCalendar({ studiedDates = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const numDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Normalize studied dates to YYYY-MM-DD
  const normalizedStudied = studiedDates.map(d => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });

  const isStudied = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return normalizedStudied.includes(dateStr);
  };

  const isToday = (day) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  // Simple Streak Calculation (from today backwards)
  const calculateStreak = () => {
    let streak = 0;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    
    const sortedDates = [...new Set(normalizedStudied)].sort((a,b) => new Date(b) - new Date(a));
    if (sortedDates.length === 0) return 0;

    let lastStudyDate = new Date(sortedDates[0]);
    lastStudyDate.setHours(12, 0, 0, 0);
    
    const oneDay = 24 * 60 * 60 * 1000;
    const diffToToday = Math.round((today.getTime() - lastStudyDate.getTime()) / oneDay);

    // If the most recent study was more than 1 day ago, streak is broken
    if (diffToToday > 1) return 0;

    streak = 1;
    let currentRefDate = lastStudyDate;

    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i]);
        prevDate.setHours(12, 0, 0, 0);
        
        const diff = Math.round((currentRefDate.getTime() - prevDate.getTime()) / oneDay);
        if (diff === 1) {
            streak++;
            currentRefDate = prevDate;
        } else if (diff === 0) {
            continue; // Should not happen with new Set, but safe
        } else {
            break;
        }
    }
    return streak;
  };

  const streak = calculateStreak();

  return (
    <Card className="bg-zinc-900 border-zinc-800/50 p-6 shadow-2xl rounded-3xl overflow-hidden relative group h-full">
      {/* Background Decorative Element */}
      <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity">
        <CalendarIcon size={150} className="text-indigo-500" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
              <CalendarIcon size={16} />
            </div>
            <div>
              <h3 className="text-zinc-100 font-bold text-sm tracking-tight">Consistência</h3>
              <p className="text-zinc-500 text-[8px] uppercase font-black tracking-widest">{months[month]} {year}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-full">
                <Flame size={12} className="text-orange-500" />
                <span className="text-orange-500 text-[9px] font-black uppercase tracking-wider">{streak}d</span>
              </div>
            )}
            
            <div className="flex items-center gap-0.5">
              <button onClick={prevMonth} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-100 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={nextMonth} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-100 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-zinc-600 text-[8px] font-black uppercase tracking-widest py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square"></div>
          ))}
          
          {Array.from({ length: numDays }).map((_, i) => {
            const day = i + 1;
            const studied = isStudied(day);
            const today = isToday(day);

            return (
              <div
                key={day}
                className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all relative
                  ${studied 
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                    : 'bg-zinc-950/50 text-zinc-600 border border-zinc-800/50'}
                  ${today ? 'ring-2 ring-indigo-500' : ''}
                  hover:brightness-125 cursor-default
                `}
              >
                {day}
                {studied && (
                  <div className="absolute bottom-0.5 w-0.5 h-0.5 rounded-full bg-indigo-400"></div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-2 pt-2 border-t border-zinc-800/50 flex justify-between items-center">
            <div className="flex gap-2">
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded bg-indigo-600/30 border border-indigo-500/50"></div>
                    <span className="text-zinc-500 text-[7px] font-bold uppercase tracking-wider">Estudado</span>
                </div>
            </div>
            <p className="text-zinc-600 text-[7px] italic">Consistência &gt; Talento</p>
        </div>
      </div>
    </Card>
  );
}
