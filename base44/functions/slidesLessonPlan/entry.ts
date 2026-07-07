import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SLIDES_API = 'https://slides.googleapis.com/v1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { planId, plan } = body;

    let lessonPlan = plan;
    if (!lessonPlan && planId) {
      lessonPlan = await base44.entities.LessonPlan.get(planId);
    }
    if (!lessonPlan) {
      return Response.json({ error: 'plan or planId required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googleslides');
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Fetch attached library items to enrich slide content
    const libraryIds = (lessonPlan.blocks || []).flatMap((b) => b.library_item_ids || []);
    let libraryItems = [];
    if (libraryIds.length > 0) {
      const all = await base44.entities.LibraryItem.list('-created_date', 200);
      libraryItems = all.filter((i) => libraryIds.includes(i.id));
    }

    // Build slide definitions
    const slides = [];
    const totalMinutes = (lessonPlan.blocks || []).reduce((s, b) => s + (b.duration_minutes || 0), 0);

    // Title slide
    slides.push({
      layout: 'TITLE',
      title: lessonPlan.title || 'מערך שיעור',
      body: [lessonPlan.subject, lessonPlan.grade_level].filter(Boolean).join(' • ') + (totalMinutes ? ` • ${totalMinutes} דק׳` : ''),
    });

    // Objectives slide
    if (lessonPlan.learning_objectives?.length) {
      slides.push({
        layout: 'TITLE_AND_BODY',
        title: 'יעדים לימודיים',
        body: lessonPlan.learning_objectives.map((o) => `• ${o}`).join('\n'),
      });
    }

    // Description slide
    if (lessonPlan.description) {
      slides.push({
        layout: 'TITLE_AND_BODY',
        title: 'תיאור השיעור',
        body: lessonPlan.description,
      });
    }

    // Block slides
    for (const block of lessonPlan.blocks || []) {
      const lines = [];
      if (block.description) lines.push(block.description);
      if (block.duration_minutes) lines.push(`⏱ ${block.duration_minutes} דק׳`);
      const blockLibs = (block.library_item_ids || [])
        .map((id) => libraryItems.find((i) => i.id === id))
        .filter(Boolean);
      for (const lib of blockLibs) {
        if (lib.ai_summary) lines.push(`\n📚 ${lib.title}:\n${lib.ai_summary}`);
        if (lib.ai_key_points?.length) lines.push(`נק׳ מפתח: ${lib.ai_key_points.join(', ')}`);
      }
      if (block.worksheet_ids?.length) lines.push(`📝 ${block.worksheet_ids.length} דפי עבודה`);

      slides.push({
        layout: 'TITLE_AND_BODY',
        title: block.title || 'בלוק',
        body: lines.join('\n') || '',
      });
    }

    // Summary slide
    slides.push({
      layout: 'TITLE',
      title: 'תודה רבה!',
      body: `${(lessonPlan.blocks || []).length} שלבים • ${totalMinutes} דק׳`,
    });

    // Create presentation
    const createRes = await fetch(`${SLIDES_API}/presentations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: `${lessonPlan.title || 'מערך שיעור'} - ${lessonPlan.subject || ''}`.trim() }),
    });
    const created = await createRes.json();
    if (!created.presentationId) {
      return Response.json({ error: 'Failed to create presentation', details: created }, { status: 500 });
    }

    // Build batchUpdate requests — blank slides with manual text boxes
    const EMU_PER_PX = 9525; // 1px = 9525 EMU
    const PAGE_W = 960; // pixels (10in)
    const PAGE_H = 540; // pixels
    const requests = [];
    slides.forEach((slide, idx) => {
      const slideObjId = `slide_${idx}`;
      const titleObjId = `title_${idx}`;
      const bodyObjId = `body_${idx}`;
      const isTitleSlide = slide.layout === 'TITLE';

      requests.push({
        createSlide: {
          objectId: slideObjId,
          slideLayoutReference: { predefinedLayout: 'BLANK' },
        },
      });

      // Title text box
      const titleW = isTitleSlide ? 800 : 880;
      const titleH = isTitleSlide ? 120 : 80;
      requests.push({
        createShape: {
          objectId: titleObjId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideObjId,
            size: { width: { magnitude: titleW * EMU_PER_PX, unit: 'EMU' }, height: { magnitude: titleH * EMU_PER_PX, unit: 'EMU' } },
            transform: { scaleX: 1, scaleY: 1, translateX: ((PAGE_W - titleW) / 2) * EMU_PER_PX, translateY: (isTitleSlide ? 200 : 40) * EMU_PER_PX, unit: 'EMU' },
          },
        },
      });
      requests.push({ insertText: { objectId: titleObjId, text: slide.title || '' } });
      // Style title text
      const titleSize = isTitleSlide ? 36 : 28;
      requests.push({
        updateTextStyle: {
          objectId: titleObjId,
          fields: 'fontSize,bold,foregroundColor',
          style: { fontSize: { magnitude: titleSize, unit: 'PT' }, bold: true, foregroundColor: { opaqueColor: { rgbColor: { red: 0.1, green: 0.3, blue: 0.4 } } } },
        },
      });

      // Body text box
      if (slide.body) {
        const bodyW = 840;
        const bodyY = isTitleSlide ? 340 : 140;
        requests.push({
          createShape: {
            objectId: bodyObjId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
              pageObjectId: slideObjId,
              size: { width: { magnitude: bodyW * EMU_PER_PX, unit: 'EMU' }, height: { magnitude: 360 * EMU_PER_PX, unit: 'EMU' } },
              transform: { scaleX: 1, scaleY: 1, translateX: ((PAGE_W - bodyW) / 2) * EMU_PER_PX, translateY: bodyY * EMU_PER_PX, unit: 'EMU' },
            },
          },
        });
        requests.push({ insertText: { objectId: bodyObjId, text: slide.body } });
        requests.push({
          updateTextStyle: {
            objectId: bodyObjId,
            fields: 'fontSize',
            style: { fontSize: { magnitude: 18, unit: 'PT' } },
          },
        });
      }
    });

    const updateRes = await fetch(`${SLIDES_API}/presentations/${created.presentationId}:batchUpdate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ requests }),
    });
    const updated = await updateRes.json();
    if (updated.error) {
      return Response.json({ error: 'batchUpdate failed', details: updated }, { status: 500 });
    }

    return Response.json({
      presentationId: created.presentationId,
      slidesCount: slides.length,
      url: `https://docs.google.com/presentation/d/${created.presentationId}/edit`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});