import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { createUser } from '../handlers/users';
import { eq } from 'drizzle-orm';
import type { CreateUserInput } from '../schema';

describe('Admin User Setup', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create admin user airamito11@gmail.com if not exists', async () => {
    const adminEmail = 'airamito11@gmail.com';
    
    // Check if admin user already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, adminEmail))
      .execute();

    if (existingUsers.length > 0) {
      console.log('✅ Admin user already exists:', {
        id: existingUsers[0].id,
        email: existingUsers[0].email,
        role: existingUsers[0].role,
        is_active: existingUsers[0].is_active,
        created_at: existingUsers[0].created_at
      });
      
      expect(existingUsers[0].email).toEqual(adminEmail);
      expect(existingUsers[0].role).toEqual('ADMIN');
      return;
    }

    // Create new admin user
    const adminUserData: CreateUserInput = {
      email: adminEmail,
      password: '123456',
      role: 'ADMIN'
    };

    const result = await createUser(adminUserData);

    // Validate the created user
    expect(result.email).toEqual(adminEmail);
    expect(result.role).toEqual('ADMIN');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('123456'); // Should be hashed

    console.log('🎉 New admin user created successfully:', {
      id: result.id,
      email: result.email,
      role: result.role,
      is_active: result.is_active,
      created_at: result.created_at
    });

    console.log('\n📋 Login Credentials:');
    console.log('Email: airamito11@gmail.com');
    console.log('Password: 123456');
    console.log('Role: ADMIN');
  });

  it('should verify admin user can be retrieved', async () => {
    // First ensure admin user exists
    const adminEmail = 'airamito11@gmail.com';
    
    let existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, adminEmail))
      .execute();

    if (existingUsers.length === 0) {
      const adminUserData: CreateUserInput = {
        email: adminEmail,
        password: '123456',
        role: 'ADMIN'
      };
      await createUser(adminUserData);
      
      existingUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.email, adminEmail))
        .execute();
    }

    // Verify the admin user exists and has correct properties
    expect(existingUsers.length).toEqual(1);
    const adminUser = existingUsers[0];
    
    expect(adminUser.email).toEqual(adminEmail);
    expect(adminUser.role).toEqual('ADMIN');
    expect(adminUser.is_active).toEqual(true);
    expect(adminUser.password_hash).toBeDefined();
    
    console.log('✅ Admin user verification successful');
  });
});