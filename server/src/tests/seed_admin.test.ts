import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { seedDefaultAdmin } from '../handlers/seed_admin';
import { eq } from 'drizzle-orm';

describe('seedDefaultAdmin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create default admin when no users exist', async () => {
    // Set environment variables for test
    process.env['DEFAULT_ADMIN_EMAIL'] = 'admin@test.com';
    process.env['DEFAULT_ADMIN_PASSWORD'] = 'testpassword123';

    await seedDefaultAdmin();

    // Check that admin user was created
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'admin@test.com'))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('admin@test.com');
    expect(users[0].role).toEqual('ADMIN');
    expect(users[0].is_active).toBe(true);
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].password_hash).not.toEqual('testpassword123'); // Should be hashed
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should not create admin when users already exist', async () => {
    // Set environment variables
    process.env['DEFAULT_ADMIN_EMAIL'] = 'admin@test.com';
    process.env['DEFAULT_ADMIN_PASSWORD'] = 'testpassword123';

    // Create an existing user first
    await db.insert(usersTable).values({
      email: 'existing@test.com',
      password_hash: 'hashedpassword',
      role: 'DONOR',
      is_active: true
    }).execute();

    await seedDefaultAdmin();

    // Check that no new admin user was created
    const adminUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'admin@test.com'))
      .execute();

    expect(adminUsers).toHaveLength(0);

    // Check that only the original user exists
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(1);
    expect(allUsers[0].email).toEqual('existing@test.com');
  });

  it('should throw error when environment variables are missing', async () => {
    // Clear environment variables
    delete process.env['DEFAULT_ADMIN_EMAIL'];
    delete process.env['DEFAULT_ADMIN_PASSWORD'];

    expect(seedDefaultAdmin()).rejects.toThrow(/environment variables must be set/i);
  });

  it('should be idempotent - safe to run multiple times', async () => {
    // Set environment variables
    process.env['DEFAULT_ADMIN_EMAIL'] = 'admin@test.com';
    process.env['DEFAULT_ADMIN_PASSWORD'] = 'testpassword123';

    // Run seeding twice
    await seedDefaultAdmin();
    await seedDefaultAdmin();

    // Should still only have one user
    const users = await db.select().from(usersTable).execute();
    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('admin@test.com');
    expect(users[0].role).toEqual('ADMIN');
  });

  it('should hash password correctly', async () => {
    // Set environment variables
    process.env['DEFAULT_ADMIN_EMAIL'] = 'admin@test.com';
    process.env['DEFAULT_ADMIN_PASSWORD'] = 'testpassword123';

    await seedDefaultAdmin();

    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'admin@test.com'))
      .execute();

    // Password should be hashed, not plain text
    expect(user[0].password_hash).toBeDefined();
    expect(user[0].password_hash).not.toEqual('testpassword123');
    expect(user[0].password_hash.length).toBeGreaterThan(20); // bcrypt hashes are longer

    // Test that the hash can be verified
    const isValid = await Bun.password.verify('testpassword123', user[0].password_hash);
    expect(isValid).toBe(true);

    // Test that wrong password fails verification
    const isInvalid = await Bun.password.verify('wrongpassword', user[0].password_hash);
    expect(isInvalid).toBe(false);
  });
});