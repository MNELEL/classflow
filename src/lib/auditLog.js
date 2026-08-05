import { base44 } from '@/api/base44Client';

/**
 * Logs an admin action to the AuditLog entity.
 * Fails silently so it never breaks the main operation.
 * @param {string} institution_id - optional, for multi-institution filtering
 */
export async function logAudit(action, entity_type, entity_id = '', entity_name = '', details = '', institution_id = '') {
  try {
    await base44.entities.AuditLog.create({ action, entity_type, entity_id, entity_name, details, institution_id });
  } catch (e) {
    console.error('audit log failed', e);
  }
}