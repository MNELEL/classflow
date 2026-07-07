import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a37ebf86b324d770927a6e6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, folderId, query, fileId } = body;

    // Validate fileId to prevent path traversal / URL manipulation
    if (fileId && !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      return Response.json({ error: 'Invalid fileId' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
    const headers = { Authorization: `Bearer ${accessToken}` };

    // List files (optionally in a folder or by search query)
    if (action === 'list' || !action) {
      let q = "trashed=false and (mimeType='application/pdf' or mimeType contains 'document' or mimeType contains 'presentation' or mimeType contains 'spreadsheet' or mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.presentation' or mimeType='image/jpeg' or mimeType='image/png')";
      if (query) q = `name contains '${query.replace(/'/g, "\\'")}' and trashed=false`;
      if (folderId) q += ` and '${folderId}' in parents`;
      const fields = 'files(id,name,mimeType,modifiedTime,size,webViewLink,thumbnailLink,iconLink,parents)';
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=50&orderBy=modifiedTime desc`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      return Response.json({ files: data.files || [] });
    }

    // List folders for navigation
    if (action === 'folders') {
      let q = "mimeType='application/vnd.google-apps.folder' and trashed=false";
      if (folderId) q += ` and '${folderId}' in parents`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,parents)&pageSize=50`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      return Response.json({ folders: data.folders || data.files || [] });
    }

    // Get file download/view URL
    if (action === 'getFile') {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,webContentLink,size,thumbnailLink`, { headers });
      const data = await res.json();
      return Response.json({ file: data });
    }

    // Export Google Docs as PDF — proxy content server-side so the access token is never exposed to the client
    if (action === 'exportUrl') {
      const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
      const pdfRes = await fetch(exportUrl, { headers });
      if (!pdfRes.ok) return Response.json({ error: 'export_failed' }, { status: 502 });
      const pdfBuffer = await pdfRes.arrayBuffer();
      return new Response(pdfBuffer, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${fileId}.pdf"` },
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if (error.message?.includes('No connection') || error.message?.includes('connection')) {
      return Response.json({ error: 'not_connected' }, { status: 403 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});