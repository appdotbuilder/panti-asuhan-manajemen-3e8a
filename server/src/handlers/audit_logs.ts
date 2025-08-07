
import { db } from '../db';
import { auditLogsTable, usersTable } from '../db/schema';
import { type CreateAuditLogInput, type AuditLog } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  try {
    const result = await db.insert(auditLogsTable)
      .values({
        user_id: input.user_id,
        action: input.action,
        table_name: input.table_name,
        record_id: input.record_id || null,
        old_values: input.old_values || null,
        new_values: input.new_values || null,
        ip_address: input.ip_address || null,
        user_agent: input.user_agent || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Audit log creation failed:', error);
    throw error;
  }
}

export async function getAllAuditLogs(): Promise<AuditLog[]> {
  try {
    const results = await db.select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch all audit logs:', error);
    throw error;
  }
}

export async function getAuditLogsByUserId(userId: number): Promise<AuditLog[]> {
  try {
    const results = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.user_id, userId))
      .orderBy(desc(auditLogsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch audit logs by user ID:', error);
    throw error;
  }
}

export async function getAuditLogsByTableName(tableName: string): Promise<AuditLog[]> {
  try {
    const results = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.table_name, tableName))
      .orderBy(desc(auditLogsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch audit logs by table name:', error);
    throw error;
  }
}
