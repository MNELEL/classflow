import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a37ebf86b324d770927a6e6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, query, folderId, fileId } = body;

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

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if (error.message?.includes('connection') || error.message?.includes('connect')) {
      return Response.json({ error: 'not_connected' }, { status: 401 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});