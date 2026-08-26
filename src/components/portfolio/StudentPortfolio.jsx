import React from 'react';
import DocumentsVault from './DocumentsVault';

// StudentPortfolio now renders the documents vault only. Parent contact info
// and the full communication history live in the dedicated "הורים" tab on the
// student profile page (ParentContactBar + ParentContactLog), so they are no
// longer duplicated here.
export default function StudentPortfolio({ student, open }) {
  if (!open || !student) return null;

  return (
    <div className="mt-4 border border-border/60 rounded-2xl overflow-hidden bg-card/50" dir="rtl">
      <div className="bg-primary/5 border-b border-border/40 px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
          {student.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-sm">{student.name}</p>
          <p className="text-xs text-muted-foreground">תיק אישי</p>
        </div>
      </div>
      <div className="p-3">
        <DocumentsVault studentId={student.id} />
      </div>
    </div>
  );
}