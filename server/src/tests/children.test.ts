
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, childrenTable } from '../db/schema';
import { type CreateChildInput } from '../schema';
import { 
  createChild, 
  getAllChildren, 
  getChildById, 
  updateChild, 
  getChildByUserId 
} from '../handlers/children';
import { eq } from 'drizzle-orm';

describe('Children handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userCounter = 0;
  const createTestUser = async (role: 'CHILD' | 'ADMIN' | 'STAFF' | 'DONOR' = 'CHILD') => {
    userCounter++;
    const result = await db.insert(usersTable)
      .values({
        email: `test-${role.toLowerCase()}-${userCounter}@example.com`,
        password_hash: 'hashedpassword',
        role: role,
        is_active: true
      })
      .returning()
      .execute();
    return result[0];
  };

  const testChildInput: CreateChildInput = {
    user_id: 1,
    full_name: 'Test Child',
    date_of_birth: new Date('2015-01-01'),
    gender: 'MALE',
    admission_date: new Date('2020-01-01'),
    health_status: 'Good',
    education_level: 'Grade 3',
    photo_url: 'https://example.com/photo.jpg',
    background_story: 'A test child story'
  };

  describe('createChild', () => {
    it('should create a child successfully', async () => {
      const user = await createTestUser('CHILD');
      const input = { ...testChildInput, user_id: user.id };

      const result = await createChild(input);

      expect(result.user_id).toEqual(user.id);
      expect(result.full_name).toEqual('Test Child');
      expect(result.date_of_birth).toEqual(new Date('2015-01-01'));
      expect(result.gender).toEqual('MALE');
      expect(result.admission_date).toEqual(new Date('2020-01-01'));
      expect(result.health_status).toEqual('Good');
      expect(result.education_level).toEqual('Grade 3');
      expect(result.photo_url).toEqual('https://example.com/photo.jpg');
      expect(result.background_story).toEqual('A test child story');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create child with minimal required fields', async () => {
      const user = await createTestUser('CHILD');
      const minimalInput: CreateChildInput = {
        user_id: user.id,
        full_name: 'Minimal Child',
        date_of_birth: new Date('2016-06-01'),
        gender: 'FEMALE',
        admission_date: new Date('2021-01-01')
      };

      const result = await createChild(minimalInput);

      expect(result.full_name).toEqual('Minimal Child');
      expect(result.gender).toEqual('FEMALE');
      expect(result.health_status).toBeNull();
      expect(result.education_level).toBeNull();
      expect(result.photo_url).toBeNull();
      expect(result.background_story).toBeNull();
    });

    it('should throw error if user does not exist', async () => {
      const input = { ...testChildInput, user_id: 999 };

      await expect(createChild(input)).rejects.toThrow(/user not found/i);
    });

    it('should throw error if user does not have CHILD role', async () => {
      const user = await createTestUser('ADMIN');
      const input = { ...testChildInput, user_id: user.id };

      await expect(createChild(input)).rejects.toThrow(/user must have child role/i);
    });

    it('should save child to database', async () => {
      const user = await createTestUser('CHILD');
      const input = { ...testChildInput, user_id: user.id };

      const result = await createChild(input);

      const savedChild = await db.select()
        .from(childrenTable)
        .where(eq(childrenTable.id, result.id))
        .execute();

      expect(savedChild).toHaveLength(1);
      expect(savedChild[0].full_name).toEqual('Test Child');
      expect(savedChild[0].user_id).toEqual(user.id);
      expect(savedChild[0].date_of_birth).toEqual('2015-01-01'); // Database stores as string
      expect(savedChild[0].admission_date).toEqual('2020-01-01'); // Database stores as string
    });
  });

  describe('getAllChildren', () => {
    it('should return empty array when no children exist', async () => {
      const result = await getAllChildren();
      expect(result).toEqual([]);
    });

    it('should return all children', async () => {
      const user1 = await createTestUser('CHILD');
      const user2 = await createTestUser('CHILD');
      
      await createChild({ ...testChildInput, user_id: user1.id, full_name: 'Child One' });
      await createChild({ ...testChildInput, user_id: user2.id, full_name: 'Child Two' });

      const result = await getAllChildren();

      expect(result).toHaveLength(2);
      expect(result.map(c => c.full_name).sort()).toEqual(['Child One', 'Child Two']);
      result.forEach(child => {
        expect(child.date_of_birth).toBeInstanceOf(Date);
        expect(child.admission_date).toBeInstanceOf(Date);
      });
    });
  });

  describe('getChildById', () => {
    it('should return null when child does not exist', async () => {
      const result = await getChildById(999);
      expect(result).toBeNull();
    });

    it('should return child when it exists', async () => {
      const user = await createTestUser('CHILD');
      const createdChild = await createChild({ ...testChildInput, user_id: user.id });

      const result = await getChildById(createdChild.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdChild.id);
      expect(result!.full_name).toEqual('Test Child');
      expect(result!.date_of_birth).toBeInstanceOf(Date);
      expect(result!.admission_date).toBeInstanceOf(Date);
    });
  });

  describe('updateChild', () => {
    it('should return null when child does not exist', async () => {
      const result = await updateChild(999, { full_name: 'Updated Name' });
      expect(result).toBeNull();
    });

    it('should update child successfully', async () => {
      const user = await createTestUser('CHILD');
      const createdChild = await createChild({ ...testChildInput, user_id: user.id });

      const updateData = {
        full_name: 'Updated Child Name',
        health_status: 'Excellent'
      };

      const result = await updateChild(createdChild.id, updateData);

      expect(result).not.toBeNull();
      expect(result!.full_name).toEqual('Updated Child Name');
      expect(result!.health_status).toEqual('Excellent');
      expect(result!.gender).toEqual('MALE'); // Original value preserved
      expect(result!.date_of_birth).toBeInstanceOf(Date);
      expect(result!.admission_date).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should update date fields correctly', async () => {
      const user = await createTestUser('CHILD');
      const createdChild = await createChild({ ...testChildInput, user_id: user.id });

      const newDateOfBirth = new Date('2014-05-15');
      const result = await updateChild(createdChild.id, { 
        date_of_birth: newDateOfBirth 
      });

      expect(result).not.toBeNull();
      expect(result!.date_of_birth).toEqual(newDateOfBirth);
    });

    it('should validate user_id when updating', async () => {
      const user1 = await createTestUser('CHILD');
      const user2 = await createTestUser('ADMIN');
      const createdChild = await createChild({ ...testChildInput, user_id: user1.id });

      await expect(updateChild(createdChild.id, { user_id: user2.id }))
        .rejects.toThrow(/user must have child role/i);
    });

    it('should throw error when updating with non-existent user_id', async () => {
      const user = await createTestUser('CHILD');
      const createdChild = await createChild({ ...testChildInput, user_id: user.id });

      await expect(updateChild(createdChild.id, { user_id: 999 }))
        .rejects.toThrow(/user not found/i);
    });

    it('should allow updating to another valid CHILD user', async () => {
      const user1 = await createTestUser('CHILD');
      const user2 = await createTestUser('CHILD');
      const createdChild = await createChild({ ...testChildInput, user_id: user1.id });

      const result = await updateChild(createdChild.id, { user_id: user2.id });

      expect(result).not.toBeNull();
      expect(result!.user_id).toEqual(user2.id);
    });
  });

  describe('getChildByUserId', () => {
    it('should return null when no child exists for user', async () => {
      const user = await createTestUser('CHILD');
      const result = await getChildByUserId(user.id);
      expect(result).toBeNull();
    });

    it('should return child when it exists for user', async () => {
      const user = await createTestUser('CHILD');
      const createdChild = await createChild({ ...testChildInput, user_id: user.id });

      const result = await getChildByUserId(user.id);

      expect(result).not.toBeNull();
      expect(result!.user_id).toEqual(user.id);
      expect(result!.full_name).toEqual('Test Child');
      expect(result!.id).toEqual(createdChild.id);
      expect(result!.date_of_birth).toBeInstanceOf(Date);
      expect(result!.admission_date).toBeInstanceOf(Date);
    });
  });
});
