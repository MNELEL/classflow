function saveAs(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const LEVEL_LABELS = {
  weak: 'חלש', below_average: 'מתקשה', average: 'בינוני',
  above_average: 'מעל ממוצע', strong: 'חזק', excellent: 'מצטיין',
};
const TRAIT_LABELS = {
  attentive: 'מקשיב', cooperative: 'משתף פעולה', struggling: 'מתקשה',
  fast_learner: 'מבין מהר', needs_extra_explanation: 'צריך הסבר נוסף',
  needs_teacher_attention: 'זקוק לתשומת לב', needs_encouragement: 'זקוק למחמאות',
  disruptive: 'מפריע', leader: 'מנהיג', shy: 'ביישן',
};
const STATUS_LABELS = { pending: 'ממתין', in_progress: 'בביצוע', done: 'הושלם' };
const PERIOD_LABELS = { weekly: 'שבועי', monthly: 'חודשי', exam: 'מבחן', quiz: 'בוחן', homework: 'שיעורי בית' };

export async function createPeriodReportWordDoc(data, className, periodLabel, audienceLabel, teacherName) {
  const { summary, highlights = [], challenges = [], classAchievements = [], recommendation, subjectSummaries = [], stats = {} } = data;
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType } = await import('docx');

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1200, right: 900, bottom: 1200, left: 900 } } },
      children: [
        new Paragraph({
          text: `דוח ${periodLabel} — ${className || 'כיתה'}`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `מיועד ל: ${audienceLabel}${teacherName ? ` | מורה: ${teacherName}` : ''}`, size: 22, color: '4338ca' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        new Paragraph({ text: 'נתונים עיקריים', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        stats.totalStudents ? new Paragraph({ children: [new TextRun({ text: 'תלמידים: ', bold: true }), new TextRun(String(stats.totalStudents))] }) : null,
        stats.avgGrade != null ? new Paragraph({ children: [new TextRun({ text: 'ממוצע ציונים: ', bold: true }), new TextRun(`${stats.avgGrade}%`)] }) : null,
        stats.avgAttendance != null ? new Paragraph({ children: [new TextRun({ text: 'נוכחות ממוצעת: ', bold: true }), new TextRun(`${stats.avgAttendance}%`)] }) : null,

        new Paragraph({ text: 'סיכום התקופה', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        new Paragraph({ children: [new TextRun(summary || '')], spacing: { after: 200 } }),

        ...(highlights.length ? [
          new Paragraph({ text: 'הישגים מרכזיים', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
          ...highlights.map(h => new Paragraph({ children: [new TextRun(`• ${h}`)], spacing: { after: 60 } })),
        ] : []),

        ...(challenges.length ? [
          new Paragraph({ text: 'נקודות לשיפור', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
          ...challenges.map(c => new Paragraph({ children: [new TextRun(`• ${c}`)], spacing: { after: 60 } })),
        ] : []),

        ...(classAchievements.length ? [
          new Paragraph({ text: 'מצטייני הכיתה', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
          ...classAchievements.map(a => new Paragraph({ children: [new TextRun(`★ ${a}`)], spacing: { after: 60 } })),
        ] : []),

        ...(subjectSummaries.length ? [
          new Paragraph({ text: 'סיכום לפי מקצועות', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['מקצוע', 'נושאים', 'ציון', 'הערות'].map(h =>
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })], shading: { fill: 'ede9fe' } })
                ),
              }),
              ...subjectSummaries.map(s => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(s.subject || '')] }),
                  new TableCell({ children: [new Paragraph(s.topics || '—')] }),
                  new TableCell({ children: [new Paragraph(s.score != null ? `${s.score}%` : '—')] }),
                  new TableCell({ children: [new Paragraph(s.note || '')] }),
                ],
              })),
            ],
          }),
        ] : []),

        ...(recommendation ? [
          new Paragraph({ text: 'המלצות להמשך', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
          new Paragraph({ children: [new TextRun(recommendation)], spacing: { after: 200 } }),
        ] : []),

        new Paragraph({ text: 'הופק על ידי ClassManager Pro', alignment: AlignmentType.CENTER, spacing: { before: 400 } }),
      ].filter(Boolean),
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `דוח_${periodLabel}_${className || 'כיתה'}.docx`);
}

