
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, staffTable, activitiesTable } from '../db/schema';
import { type CreateActivityInput, type CreateUserInput, type CreateStaffInput } from '../schema';
import { 
  createActivity, 
  getAllActivities, 
  getActivityById, 
  updateActivity, 
  updateActivityStatus 
} from '../handlers/activities';
import { eq } from 'drizzle-orm';

// Test data
const testUserInput: CreateUserInput = {
  email: 'staff@test.com',
  password: 'password123',
  role: 'STAFF'
};

const testStaffInput: CreateStaffInput = {
  user_id: 1, // Will be set after user creation
  full_name: 'John Staff',
  position: 'Coordinator',
  phone: '123-456-7890',
  address: '123 Main St',
  hire_date: new Date('2024-01-01'),
  photo_url: 'https://example.com/photo.jpg'
};

const testActivityInput: CreateActivityInput = {
  title: 'Test Activity',
  description: 'A test activity for children',
  activity_date: new Date('2024-12-25'),
  location: 'Main Hall',
  max_participants: 20,
  created_by: 1 // Will be set after staff creation
};

describe('Activity Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testStaffId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserInput.email,
        password_hash: 'hashed_password',
        role: testUserInput.role
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create test staff - convert Date to string for hire_date
    const staffResult = await db.insert(staffTable)
      .values({
        user_id: testUserId,
        full_name: testStaffInput.full_name,
        position: testStaffInput.position,
        phone: testStaffInput.phone || null,
        address: testStaffInput.address || null,
        hire_date: '2024-01-01', // Convert Date to string
        photo_url: testStaffInput.photo_url || null
      })
      .returning()
      .execute();
    
    testStaffId = staffResult[0].id;

    // Update activity input with correct staff ID
    testActivityInput.created_by = testStaffId;
  });

  describe('createActivity', () => {
    it('should create an activity', async () => {
      const result = await createActivity(testActivityInput);

      expect(result.title).toEqual('Test Activity');
      expect(result.description).toEqual(testActivityInput.description || null);
      expect(result.activity_date).toEqual(testActivityInput.activity_date);
      expect(result.location).toEqual(testActivityInput.location || null);
      expect(result.status).toEqual('PLANNED');
      expect(result.max_participants).toEqual(20);
      expect(result.created_by).toEqual(testStaffId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save activity to database', async () => {
      const result = await createActivity(testActivityInput);

      const activities = await db.select()
        .from(activitiesTable)
        .where(eq(activitiesTable.id, result.id))
        .execute();

      expect(activities).toHaveLength(1);
      expect(activities[0].title).toEqual('Test Activity');
      expect(activities[0].description).toEqual(testActivityInput.description || null);
      expect(activities[0].status).toEqual('PLANNED');
      expect(activities[0].max_participants).toEqual(20);
    });

    it('should throw error when staff does not exist', async () => {
      const invalidInput = { ...testActivityInput, created_by: 999 };

      expect(createActivity(invalidInput)).rejects.toThrow(/staff.*not found/i);
    });

    it('should handle optional fields', async () => {
      const minimalInput: CreateActivityInput = {
        title: 'Minimal Activity',
        activity_date: new Date('2024-12-25'),
        created_by: testStaffId
      };

      const result = await createActivity(minimalInput);

      expect(result.title).toEqual('Minimal Activity');
      expect(result.description).toBeNull();
      expect(result.location).toBeNull();
      expect(result.max_participants).toBeNull();
      expect(result.status).toEqual('PLANNED');
    });
  });

  describe('getAllActivities', () => {
    it('should return empty array when no activities exist', async () => {
      const result = await getAllActivities();
      expect(result).toEqual([]);
    });

    it('should return all activities', async () => {
      // Create test activities
      await createActivity(testActivityInput);
      await createActivity({
        ...testActivityInput,
        title: 'Second Activity'
      });

      const result = await getAllActivities();

      expect(result).toHaveLength(2);
      expect(result[0].title).toEqual('Test Activity');
      expect(result[1].title).toEqual('Second Activity');
    });
  });

  describe('getActivityById', () => {
    it('should return null when activity does not exist', async () => {
      const result = await getActivityById(999);
      expect(result).toBeNull();
    });

    it('should return activity when it exists', async () => {
      const created = await createActivity(testActivityInput);
      const result = await getActivityById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.title).toEqual('Test Activity');
      expect(result!.description).toEqual(testActivityInput.description || null);
    });
  });

  describe('updateActivity', () => {
    it('should return null when activity does not exist', async () => {
      const result = await updateActivity(999, { title: 'Updated' });
      expect(result).toBeNull();
    });

    it('should update activity fields', async () => {
      const created = await createActivity(testActivityInput);
      
      const updateData = {
        title: 'Updated Activity',
        description: 'Updated description',
        location: 'New Location'
      };

      const result = await updateActivity(created.id, updateData);

      expect(result).not.toBeNull();
      expect(result!.title).toEqual('Updated Activity');
      expect(result!.description).toEqual('Updated description');
      expect(result!.location).toEqual('New Location');
      expect(result!.activity_date).toEqual(created.activity_date);
      expect(result!.updated_at > created.updated_at).toBe(true);
    });

    it('should handle partial updates', async () => {
      const created = await createActivity(testActivityInput);
      
      const result = await updateActivity(created.id, { title: 'New Title' });

      expect(result).not.toBeNull();
      expect(result!.title).toEqual('New Title');
      expect(result!.description).toEqual(created.description);
      expect(result!.location).toEqual(created.location);
    });

    it('should throw error when updating with invalid staff', async () => {
      const created = await createActivity(testActivityInput);
      
      expect(updateActivity(created.id, { created_by: 999 })).rejects.toThrow(/staff.*not found/i);
    });
  });

  describe('updateActivityStatus', () => {
    it('should return null when activity does not exist', async () => {
      const result = await updateActivityStatus(999, 'COMPLETED');
      expect(result).toBeNull();
    });

    it('should update activity status', async () => {
      const created = await createActivity(testActivityInput);
      
      const result = await updateActivityStatus(created.id, 'COMPLETED');

      expect(result).not.toBeNull();
      expect(result!.status).toEqual('COMPLETED');
      expect(result!.title).toEqual(created.title);
      expect(result!.updated_at > created.updated_at).toBe(true);
    });

    it('should update status to all valid values', async () => {
      const created = await createActivity(testActivityInput);
      
      const statuses: Array<'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'> = 
        ['ONGOING', 'COMPLETED', 'CANCELLED', 'PLANNED'];

      for (const status of statuses) {
        const result = await updateActivityStatus(created.id, status);
        expect(result!.status).toEqual(status);
      }
    });
  });
});
