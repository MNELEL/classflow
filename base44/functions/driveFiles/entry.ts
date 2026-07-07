import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a37ebf86b324d770927a6e6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, query, folderId, fileId, planData, weekKey, className } = body;

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
    const headers = { Authorization: `Bearer ${accessToken}` };

    if (action === 'list') {
      // List files: docs, pdfs, presentations, sheets
      let q = "trashed=false and (mimeType='application/pdf' or mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.presentation' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='application/vnd.openxmlformats-officedocument.presentationml.presentation' or mimeType='application/vnd.google-apps.folder')";
      if (query) q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
      if (folderId) q = `'${folderId}' in parents and trashed=false`;

      const params = new URLSearchParams({
        q,
        fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink,parents)',
        orderBy: 'modifiedTime desc',
        pageSize: '50',
      });
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers });
      const data = await res.json();
      return Response.json({ files: data.files || [] });
    }

    if (action === 'import') {
      // Import a Drive file as a LibraryItem
      if (!fileId) return Response.json({ error: 'fileId required' }, { status: 400 });
      if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
        return Response.json({ error: 'Invalid fileId' }, { status: 400 });
      }

      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,modifiedTime`,
        { headers }
      );
      const meta = await metaRes.json();

      const sourceTypeMap = {
        'application/pdf': 'pdf',
        'application/vnd.google-apps.document': 'word_doc',
        'application/vnd.google-apps.presentation': 'presentation',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word_doc',
      };
      const source_type = sourceTypeMap[meta.mimeType] || 'external_link';

      const item = await base44.asServiceRole.entities.LibraryItem.create({
        title: meta.name,
        source_type,
        external_url: meta.webViewLink,
        ai_status: 'pending',
        tags: ['Google Drive'],
      });
      return Response.json({ item });
    }

    if (action === 'savePlan') {
      // Save weekly plan as a JSON file on Google Drive (create or update)
      if (!planData || !weekKey) {
        return Response.json({ error: 'planData and weekKey required' }, { status: 400 });
      }
      const safeClass = (className || 'כיתה').replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `ClassFlow-Weekly-${weekKey}-${safeClass}.json`;
      const content = JSON.stringify({ week_start: weekKey, class: className, days: planData, saved_at: new Date().toISOString() }, null, 2);

      // Search for an existing file with this name
      const searchParams = new URLSearchParams({
        q: `name='${fileName.replace(/'/g, "\\'")}' and trashed=false`,
        fields: 'files(id,name)',
        pageSize: '1',
      });
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?${searchParams}`, { headers });
      const searchData = await searchRes.json();
      const existingId = searchData.files?.[0]?.id;

      if (existingId) {
        // Update existing file content
        const updateRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`,
          { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: content }
        );
        const updated = await updateRes.json();
        return Response.json({ fileId: existingId, webViewLink: updated.webViewLink, updated: true });
      }

      // Create new file with metadata + content (multipart)
      const boundary = 'classflow_' + Math.random().toString(36).slice(2);
      const metadata = { name: fileName, mimeType: 'application/json' };
      const multipartBody = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        'Content-Type: application/json',
        '',
        content,
        `--${boundary}--`,
      ].join('\r\n');

      const createRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        { method: 'POST', headers: { ...headers, 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipartBody }
      );
      const created = await createRes.json();
      return Response.json({ fileId: created.id, webViewLink: created.webViewLink, created: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if (error.message?.includes('connection') || error.message?.includes('connect')) {
      return Response.json({ error: 'not_connected' }, { status: 401 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});