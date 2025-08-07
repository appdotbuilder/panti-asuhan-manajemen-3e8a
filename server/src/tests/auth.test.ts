
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser, logoutUser, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  role: 'ADMIN' as const
};

const testLogin: LoginInput = {
  email: testUser.email,
  password: testUser.password
};

describe('Authentication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('loginUser', () => {
    it('should authenticate valid user credentials', async () => {
      // Create test user with hashed password
      const passwordHash = await Bun.password.hash(testUser.password);
      const result = await db.insert(usersTable)
        .values({
          email: testUser.email,
          password_hash: passwordHash,
          role: testUser.role,
          is_active: true
        })
        .returning()
        .execute();

      const userId = result[0].id;

      // Test login
      const loginResult = await loginUser(testLogin);

      expect(loginResult.user.id).toEqual(userId);
      expect(loginResult.user.email).toEqual(testUser.email);
      expect(loginResult.user.role).toEqual(testUser.role);
      expect(loginResult.user.is_active).toBe(true);
      expect(loginResult.token).toBeDefined();
      expect(typeof loginResult.token).toBe('string');
      expect(loginResult.token.length).toBeGreaterThan(0);
    });

    it('should reject invalid email', async () => {
      // Create test user
      const passwordHash = await Bun.password.hash(testUser.password);
      await db.insert(usersTable)
        .values({
          email: testUser.email,
          password_hash: passwordHash,
          role: testUser.role,
          is_active: true
        })
        .execute();

      // Test with wrong email
      const invalidLogin: LoginInput = {
        email: 'wrong@example.com',
        password: testUser.password
      };

      await expect(loginUser(invalidLogin)).rejects.toThrow(/invalid credentials/i);
    });

    it('should reject invalid password', async () => {
      // Create test user
      const passwordHash = await Bun.password.hash(testUser.password);
      await db.insert(usersTable)
        .values({
          email: testUser.email,
          password_hash: passwordHash,
          role: testUser.role,
          is_active: true
        })
        .execute();

      // Test with wrong password
      const invalidLogin: LoginInput = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      await expect(loginUser(invalidLogin)).rejects.toThrow(/invalid credentials/i);
    });

    it('should reject deactivated user', async () => {
      // Create deactivated test user
      const passwordHash = await Bun.password.hash(testUser.password);
      await db.insert(usersTable)
        .values({
          email: testUser.email,
          password_hash: passwordHash,
          role: testUser.role,
          is_active: false
        })
        .execute();

      await expect(loginUser(testLogin)).rejects.toThrow(/account is deactivated/i);
    });
  });

  describe('logoutUser', () => {
    it('should successfully logout existing user', async () => {
      // Create test user
      const passwordHash = await Bun.password.hash(testUser.password);
      const result = await db.insert(usersTable)
        .values({
          email: testUser.email,
          password_hash: passwordHash,
          role: testUser.role,
          is_active: true
        })
        .returning()
        .execute();

      const userId = result[0].id;

      // Test logout
      const logoutResult = await logoutUser(userId);

      expect(logoutResult.success).toBe(true);
    });

    it('should reject logout for non-existent user', async () => {
      const nonExistentUserId = 99999;

      await expect(logoutUser(nonExistentUserId)).rejects.toThrow(/user not found/i);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user data', async () => {
      // Create test user
      const passwordHash = await Bun.password.hash(testUser.password);
      const result = await db.insert(usersTable)
        .values({
          email: testUser.email,
          password_hash: passwordHash,
          role: testUser.role,
          is_active: true
        })
        .returning()
        .execute();

      const userId = result[0].id;

      // Test get current user
      const user = await getCurrentUser(userId);

      expect(user.id).toEqual(userId);
      expect(user.email).toEqual(testUser.email);
      expect(user.role).toEqual(testUser.role);
      expect(user.is_active).toBe(true);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });

    it('should reject non-existent user', async () => {
      const nonExistentUserId = 99999;

      await expect(getCurrentUser(nonExistentUserId)).rejects.toThrow(/user not found/i);
    });

    it('should reject deactivated user', async () => {
      // Create deactivated test user
      const passwordHash = await Bun.password.hash(testUser.password);
      const result = await db.insert(usersTable)
        .values({
          email: testUser.email,
          password_hash: passwordHash,
          role: testUser.role,
          is_active: false
        })
        .returning()
        .execute();

      const userId = result[0].id;

      await expect(getCurrentUser(userId)).rejects.toThrow(/account is deactivated/i);
    });

    it('should verify user exists in database after fetching', async () => {
      // Create test user
      const passwordHash = await Bun.password.hash(testUser.password);
      const result = await db.insert(usersTable)
        .values({
          email: testUser.email,
          password_hash: passwordHash,
          role: testUser.role,
          is_active: true
        })
        .returning()
        .execute();

      const userId = result[0].id;

      // Get current user
      await getCurrentUser(userId);

      // Verify user still exists in database
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].email).toEqual(testUser.email);
      expect(users[0].role).toEqual(testUser.role);
      expect(users[0].is_active).toBe(true);
    });
  });
});
