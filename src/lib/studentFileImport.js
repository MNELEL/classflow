import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';

export function ext(name) { return (name.split('.').pop() || '').toLowerCase(); }

// ── CSV parser (handles quoted fields) ──
function parseCSVText(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map(h => (h || '').trim());
  return rows.slice(1)
    .filter(r => r.some(c => (c || '').trim() !== ''))
    .map(r => {
      const o = {};
      headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
      return o;
    });
}

async function parseCSV(file) {
  const text = await file.text();
  return parseCSVText(text);
}

async function parseExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  // normalize all values to trimmed strings
  return rows.map(r => {
    const o = {};
    Object.keys(r).forEach(k => { o[k] = String(r[k] ?? '').trim(); });
    return o;
  });
}

async function parseJSON(file) {
  const data = JSON.parse(await file.text());
  if (Array.isArray(data)) {
    if (data.length && Array.isArray(data[0])) {
      const headers = data[0];
      return data.slice(1).map(r => {
        const o = {};
        headers.forEach((h, i) => { o[h] = String(r[i] ?? '').trim(); });
        return o;
      });
    }
    return data.map(r => {
      const o = {};
      Object.keys(r).forEach(k => { o[k] = String(r[k] ?? '').trim(); });
      return o;
    });
  }
  return [];
}

// PDF / image / docx / html → InvokeLLM with file attachment.
// Strong prompt: return ALL rows as objects keyed by the EXACT original column headers.
async function extractRawWithLLM(file_url, fileName) {
  const prompt = `הקובץ המצורף (${fileName}) מכיל טבלת תלמידים.

חובה:
1. החזר את כל השורות בקובץ — כל תלמיד הוא שורה נפרדת. אל תדלג על אף תלמיד, אל תמזג שורות, אל תתמצת. אם יש 30 תלמידים — החזר 30 שורות.
2. כל שורה היא אובייקט שהמפתחות שלו הם בדיוק שמות העמודות המקוריים בקובץ (בעברית/אנגלית כפי שמופיעים). אל תתרגם, אל תשנה שמות עמודות, אל תשמיט עמודות.
3. הערכים הם מחרוזות בלבד.
4. אם יש עמודת שם פרטי ועמודת שם משפחה בנפרד — שמור אותן כשני מפתחות נפרדים (אל תשלב).
5. החזר JSON: { "rows": [ {...}, {...}, ... ] }.`;
  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [file_url],
    response_json_schema: {
      type: 'object',
      properties: {
        rows: { type: 'array', items: { type: 'object', additionalProperties: { type: 'string' } } },
      },
    },
  });
  const rows = Array.isArray(res?.rows) ? res.rows : [];
  return rows.map(r => {
    const o = {};
    Object.keys(r).forEach(k => { o[k] = String(r[k] ?? '').trim(); });
    return o;
  });
}

// Dispatch by file type. Returns { rows, via }.
export async function extractStudentsFromFile(file) {
  const e = ext(file.name);
  if (e === 'csv' || e === 'txt') return { rows: await parseCSV(file), via: 'csv' };
  if (e === 'json') return { rows: await parseJSON(file), via: 'json' };
  if (['xlsx', 'xls'].includes(e)) return { rows: await parseExcel(file), via: 'excel' };
  // pdf, png, jpg, jpeg, docx, html → LLM
  const up = await base44.integrations.Core.UploadFile({ file });
  if (!up?.file_url) throw new Error('העלאת הקובץ נכשלה');
  const rows = await extractRawWithLLM(up.file_url, file.name);
  return { rows, via: 'llm' };
}