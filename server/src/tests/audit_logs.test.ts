
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { auditLogsTable, usersTable } from '../db/schema';
import { type CreateAuditLogInput } from '../schema';
import { 
  createAuditLog, 
  getAllAuditLogs, 
  getAuditLogsByUserId, 
  getAuditLogsByTableName 
} from '../handlers/audit_logs';
import { eq } from 'drizzle-orm';

describe('Audit Logs Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test user for foreign key relationship
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'ADMIN',
        is_active: true
      })
      .returning()
      .execute();
    return result[0];
  };

  const testAuditLogInput: CreateAuditLogInput = {
    user_id: 1, // Will be replaced with actual user ID
    action: 'CREATE',
    table_name: 'users',
    record_id: 123,
    old_values: null,
    new_values: JSON.stringify({ email: 'new@example.com', role: 'USER' }),
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 Test Browser'
  };

  describe('createAuditLog', () => {
    it('should create an audit log entry', async () => {
      const user = await createTestUser();
      const input = { ...testAuditLogInput, user_id: user.id };

      const result = await createAuditLog(input);

      expect(result.id).toBeDefined();
      expect(result.user_id).toEqual(user.id);
      expect(result.action).toEqual('CREATE');
      expect(result.table_name).toEqual('users');
      expect(result.record_id).toEqual(123);
      expect(result.old_values).toBeNull();
      expect(result.new_values).toEqual(JSON.stringify({ email: 'new@example.com', role: 'USER' }));
      expect(result.ip_address).toEqual('192.168.1.1');
      expect(result.user_agent).toEqual('Mozilla/5.0 Test Browser');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create audit log with minimal data', async () => {
      const user = await createTestUser();
      const minimalInput: CreateAuditLogInput = {
        user_id: user.id,
        action: 'DELETE',
        table_name: 'donations'
      };

      const result = await createAuditLog(minimalInput);

      expect(result.id).toBeDefined();
      expect(result.user_id).toEqual(user.id);
      expect(result.action).toEqual('DELETE');
      expect(result.table_name).toEqual('donations');
      expect(result.record_id).toBeNull();
      expect(result.old_values).toBeNull();
      expect(result.new_values).toBeNull();
      expect(result.ip_address).toBeNull();
      expect(result.user_agent).toBeNull();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save audit log to database', async () => {
      const user = await createTestUser();
      const input = { ...testAuditLogInput, user_id: user.id };

      const result = await createAuditLog(input);

      const savedLog = await db.select()
        .from(auditLogsTable)
        .where(eq(auditLogsTable.id, result.id))
        .execute();

      expect(savedLog).toHaveLength(1);
      expect(savedLog[0].user_id).toEqual(user.id);
      expect(savedLog[0].action).toEqual('CREATE');
      expect(savedLog[0].table_name).toEqual('users');
      expect(savedLog[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('getAllAuditLogs', () => {
    it('should return empty array when no audit logs exist', async () => {
      const results = await getAllAuditLogs();
      expect(results).toEqual([]);
    });

    it('should return all audit logs ordered by created_at desc', async () => {
      const user = await createTestUser();
      
      // Create multiple audit logs
      await createAuditLog({ ...testAuditLogInput, user_id: user.id, action: 'CREATE' });
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await createAuditLog({ ...testAuditLogInput, user_id: user.id, action: 'UPDATE' });
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await createAuditLog({ ...testAuditLogInput, user_id: user.id, action: 'DELETE' });

      const results = await getAllAuditLogs();

      expect(results).toHaveLength(3);
      expect(results[0].action).toEqual('DELETE'); // Most recent first
      expect(results[1].action).toEqual('UPDATE');
      expect(results[2].action).toEqual('CREATE');
    });
  });

  describe('getAuditLogsByUserId', () => {
    it('should return empty array when no audit logs exist for user', async () => {
      const user = await createTestUser();
      const results = await getAuditLogsByUserId(user.id);
      expect(results).toEqual([]);
    });

    it('should return audit logs for specific user only', async () => {
      const user1 = await createTestUser();
      const user2 = await db.insert(usersTable)
        .values({
          email: 'user2@example.com',
          password_hash: 'hashed_password',
          role: 'STAFF',
          is_active: true
        })
        .returning()
        .execute();

      // Create logs for both users
      await createAuditLog({ ...testAuditLogInput, user_id: user1.id, action: 'CREATE' });
      await createAuditLog({ ...testAuditLogInput, user_id: user2[0].id, action: 'UPDATE' });
      await createAuditLog({ ...testAuditLogInput, user_id: user1.id, action: 'DELETE' });

      const user1Logs = await getAuditLogsByUserId(user1.id);
      const user2Logs = await getAuditLogsByUserId(user2[0].id);

      expect(user1Logs).toHaveLength(2);
      expect(user1Logs.every(log => log.user_id === user1.id)).toBe(true);
      expect(user1Logs[0].action).toEqual('DELETE'); // Most recent first
      expect(user1Logs[1].action).toEqual('CREATE');

      expect(user2Logs).toHaveLength(1);
      expect(user2Logs[0].user_id).toEqual(user2[0].id);
      expect(user2Logs[0].action).toEqual('UPDATE');
    });
  });

  describe('getAuditLogsByTableName', () => {
    it('should return empty array when no audit logs exist for table', async () => {
      const results = await getAuditLogsByTableName('nonexistent_table');
      expect(results).toEqual([]);
    });

    it('should return audit logs for specific table only', async () => {
      const user = await createTestUser();

      // Create logs for different tables
      await createAuditLog({ ...testAuditLogInput, user_id: user.id, table_name: 'users', action: 'CREATE' });
      await createAuditLog({ ...testAuditLogInput, user_id: user.id, table_name: 'donations', action: 'UPDATE' });
      await createAuditLog({ ...testAuditLogInput, user_id: user.id, table_name: 'users', action: 'DELETE' });

      const userTableLogs = await getAuditLogsByTableName('users');
      const donationTableLogs = await getAuditLogsByTableName('donations');

      expect(userTableLogs).toHaveLength(2);
      expect(userTableLogs.every(log => log.table_name === 'users')).toBe(true);
      expect(userTableLogs[0].action).toEqual('DELETE'); // Most recent first
      expect(userTableLogs[1].action).toEqual('CREATE');

      expect(donationTableLogs).toHaveLength(1);
      expect(donationTableLogs[0].table_name).toEqual('donations');
      expect(donationTableLogs[0].action).toEqual('UPDATE');
    });
  });
});
