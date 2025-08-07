import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

// Direct function to create admin user without using handlers to avoid issues
async function directCreateAdmin() {
  const adminEmail = 'airamito11@gmail.com';
  const adminPassword = '123456';
  
  try {
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
      return existingUsers[0];
    }

    // Hash the password
    const password_hash = await Bun.password.hash(adminPassword);

    // Create new admin user directly
    const result = await db.insert(usersTable)
      .values({
        email: adminEmail,
        password_hash,
        role: 'ADMIN',
        is_active: true
      })
      .returning()
      .execute();

    const newAdmin = result[0];
    
    console.log('🎉 New admin user created successfully:', {
      id: newAdmin.id,
      email: newAdmin.email,
      role: newAdmin.role,
      is_active: newAdmin.is_active,
      created_at: newAdmin.created_at
    });

    console.log('\n📋 Login Credentials:');
    console.log('Email: airamito11@gmail.com');
    console.log('Password: 123456');
    console.log('Role: ADMIN');
    
    return newAdmin;

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    throw error;
  }
}

describe('Direct Admin Creation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create admin user airamito11@gmail.com directly', async () => {
    const result = await directCreateAdmin();

    // Validate the admin user
    expect(result.email).toEqual('airamito11@gmail.com');
    expect(result.role).toEqual('ADMIN');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('123456'); // Should be hashed
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should verify admin can login with correct credentials', async () => {
    const adminEmail = 'airamito11@gmail.com';
    const adminPassword = '123456';
    
    // First create the admin user
    const createdAdmin = await directCreateAdmin();
    
    // Then verify we can retrieve it and verify password
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, adminEmail))
      .execute();

    expect(users.length).toEqual(1);
    
    const adminUser = users[0];
    expect(adminUser.email).toEqual(adminEmail);
    expect(adminUser.role).toEqual('ADMIN');
    expect(adminUser.is_active).toEqual(true);
    expect(adminUser.id).toEqual(createdAdmin.id);
    
    // Verify password hash works
    const isValidPassword = await Bun.password.verify(adminPassword, adminUser.password_hash);
    expect(isValidPassword).toBe(true);
    
    console.log('✅ Admin login credentials verified successfully');
  });
});