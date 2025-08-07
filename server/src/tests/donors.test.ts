
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, donorsTable } from '../db/schema';
import { type CreateUserInput, type CreateDonorInput } from '../schema';
import { createDonor, getAllDonors, getDonorById, getDonorByUserId, updateDonor } from '../handlers/donors';
import { eq } from 'drizzle-orm';

// Test data
const testUserInput: CreateUserInput = {
  email: 'donor@test.com',
  password: 'password123',
  role: 'DONOR'
};

const testDonorInput: CreateDonorInput = {
  user_id: 1, // Will be set after user creation
  full_name: 'Test Donor',
  phone: '+1234567890',
  address: '123 Test Street',
  organization: 'Test Organization'
};

describe('Donors Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createDonor', () => {
    it('should create a donor', async () => {
      // Create user first
      const passwordHash = await Bun.password.hash(testUserInput.password);
      const userResult = await db.insert(usersTable)
        .values({
          email: testUserInput.email,
          password_hash: passwordHash,
          role: testUserInput.role
        })
        .returning()
        .execute();

      const donorInput = { ...testDonorInput, user_id: userResult[0].id };
      const result = await createDonor(donorInput);

      expect(result.user_id).toEqual(userResult[0].id);
      expect(result.full_name).toEqual('Test Donor');
      expect(result.phone).toEqual('+1234567890');
      expect(result.address).toEqual('123 Test Street');
      expect(result.organization).toEqual('Test Organization');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save donor to database', async () => {
      // Create user first
      const passwordHash = await Bun.password.hash(testUserInput.password);
      const userResult = await db.insert(usersTable)
        .values({
          email: testUserInput.email,
          password_hash: passwordHash,
          role: testUserInput.role
        })
        .returning()
        .execute();

      const donorInput = { ...testDonorInput, user_id: userResult[0].id };
      const result = await createDonor(donorInput);

      const donors = await db.select()
        .from(donorsTable)
        .where(eq(donorsTable.id, result.id))
        .execute();

      expect(donors).toHaveLength(1);
      expect(donors[0].full_name).toEqual('Test Donor');
      expect(donors[0].phone).toEqual('+1234567890');
      expect(donors[0].address).toEqual('123 Test Street');
      expect(donors[0].organization).toEqual('Test Organization');
    });

    it('should create donor with minimal required fields', async () => {
      // Create user first
      const passwordHash = await Bun.password.hash(testUserInput.password);
      const userResult = await db.insert(usersTable)
        .values({
          email: testUserInput.email,
          password_hash: passwordHash,
          role: testUserInput.role
        })
        .returning()
        .execute();

      const minimalInput: CreateDonorInput = {
        user_id: userResult[0].id,
        full_name: 'Minimal Donor'
      };

      const result = await createDonor(minimalInput);

      expect(result.full_name).toEqual('Minimal Donor');
      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
      expect(result.organization).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      const invalidInput = { ...testDonorInput, user_id: 999 };
      
      await expect(createDonor(invalidInput)).rejects.toThrow(/User not found/i);
    });

    it('should throw error for user with wrong role', async () => {
      // Create user with ADMIN role
      const passwordHash = await Bun.password.hash('password123');
      const userResult = await db.insert(usersTable)
        .values({
          email: 'admin@test.com',
          password_hash: passwordHash,
          role: 'ADMIN'
        })
        .returning()
        .execute();

      const invalidInput = { ...testDonorInput, user_id: userResult[0].id };
      
      await expect(createDonor(invalidInput)).rejects.toThrow(/User not found or does not have DONOR role/i);
    });

    it('should throw error for duplicate donor profile', async () => {
      // Create user
      const passwordHash = await Bun.password.hash(testUserInput.password);
      const userResult = await db.insert(usersTable)
        .values({
          email: testUserInput.email,
          password_hash: passwordHash,
          role: testUserInput.role
        })
        .returning()
        .execute();

      const donorInput = { ...testDonorInput, user_id: userResult[0].id };
      
      // Create first donor
      await createDonor(donorInput);
      
      // Attempt to create second donor for same user
      await expect(createDonor(donorInput)).rejects.toThrow(/Donor profile already exists/i);
    });
  });

  describe('getAllDonors', () => {
    it('should return empty array when no donors exist', async () => {
      const result = await getAllDonors();
      expect(result).toEqual([]);
    });

    it('should return all donors', async () => {
      // Create multiple users and donors
      for (let i = 0; i < 3; i++) {
        const passwordHash = await Bun.password.hash('password123');
        const userResult = await db.insert(usersTable)
          .values({
            email: `donor${i}@test.com`,
            password_hash: passwordHash,
            role: 'DONOR'
          })
          .returning()
          .execute();

        await createDonor({
          user_id: userResult[0].id,
          full_name: `Donor ${i}`,
          phone: `+123456789${i}`,
          address: `${i} Test Street`,
          organization: `Organization ${i}`
        });
      }

      const result = await getAllDonors();
      expect(result).toHaveLength(3);
      expect(result[0].full_name).toEqual('Donor 0');
      expect(result[1].full_name).toEqual('Donor 1');
      expect(result[2].full_name).toEqual('Donor 2');
    });
  });

  describe('getDonorById', () => {
    it('should return donor by ID', async () => {
      // Create user and donor
      const passwordHash = await Bun.password.hash(testUserInput.password);
      const userResult = await db.insert(usersTable)
        .values({
          email: testUserInput.email,
          password_hash: passwordHash,
          role: testUserInput.role
        })
        .returning()
        .execute();

      const donorInput = { ...testDonorInput, user_id: userResult[0].id };
      const createdDonor = await createDonor(donorInput);

      const result = await getDonorById(createdDonor.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdDonor.id);
      expect(result!.full_name).toEqual('Test Donor');
    });

    it('should return null for non-existent donor', async () => {
      const result = await getDonorById(999);
      expect(result).toBeNull();
    });
  });

  describe('getDonorByUserId', () => {
    it('should return donor by user ID', async () => {
      // Create user and donor
      const passwordHash = await Bun.password.hash(testUserInput.password);
      const userResult = await db.insert(usersTable)
        .values({
          email: testUserInput.email,
          password_hash: passwordHash,
          role: testUserInput.role
        })
        .returning()
        .execute();

      const donorInput = { ...testDonorInput, user_id: userResult[0].id };
      await createDonor(donorInput);

      const result = await getDonorByUserId(userResult[0].id);

      expect(result).not.toBeNull();
      expect(result!.user_id).toEqual(userResult[0].id);
      expect(result!.full_name).toEqual('Test Donor');
    });

    it('should return null for non-existent user donor', async () => {
      const result = await getDonorByUserId(999);
      expect(result).toBeNull();
    });
  });

  describe('updateDonor', () => {
    it('should update donor information', async () => {
      // Create user and donor
      const passwordHash = await Bun.password.hash(testUserInput.password);
      const userResult = await db.insert(usersTable)
        .values({
          email: testUserInput.email,
          password_hash: passwordHash,
          role: testUserInput.role
        })
        .returning()
        .execute();

      const donorInput = { ...testDonorInput, user_id: userResult[0].id };
      const createdDonor = await createDonor(donorInput);

      const updateData = {
        full_name: 'Updated Donor Name',
        phone: '+0987654321',
        address: '456 Updated Street',
        organization: 'Updated Organization'
      };

      const result = await updateDonor(createdDonor.id, updateData);

      expect(result).not.toBeNull();
      expect(result!.full_name).toEqual('Updated Donor Name');
      expect(result!.phone).toEqual('+0987654321');
      expect(result!.address).toEqual('456 Updated Street');
      expect(result!.organization).toEqual('Updated Organization');
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should update partial donor information', async () => {
      // Create user and donor
      const passwordHash = await Bun.password.hash(testUserInput.password);
      const userResult = await db.insert(usersTable)
        .values({
          email: testUserInput.email,
          password_hash: passwordHash,
          role: testUserInput.role
        })
        .returning()
        .execute();

      const donorInput = { ...testDonorInput, user_id: userResult[0].id };
      const createdDonor = await createDonor(donorInput);

      const updateData = {
        full_name: 'Partially Updated Name'
      };

      const result = await updateDonor(createdDonor.id, updateData);

      expect(result).not.toBeNull();
      expect(result!.full_name).toEqual('Partially Updated Name');
      expect(result!.phone).toEqual('+1234567890'); // Should remain unchanged
      expect(result!.address).toEqual('123 Test Street'); // Should remain unchanged
      expect(result!.organization).toEqual('Test Organization'); // Should remain unchanged
    });

    it('should return null for non-existent donor', async () => {
      const updateData = { full_name: 'Updated Name' };
      const result = await updateDonor(999, updateData);
      expect(result).toBeNull();
    });
  });
});
