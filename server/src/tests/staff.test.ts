
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, staffTable } from '../db/schema';
import { type CreateStaffInput } from '../schema';
import { createStaff, getAllStaff, getStaffById, getStaffByUserId, updateStaff } from '../handlers/staff';
import { eq } from 'drizzle-orm';

describe('Staff handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let nonStaffUser: any;

  beforeEach(async () => {
    // Create test users
    const passwordHash = 'hashedpassword123';
    
    const staffUserResult = await db.insert(usersTable)
      .values({
        email: 'staff@test.com',
        password_hash: passwordHash,
        role: 'STAFF'
      })
      .returning()
      .execute();
    testUser = staffUserResult[0];

    const donorUserResult = await db.insert(usersTable)
      .values({
        email: 'donor@test.com',
        password_hash: passwordHash,
        role: 'DONOR'
      })
      .returning()
      .execute();
    nonStaffUser = donorUserResult[0];
  });

  describe('createStaff', () => {
    const testInput: CreateStaffInput = {
      user_id: 0, // Will be set to testUser.id
      full_name: 'John Doe',
      position: 'Care Worker',
      phone: '+1234567890',
      address: '123 Main St',
      hire_date: new Date('2024-01-01'),
      photo_url: 'https://example.com/photo.jpg'
    };

    it('should create a staff record', async () => {
      const input = { ...testInput, user_id: testUser.id };
      const result = await createStaff(input);

      expect(result.user_id).toEqual(testUser.id);
      expect(result.full_name).toEqual('John Doe');
      expect(result.position).toEqual('Care Worker');
      expect(result.phone).toEqual('+1234567890');
      expect(result.address).toEqual('123 Main St');
      expect(result.hire_date).toEqual(new Date('2024-01-01'));
      expect(result.photo_url).toEqual('https://example.com/photo.jpg');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save staff to database', async () => {
      const input = { ...testInput, user_id: testUser.id };
      const result = await createStaff(input);

      const staffRecords = await db.select()
        .from(staffTable)
        .where(eq(staffTable.id, result.id))
        .execute();

      expect(staffRecords).toHaveLength(1);
      expect(staffRecords[0].user_id).toEqual(testUser.id);
      expect(staffRecords[0].full_name).toEqual('John Doe');
      expect(staffRecords[0].position).toEqual('Care Worker');
      expect(staffRecords[0].hire_date).toEqual('2024-01-01'); // Date column stores as string
    });

    it('should handle optional fields', async () => {
      const minimalInput: CreateStaffInput = {
        user_id: testUser.id,
        full_name: 'Jane Doe',
        position: 'Teacher',
        hire_date: new Date('2024-02-01')
      };

      const result = await createStaff(minimalInput);

      expect(result.full_name).toEqual('Jane Doe');
      expect(result.position).toEqual('Teacher');
      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
      expect(result.photo_url).toBeNull();
      expect(result.hire_date).toEqual(new Date('2024-02-01'));
    });

    it('should reject non-existent user', async () => {
      const input = { ...testInput, user_id: 999999 };

      await expect(createStaff(input)).rejects.toThrow(/user not found/i);
    });

    it('should reject user without STAFF role', async () => {
      const input = { ...testInput, user_id: nonStaffUser.id };

      await expect(createStaff(input)).rejects.toThrow(/user must have staff role/i);
    });

    it('should reject duplicate staff record for same user', async () => {
      const input = { ...testInput, user_id: testUser.id };

      // Create first staff record
      await createStaff(input);

      // Attempt to create second staff record for same user
      await expect(createStaff(input)).rejects.toThrow(/staff record already exists/i);
    });
  });

  describe('getAllStaff', () => {
    it('should return empty array when no staff exist', async () => {
      const result = await getAllStaff();

      expect(result).toEqual([]);
    });

    it('should return all staff records', async () => {
      // Create multiple staff records
      const input1: CreateStaffInput = {
        user_id: testUser.id,
        full_name: 'John Doe',
        position: 'Care Worker',
        hire_date: new Date('2024-01-01')
      };

      await createStaff(input1);

      // Create another user and staff
      const passwordHash = 'hashedpassword123';
      const anotherUserResult = await db.insert(usersTable)
        .values({
          email: 'staff2@test.com',
          password_hash: passwordHash,
          role: 'STAFF'
        })
        .returning()
        .execute();

      const input2: CreateStaffInput = {
        user_id: anotherUserResult[0].id,
        full_name: 'Jane Smith',
        position: 'Teacher',
        hire_date: new Date('2024-02-01')
      };

      await createStaff(input2);

      const result = await getAllStaff();

      expect(result).toHaveLength(2);
      expect(result.map(s => s.full_name)).toContain('John Doe');
      expect(result.map(s => s.full_name)).toContain('Jane Smith');
      
      // Verify dates are properly converted
      result.forEach(staff => {
        expect(staff.hire_date).toBeInstanceOf(Date);
      });
    });
  });

  describe('getStaffById', () => {
    it('should return null for non-existent staff', async () => {
      const result = await getStaffById(999999);

      expect(result).toBeNull();
    });

    it('should return staff by ID', async () => {
      const input: CreateStaffInput = {
        user_id: testUser.id,
        full_name: 'John Doe',
        position: 'Care Worker',
        hire_date: new Date('2024-01-01')
      };

      const created = await createStaff(input);
      const result = await getStaffById(created.id);

      expect(result).toBeDefined();
      expect(result!.id).toEqual(created.id);
      expect(result!.full_name).toEqual('John Doe');
      expect(result!.position).toEqual('Care Worker');
      expect(result!.hire_date).toBeInstanceOf(Date);
      expect(result!.hire_date).toEqual(new Date('2024-01-01'));
    });
  });

  describe('getStaffByUserId', () => {
    it('should return null for non-existent user', async () => {
      const result = await getStaffByUserId(999999);

      expect(result).toBeNull();
    });

    it('should return staff by user ID', async () => {
      const input: CreateStaffInput = {
        user_id: testUser.id,
        full_name: 'John Doe',
        position: 'Care Worker',
        hire_date: new Date('2024-01-01')
      };

      await createStaff(input);
      const result = await getStaffByUserId(testUser.id);

      expect(result).toBeDefined();
      expect(result!.user_id).toEqual(testUser.id);
      expect(result!.full_name).toEqual('John Doe');
      expect(result!.hire_date).toBeInstanceOf(Date);
    });
  });

  describe('updateStaff', () => {
    let existingStaff: any;

    beforeEach(async () => {
      const input: CreateStaffInput = {
        user_id: testUser.id,
        full_name: 'John Doe',
        position: 'Care Worker',
        hire_date: new Date('2024-01-01')
      };
      existingStaff = await createStaff(input);
    });

    it('should return null for non-existent staff', async () => {
      const result = await updateStaff(999999, { full_name: 'Updated Name' });

      expect(result).toBeNull();
    });

    it('should update staff fields', async () => {
      const updateInput = {
        full_name: 'John Updated',
        position: 'Senior Care Worker',
        phone: '+9876543210'
      };

      const result = await updateStaff(existingStaff.id, updateInput);

      expect(result).toBeDefined();
      expect(result!.full_name).toEqual('John Updated');
      expect(result!.position).toEqual('Senior Care Worker');
      expect(result!.phone).toEqual('+9876543210');
      expect(result!.updated_at).toBeInstanceOf(Date);
      expect(result!.hire_date).toBeInstanceOf(Date);
    });

    it('should update hire_date correctly', async () => {
      const newHireDate = new Date('2024-03-01');
      const result = await updateStaff(existingStaff.id, { hire_date: newHireDate });

      expect(result!.hire_date).toEqual(newHireDate);
    });

    it('should update user_id if valid', async () => {
      // Create another staff user
      const passwordHash = 'hashedpassword123';
      const newUserResult = await db.insert(usersTable)
        .values({
          email: 'newstaff@test.com',
          password_hash: passwordHash,
          role: 'STAFF'
        })
        .returning()
        .execute();

      const result = await updateStaff(existingStaff.id, { user_id: newUserResult[0].id });

      expect(result!.user_id).toEqual(newUserResult[0].id);
    });

    it('should reject update with non-existent user_id', async () => {
      await expect(updateStaff(existingStaff.id, { user_id: 999999 }))
        .rejects.toThrow(/user not found/i);
    });

    it('should reject update with non-STAFF user', async () => {
      await expect(updateStaff(existingStaff.id, { user_id: nonStaffUser.id }))
        .rejects.toThrow(/user must have staff role/i);
    });

    it('should reject update with user_id that already has staff record', async () => {
      // Create another staff record
      const passwordHash = 'hashedpassword123';
      const anotherUserResult = await db.insert(usersTable)
        .values({
          email: 'staff3@test.com',
          password_hash: passwordHash,
          role: 'STAFF'
        })
        .returning()
        .execute();

      const anotherStaffInput: CreateStaffInput = {
        user_id: anotherUserResult[0].id,
        full_name: 'Jane Smith',
        position: 'Teacher',
        hire_date: new Date('2024-02-01')
      };

      await createStaff(anotherStaffInput);

      // Try to update first staff to use the second user's ID
      await expect(updateStaff(existingStaff.id, { user_id: anotherUserResult[0].id }))
        .rejects.toThrow(/staff record already exists/i);
    });
  });
});
