
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser, getAllUsers, getUserById, deactivateUser } from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test input data
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  role: 'DONOR'
};

const adminUserInput: CreateUserInput = {
  email: 'admin@example.com',
  password: 'adminpass123',
  role: 'ADMIN'
};

describe('User handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const result = await createUser(testUserInput);

      expect(result.email).toEqual('test@example.com');
      expect(result.role).toEqual('DONOR');
      expect(result.is_active).toBe(true);
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123'); // Password should be hashed
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save user to database', async () => {
      const result = await createUser(testUserInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].email).toEqual('test@example.com');
      expect(users[0].role).toEqual('DONOR');
      expect(users[0].is_active).toBe(true);
    });

    it('should create users with different roles', async () => {
      const donorResult = await createUser(testUserInput);
      const adminResult = await createUser(adminUserInput);

      expect(donorResult.role).toEqual('DONOR');
      expect(adminResult.role).toEqual('ADMIN');
    });

    it('should reject duplicate email addresses', async () => {
      await createUser(testUserInput);

      await expect(createUser(testUserInput)).rejects.toThrow(/unique constraint/i);
    });
  });

  describe('getAllUsers', () => {
    it('should return empty array when no users exist', async () => {
      const users = await getAllUsers();

      expect(users).toEqual([]);
    });

    it('should return all users when they exist', async () => {
      await createUser(testUserInput);
      await createUser(adminUserInput);

      const users = await getAllUsers();

      expect(users).toHaveLength(2);
      expect(users.some(u => u.email === 'test@example.com')).toBe(true);
      expect(users.some(u => u.email === 'admin@example.com')).toBe(true);
    });

    it('should include both active and inactive users', async () => {
      const user1 = await createUser(testUserInput);
      await createUser(adminUserInput);
      
      // Deactivate one user
      await deactivateUser(user1.id);

      const users = await getAllUsers();

      expect(users).toHaveLength(2);
      expect(users.some(u => u.is_active === false)).toBe(true);
      expect(users.some(u => u.is_active === true)).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('should return null when user does not exist', async () => {
      const user = await getUserById(999);

      expect(user).toBeNull();
    });

    it('should return user when they exist', async () => {
      const createdUser = await createUser(testUserInput);

      const foundUser = await getUserById(createdUser.id);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toEqual(createdUser.id);
      expect(foundUser!.email).toEqual('test@example.com');
      expect(foundUser!.role).toEqual('DONOR');
    });

    it('should return user with all fields populated', async () => {
      const createdUser = await createUser(testUserInput);

      const foundUser = await getUserById(createdUser.id);

      expect(foundUser!.email).toBeDefined();
      expect(foundUser!.password_hash).toBeDefined();
      expect(foundUser!.role).toBeDefined();
      expect(foundUser!.is_active).toBeDefined();
      expect(foundUser!.created_at).toBeInstanceOf(Date);
      expect(foundUser!.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('deactivateUser', () => {
    it('should return false when user does not exist', async () => {
      const result = await deactivateUser(999);

      expect(result.success).toBe(false);
    });

    it('should deactivate existing user', async () => {
      const createdUser = await createUser(testUserInput);

      const result = await deactivateUser(createdUser.id);

      expect(result.success).toBe(true);

      // Verify user is deactivated in database
      const deactivatedUser = await getUserById(createdUser.id);
      expect(deactivatedUser!.is_active).toBe(false);
    });

    it('should update the updated_at timestamp', async () => {
      const createdUser = await createUser(testUserInput);
      const originalUpdatedAt = createdUser.updated_at;

      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await deactivateUser(createdUser.id);

      const updatedUser = await getUserById(createdUser.id);
      expect(updatedUser!.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should successfully deactivate already inactive user', async () => {
      const createdUser = await createUser(testUserInput);
      
      // Deactivate twice
      await deactivateUser(createdUser.id);
      const result = await deactivateUser(createdUser.id);

      expect(result.success).toBe(true);

      const user = await getUserById(createdUser.id);
      expect(user!.is_active).toBe(false);
    });
  });
});
