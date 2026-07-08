// ── Heuristic parser for unstructured student preference text ──
// Used as a fallback when the LLM-based parser fails.
// Identifies student names, preferences, and social constraints via regex/keyword matching.

const HEIGHT_KEYWORDS = {
  tall: ['גבוה', 'גבוהה', 'גובה', 'גבה', 'ארוך', 'ארוכה', 'גובהה'],
  short: ['נמוך', 'נמוכה', 'נמוכים', 'קטן', 'קטנה'],
  medium: ['בינוני', 'בינונית', 'ממוצע'],
};

const ROW_KEYWORDS = {
  front: ['קדמי', 'קדמית', 'קדימה', 'שורה ראשונה', 'שורות ראשונות', 'לפנים'],
  back: ['אחורי', 'אחורית', 'אחורה', 'שורה אחרונה', 'שורות אחרונות', 'לאחור'],
  middle: ['אמצע', 'אמצעי', 'אמצעית', 'אמצעיות'],
};

const SIDE_KEYWORDS = {
  left: ['שמאל', 'שמאלי', 'שמאלית'],
  right: ['ימין', 'ימני', 'ימנית'],
  center: ['מרכז', 'מרכזי', 'מרכזית'],
};

const NEED_KEYWORDS = {
  vision: ['ראייה', 'ראיה', 'לקות ראייה', 'לקות ראיה', 'משקפיים', 'משקפים', 'קוצר ראייה'],
  hearing: ['שמיעה', 'לקות שמיעה', 'קוצר שמיעה', 'מכשיר שמיעה'],
  adhd: ['קשב', 'קושי קשב', 'adhd', 'הפרעת קשב', 'ADD', 'ADHD', 'ריכוז', 'קושי ריכוז'],
  mobility: ['ניידות', 'כיסא גלגלים', 'מוגבלות פיזית', 'קשיי הליכה'],
  other: ['אחר', 'מיוחד'],
};

function hasKeyword(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function matchAllKeywords(text, map) {
  for (const [key, keywords] of Object.entries(map)) {
    if (hasKeyword(text, keywords)) return key;
  }
  return null;
}

/**
 * Parses free-text student preferences without LLM.
 * @param {string} text — the free-text input
 * @param {Array} students — existing student objects (must have .id and .name)
 * @returns {Array} — list of { student, changes, raw } objects, same shape as LLM output
 */
export function parseUnstructuredText(text, students) {
  if (!text || !students?.length) return [];

  // Split by lines or sentence boundaries
  const segments = text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Build name lookup — longer names first to avoid partial matches
  const sortedNames = [...students].sort((a, b) => b.name.length - a.name.length);
  const results = [];

  for (const segment of segments) {
    const lowerSeg = segment;

    // Find all students mentioned in this segment
    const mentioned = sortedNames.filter((s) =>
      lowerSeg.includes(s.name) ||
      lowerSeg.includes(s.name.split(' ')[0]) // first name match
    );

    if (mentioned.length === 0) continue;

    // Build changes for each mentioned student
    for (const student of mentioned) {
      // Find the student's position in the segment to extract nearby context
      const nameIdx = lowerSeg.indexOf(student.name);
      // Context window: 60 chars around the name
      const ctxStart = Math.max(0, nameIdx - 30);
      const ctxEnd = Math.min(lowerSeg.length, nameIdx + student.name.length + 60);
      const ctx = lowerSeg.slice(ctxStart, ctxEnd);

      const changes = {};

      // Height
      const height = matchAllKeywords(ctx, HEIGHT_KEYWORDS);
      if (height) changes.height = height;

      // Row preference
      const rowPref = matchAllKeywords(ctx, ROW_KEYWORDS);
      if (rowPref) changes.row_preference = rowPref;

      // Side preference
      const sidePref = matchAllKeywords(ctx, SIDE_KEYWORDS);
      if (sidePref) changes.side_preference = sidePref;

      // Special needs
      const needs = [];
      for (const [need, keywords] of Object.entries(NEED_KEYWORDS)) {
        if (hasKeyword(ctx, keywords)) needs.push(need);
      }
      if (needs.length) changes.special_needs = needs;

      // Social: friends / avoid / separate
      // Patterns like "X ו-Y חברים", "X ליד Y", "X לא ליד Y", "X רחוק מ-Y"
      const resolveName = (name) => {
        const found = sortedNames.find(
          (s) => s.name === name || s.name.includes(name) || name.includes(s.name.split(' ')[0])
        );
        return found?.id;
      };

      // Friends: "X ו-Y חברים/רוצים ביחד/ליד", "X ליד Y"
      const friendMatches = extractSocialPairs(ctx, student, sortedNames, ['ליד', 'חבר', 'ביחד', 'יחד', 'רוצה לשבת']);
      if (friendMatches.length) changes.friends = friendMatches.map(resolveName).filter(Boolean);

      // Avoid: "X לא ליד Y", "X רחוק מ-Y", "אסור לשבת ליד"
      const avoidMatches = extractSocialPairs(ctx, student, sortedNames, ['לא ליד', 'רחוק מ', 'אסור', 'לא רוצה ליד', 'מתנגש']);
      if (avoidMatches.length) changes.avoid = avoidMatches.map(resolveName).filter(Boolean);

      // Separate: "X להרחיק מ-Y", "מרחק גדול"
      const separateMatches = extractSocialPairs(ctx, student, sortedNames, ['להרחיק', 'מרחק גדול', 'מרוחק']);
      if (separateMatches.length) changes.separate = separateMatches.map(resolveName).filter(Boolean);

      // Notes: use the whole segment if it has meaningful content
      if (segment.length > 5 && segment.length < 300) {
        changes.notes = segment.trim();
      }

      // Only add if we found something
      if (Object.keys(changes).length > 0) {
        // Merge with existing entry for same student
        const existing = results.find((r) => r.student.id === student.id);
        if (existing) {
          // Merge: new changes override, arrays accumulate
          if (changes.special_needs) {
            const combined = [...(existing.changes.special_needs || []), ...changes.special_needs];
            existing.changes.special_needs = [...new Set(combined)];
          }
          if (changes.friends) {
            const combined = [...(existing.changes.friends || []), ...changes.friends];
            existing.changes.friends = [...new Set(combined)];
          }
          if (changes.avoid) {
            const combined = [...(existing.changes.avoid || []), ...changes.avoid];
            existing.changes.avoid = [...new Set(combined)];
          }
          if (changes.separate) {
            const combined = [...(existing.changes.separate || []), ...changes.separate];
            existing.changes.separate = [...new Set(combined)];
          }
          if (changes.height) existing.changes.height = changes.height;
          if (changes.row_preference) existing.changes.row_preference = changes.row_preference;
          if (changes.side_preference) existing.changes.side_preference = changes.side_preference;
          if (changes.notes) existing.changes.notes = changes.notes;
        } else {
          results.push({ student, changes, raw: { student_name: student.name, ...changes } });
        }
      }
    }
  }

  return results;
}

function extractSocialPairs(ctx, currentStudent, allStudents, triggers) {
  const others = [];
  // Check if any trigger keyword is present
  const hasTrigger = triggers.some((t) => ctx.includes(t));
  if (!hasTrigger) return others;

  for (const s of allStudents) {
    if (s.id === currentStudent.id) continue;
    if (ctx.includes(s.name) || ctx.includes(s.name.split(' ')[0])) {
      others.push(s.name);
    }
  }
  return others;
}