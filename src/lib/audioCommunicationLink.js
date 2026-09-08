import { base44 } from '@/api/base44Client';

// Links a finished audio transcript to the relevant student's communication
// history (UnifiedCommunicationHistory): a short AI summary of the recording
// is saved as a ParentContact entry so the transcript lives inside the
// student's organized timeline, with the library item named as its source.
// If the AI summary fails, we fall back to a transcript excerpt so the
// communication record is never lost.
export async function attachTranscriptToCommunicationHistory({ student, transcript, libraryItem }) {
  let aiSummary = '';
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `להלן תמלול אוטומטי של הקלטה הקשורה לתלמיד/ה ${student.name}:\n\n"""\n${(transcript || '').slice(0, 6000)}\n"""\n\nסכם ב-2-3 משפטים בעברית את תוכן ההקלטה כרשומת תקשורת תמציתית וברורה.`,
      response_json_schema: { type: 'object', properties: { summary: { type: 'string' } } },
    });
    aiSummary = res.summary || '';
  } catch {
    // fall back to the raw transcript excerpt below
  }

  const summaryBody = aiSummary || `תמלול אוטומטי של הקלטה: ${(transcript || '').slice(0, 400)}`;
  const sourceNote = libraryItem?.id ? `\n\nמקור: ספריית החומרים — "${libraryItem.title}"` : '';

  await base44.entities.ParentContact.create({
    student_id: student.id,
    date: new Date().toISOString().slice(0, 10),
    type: 'note',
    summary: `${summaryBody}${sourceNote}`,
    initiated_by: 'teacher',
  });
}