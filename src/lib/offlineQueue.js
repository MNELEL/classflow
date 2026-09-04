/**
 * תור סנכרון offline לכתיבות לא-רגישות (נוכחות, ציונים).
 *
 * החלטה מכוונת: ה-service worker (vite.config.js) לא מאחסן תגובות API בכלל,
 * כדי שמורה לא יפעל על מידע מיושן. התור הזה לא סותר את זה — הוא לא שומר
 * תגובות קריאה, רק פעולות כתיבה שהמורה עצמו יזם וטרם הצליחו להישלח.
 * ברגע שהחיבור חוזר, כל פעולה ממתינה נשלחת בדיוק פעם אחת, לפי סדר היצירה.
 *
 * מוגבל בכוונה לשני סוגי כתיבה לא-רגישים: נוכחות וציונים. לא מיועד
 * להערות משמעת, פרטי תלמיד רגישים או כל דבר שדורש בדיקת קונפליקט מורכבת.
 */

const STORAGE_KEY = 'offline-write-queue:v1';
const listeners = new Set();

function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage מלא או חסום — הפעולה כבר בוצעה בזיכרון, רק לא תשרוד רענון.
  }
  listeners.forEach((fn) => fn(items));
}

export function subscribeQueue(fn) {
  listeners.add(fn);
  fn(readQueue());
  return () => listeners.delete(fn);
}

export function getQueueSnapshot() {
  return readQueue();
}

/**
 * מוסיף פעולה לתור. kind הוא 'attendance' | 'grade'. payload הוא הפרמטרים
 * המדויקים שה-executor (ראה flushQueue) צריך כדי לבצע את הכתיבה בפועל.
 */
export function enqueueWrite(kind, payload) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
  };
  const next = [...readQueue(), entry];
  writeQueue(next);
  return entry.id;
}

export function removeFromQueue(id) {
  writeQueue(readQueue().filter((e) => e.id !== id));
}

export function queueLength() {
  return readQueue().length;
}

/**
 * מריץ את כל התור, פעולה-פעולה, לפי סדר יצירה. executors הוא מיפוי
 * kind -> async function(payload) שמבצע את הכתיבה האמיתית מול base44.
 * פעולה שנכשלת (עדיין אין רשת, או שגיאת שרת) נשארת בתור לניסיון הבא;
 * פעולה שהצליחה מוסרת מיד, כדי שרענון עמוד לא ישלח אותה פעמיים.
 */
export async function flushQueue(executors) {
  const items = readQueue();
  if (items.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const entry of items) {
    const run = executors[entry.kind];
    if (!run) {
      // אין executor רשום לסוג הזה — לא ננעל את התור, פשוט מדלגים.
      continue;
    }
    try {
      await run(entry.payload);
      removeFromQueue(entry.id);
      sent += 1;
    } catch {
      failed += 1;
      // משאירים בתור; ניסיון הבא (חיבור חוזר, או flush ידני) ינסה שוב.
      break; // עוצרים בכשלון ראשון כדי לשמור על סדר — לא לדלג פעולות.
    }
  }

  return { sent, failed };
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
