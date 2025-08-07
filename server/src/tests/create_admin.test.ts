import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { createUser } from '../handlers/users';
import type { CreateUserInput } from '../schema';

describe('createAdmin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create admin user with email airamito11@gmail.com', async () => {
    const adminUserData: CreateUserInput = {
      email: 'airamito11@gmail.com',
      password: '123456',
      role: 'ADMIN'
    };

    const result = await createUser(adminUserData);

    // Basic field validation
    expect(result.email).toEqual('airamito11@gmail.com');
    expect(result.role).toEqual('ADMIN');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('123456'); // Password should be hashed

    console.log('✅ Admin user created successfully:', {
      id: result.id,
      email: result.email,
      role: result.role,
      is_active: result.is_active,
      created_at: result.created_at
    });
  });
});