// Shared Google Drive helpers for the driveFiles & googleDriveFiles backend
// functions: connector auth, id validation, and connection-error handling.
// Keeping these in one place prevents the two near-identical functions from
// drifting apart over time.

const DRIVE_CONNECTOR_ID = '6a37ebf86b324d770927a6e6';

/** A Drive file/folder id is an opaque token; validate its shape to prevent
 *  path traversal / URL manipulation in templated Drive API queries. */
export function isValidDriveId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id);
}

/** Acquire the app-user's Drive access token and return ready-to-use
 *  Authorization headers. Throws if the user has not connected Drive. */
export async function getDriveHeaders(base44) {
  const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(DRIVE_CONNECTOR_ID);
  return { Authorization: `Bearer ${accessToken}` };
}

/** Detect the "user hasn't connected Google Drive" error family across the
 *  different message shapes the SDK can throw. */
export function isNotConnectedError(error) {
  const m = (error && error.message) || '';
  return m.includes('No connection') || m.includes('connection') || m.includes('connect');
}

/** Standard "not connected" response. Status is kept per-caller so each
 *  function preserves its existing HTTP contract. */
export function notConnectedResponse(status = 403) {
  return Response.json({ error: 'not_connected' }, { status });
}