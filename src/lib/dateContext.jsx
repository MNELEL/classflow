import React, { createContext, useContext, useState, useMemo } from 'react';
import { format } from 'date-fns';

const DateContext = createContext(null);

// IMPORTANT: never use `new Date().toISOString().split('T')[0]` for "today"
// — toISOString() converts to UTC first, so anyone using the app between
// local midnight and the UTC offset (e.g. 00:00–03:00 in Israel, UTC+2/+3)
// would silently get yesterday's date. date-fns' format() uses the local
// timezone by definition, which is what "today" should mean here.
function todayStr() { return format(new Date(), 'yyyy-MM-dd'); }

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