export async function createStudentReportWordDoc(student, grades, tasks, teacherName, period) {
  const avgScore = grades.length
    ? Math.round(grades.reduce((s, g) => s + (g.score / (g.max_score || 100)) * 100, 0) / grades.length)
    : null;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType } = await import('docx');

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1200, right: 900, bottom: 1200, left: 900 } } },
      children: [
        // Title
        new Paragraph({
          text: `דוח סיכום תקופתי — ${student.name}`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `תקופה: ${period}${teacherName ? ` | מורה: ${teacherName}` : ''}`, size: 22, color: '4338ca' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        // Student info
        new Paragraph({ text: 'פרטי תלמיד', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: `שם: `, bold: true }), new TextRun(student.name)] }),
        new Paragraph({ children: [new TextRun({ text: `רמה אקדמית: `, bold: true }), new TextRun(LEVEL_LABELS[student.academic_level] || '—')] }),
        student.group ? new Paragraph({ children: [new TextRun({ text: `קבוצה: `, bold: true }), new TextRun(student.group)] }) : null,
        student.achievements ? new Paragraph({ children: [new TextRun({ text: `הישגים: `, bold: true }), new TextRun(student.achievements)] }) : null,

        // Stats
        new Paragraph({ text: 'סיכום', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: `ציונים שנרשמו: `, bold: true }), new TextRun(`${grades.length}${avgScore !== null ? ` (ממוצע: ${avgScore}%)` : ''}`)] }),
        new Paragraph({ children: [new TextRun({ text: `משימות שהושלמו: `, bold: true }), new TextRun(`${doneTasks} מתוך ${tasks.length}`)] }),

        // Grades table
        new Paragraph({ text: 'ציונים ומבחנים', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        ...(grades.length === 0
          ? [new Paragraph({ text: 'לא נרשמו ציונים בתקופה זו', color: '94a3b8' })]
          : [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: ['מקצוע', 'שם המבחן', 'סוג', 'ציון'].map(h =>
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })], shading: { fill: 'ede9fe' } })
                  ),
                }),
                ...grades.map(g => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(g.subject)] }),
                    new TableCell({ children: [new Paragraph(g.test_name || '—')] }),
                    new TableCell({ children: [new Paragraph(PERIOD_LABELS[g.period] || g.period || '—')] }),
                    new TableCell({ children: [new Paragraph(`${g.score}/${g.max_score || 100}`)] }),
                  ],
                })),
              ],
            })
          ]
        ),

        // Traits
        new Paragraph({ text: 'הערכה התנהגותית', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        new Paragraph({
          children: student.traits?.length
            ? [new TextRun(student.traits.map(t => TRAIT_LABELS[t] || t).join(' | '))]
            : [new TextRun({ text: 'לא תועדו תכונות', color: '94a3b8' })],
        }),
        student.notes ? new Paragraph({ children: [new TextRun({ text: `הערות: `, bold: true }), new TextRun(student.notes)] }) : null,

        // Tasks
        new Paragraph({ text: 'משימות', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        ...(tasks.length === 0
          ? [new Paragraph({ text: 'לא הוקצו משימות', color: '94a3b8' })]
          : tasks.slice(0, 20).map(t => new Paragraph({
            children: [
              new TextRun({ text: `• ${t.title}`, bold: false }),
              new TextRun({ text: ` — ${STATUS_LABELS[t.status] || t.status}`, color: t.status === 'done' ? '059669' : '94a3b8' }),
            ],
            spacing: { after: 60 },
          }))
        ),

        // Footer
        new Paragraph({ text: 'הופק על ידי ClassManager Pro', alignment: AlignmentType.CENTER, spacing: { before: 400 }, color: '94a3b8' }),
      ].filter(Boolean),
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `דוח_${student.name}_${period}.docx`);
}