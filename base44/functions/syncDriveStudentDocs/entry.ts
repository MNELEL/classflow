import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const providerMeta = body?.data?._provider_meta || {};
    const resourceState = providerMeta['x-goog-resource-state'];

    // Google Drive sends a 'sync' ack on initial setup — just acknowledge it
    if (resourceState === 'sync') {
      return Response.json({ status: 'sync_ack' });
    }

    // Get the shared Google Drive connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Load the saved page token from SyncState
    const existing = await base44.asServiceRole.entities.SyncState.list();
    let syncRecord = existing.length > 0 ? existing[0] : null;

    if (!syncRecord) {
      // First run: get a start page token and save it
      const tokenRes = await fetch(
        'https://www.googleapis.com/drive/v3/changes/startPageToken',
        { headers: authHeader }
      );
      const { startPageToken } = await tokenRes.json();
      await base44.asServiceRole.entities.SyncState.create({ page_token: startPageToken });
      return Response.json({ status: 'initialized' });
    }

    // Fetch all pages of changes since the last token
    const baseUrl = `https://www.googleapis.com/drive/v3/changes?fields=changes(file(id,name,mimeType,modifiedTime,size,iconLink,thumbnailLink,trashed)),newStartPageToken,nextPageToken`;
    let changesUrl = baseUrl + `&pageToken=${syncRecord.page_token}`;
    const allChanges = [];
    let newPageToken = null;

    while (changesUrl) {
      const changesRes = await fetch(changesUrl, { headers: authHeader });
      if (!changesRes.ok) {
        return Response.json({ status: 'api_error', error: await changesRes.text() }, { status: 502 });
      }
      const page = await changesRes.json();
      allChanges.push(...(page.changes || []));
      if (page.newStartPageToken) newPageToken = page.newStartPageToken;
      changesUrl = page.nextPageToken ? baseUrl + `&pageToken=${page.nextPageToken}` : null;
    }

    // Map Google Drive MIME types to LibraryItem source_type
    const SOURCE_TYPE_MAP = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word_doc',
      'application/msword': 'word_doc',
      'application/vnd.google-apps.document': 'word_doc',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
      'application/vnd.google-apps.presentation': 'presentation',
      'video/mp4': 'video_file',
      'audio/mpeg': 'audio_file',
      'audio/mp3': 'audio_file',
      'audio/wav': 'audio_file',
      'audio/ogg': 'audio_file',
      'image/png': 'image',
      'image/jpeg': 'image',
      'image/jpg': 'image',
      'image/gif': 'image',
      'image/webp': 'image'
    };

    const STUDENT_DOC_KEYWORDS = ['student', 'תלמיד', 'students', 'תלמידים'];

    const synced = [];
    for (const change of allChanges) {
      const file = change.file;
      if (!file || file.trashed) continue;

      const sourceType = SOURCE_TYPE_MAP[file.mimeType];
      if (!sourceType) continue; // skip unsupported types (folders, etc.)

      // Check if this LibraryItem already exists (by file_url to avoid duplicates)
      const existingItems = await base44.asServiceRole.entities.LibraryItem.filter({
        file_url: file.iconLink || `https://drive.google.com/file/d/${file.id}/view`
      });

      if (existingItems.length > 0) continue; // already synced

      const isStudentDoc = STUDENT_DOC_KEYWORDS.some(kw =>
        (file.name || '').toLowerCase().includes(kw.toLowerCase())
      );

      if (!isStudentDoc) continue;

      const newItem = await base44.asServiceRole.entities.LibraryItem.create({
        title: file.name,
        source_type: sourceType,
        file_url: `https://drive.google.com/file/d/${file.id}/view`,
        file_name: file.name,
        file_size: file.size ? Number(file.size) : undefined,
        category: 'Google Drive',
        tags: ['google_drive', 'auto_synced'],
        ai_status: 'pending'
      });
      synced.push(newItem.id);
    }

    // Save the new page token AFTER successful processing
    if (newPageToken) {
      await base44.asServiceRole.entities.SyncState.update(syncRecord.id, { page_token: newPageToken });
    }

    return Response.json({ status: 'ok', synced_count: synced.length, synced_ids: synced });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});