import React, { createContext, useContext, useState, useMemo } from 'react';

const DateContext = createContext(null);

function todayStr() { return new Date().toISOString().split('T')[0]; }

export function SelectedDateProvider({ children }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    try {
      const u = new URLSearchParams(window.location.search).get('date');
      if (u) return u;
    } catch { /* ignore */ }
    return todayStr();
  });
  const value = useMemo(() => ({ selectedDate, setSelectedDate }), [selectedDate]);
  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
}

export function useSelectedDate() {
  const ctx = useContext(DateContext);
  if (!ctx) return { selectedDate: todayStr(), setSelectedDate: () => {} };
  return ctx;
}