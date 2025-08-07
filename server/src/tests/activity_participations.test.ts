
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, childrenTable, staffTable, activitiesTable, activityParticipationsTable } from '../db/schema';
import { type CreateActivityParticipationInput } from '../schema';
import { 
  createActivityParticipation,
  getParticipationsByActivityId,
  getParticipationsByChildId,
  updateParticipationStatus,
  removeActivityParticipation
} from '../handlers/activity_participations';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'child@test.com',
  password_hash: 'hashed_password',
  role: 'CHILD' as const
};

const testStaffUser = {
  email: 'staff@test.com',
  password_hash: 'hashed_password',
  role: 'STAFF' as const
};

const testChild = {
  user_id: 1,
  full_name: 'Test Child',
  date_of_birth: '2015-01-01',
  gender: 'MALE' as const,
  admission_date: '2023-01-01'
};

const testStaff = {
  user_id: 2,
  full_name: 'Test Staff',
  position: 'Coordinator',
  hire_date: '2023-01-01'
};

const testActivity = {
  title: 'Test Activity',
  description: 'A test activity',
  activity_date: new Date('2024-06-01'),
  location: 'Test Location',
  status: 'PLANNED' as const,
  max_participants: 5,
  created_by: 1
};

const testParticipation: CreateActivityParticipationInput = {
  activity_id: 1,
  child_id: 1,
  status: 'REGISTERED',
  notes: 'Test participation'
};

describe('Activity Participations', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite data
    const users = await db.insert(usersTable)
      .values([testUser, testStaffUser])
      .returning()
      .execute();

    await db.insert(childrenTable)
      .values({ ...testChild, user_id: users[0].id })
      .execute();

    await db.insert(staffTable)
      .values({ ...testStaff, user_id: users[1].id })
      .execute();

    await db.insert(activitiesTable)
      .values(testActivity)
      .execute();
  });

  afterEach(resetDB);

  describe('createActivityParticipation', () => {
    it('should create an activity participation', async () => {
      const result = await createActivityParticipation(testParticipation);

      expect(result.activity_id).toEqual(1);
      expect(result.child_id).toEqual(1);
      expect(result.status).toEqual('REGISTERED');
      expect(result.notes).toEqual('Test participation');
      expect(result.id).toBeDefined();
      expect(result.registered_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save participation to database', async () => {
      const result = await createActivityParticipation(testParticipation);

      const participations = await db.select()
        .from(activityParticipationsTable)
        .where(eq(activityParticipationsTable.id, result.id))
        .execute();

      expect(participations).toHaveLength(1);
      expect(participations[0].activity_id).toEqual(1);
      expect(participations[0].child_id).toEqual(1);
      expect(participations[0].status).toEqual('REGISTERED');
    });

    it('should throw error if activity does not exist', async () => {
      const invalidInput = { ...testParticipation, activity_id: 999 };

      await expect(createActivityParticipation(invalidInput))
        .rejects.toThrow(/activity with id 999 does not exist/i);
    });

    it('should throw error if child does not exist', async () => {
      const invalidInput = { ...testParticipation, child_id: 999 };

      await expect(createActivityParticipation(invalidInput))
        .rejects.toThrow(/child with id 999 does not exist/i);
    });

    it('should throw error if child already registered', async () => {
      await createActivityParticipation(testParticipation);

      await expect(createActivityParticipation(testParticipation))
        .rejects.toThrow(/child is already registered/i);
    });

    it('should enforce max participants limit', async () => {
      // Create activity with max 1 participant
      const limitedActivity = {
        ...testActivity,
        max_participants: 1,
        created_by: 1
      };

      const activityResult = await db.insert(activitiesTable)
        .values(limitedActivity)
        .returning()
        .execute();

      // First registration should succeed
      const firstParticipation = {
        ...testParticipation,
        activity_id: activityResult[0].id
      };
      await createActivityParticipation(firstParticipation);

      // Create second child
      const secondUser = await db.insert(usersTable)
        .values({ ...testUser, email: 'child2@test.com' })
        .returning()
        .execute();

      await db.insert(childrenTable)
        .values({ ...testChild, user_id: secondUser[0].id, full_name: 'Test Child 2' })
        .returning()
        .execute();

      // Second registration should fail
      const secondParticipation = {
        ...testParticipation,
        activity_id: activityResult[0].id,
        child_id: 2
      };

      await expect(createActivityParticipation(secondParticipation))
        .rejects.toThrow(/maximum participant limit/i);
    });

    it('should allow unlimited participants when max_participants is null', async () => {
      // Create activity with no limit
      const unlimitedActivity = {
        ...testActivity,
        max_participants: null,
        created_by: 1
      };

      const activityResult = await db.insert(activitiesTable)
        .values(unlimitedActivity)
        .returning()
        .execute();

      const participation = {
        ...testParticipation,
        activity_id: activityResult[0].id
      };

      const result = await createActivityParticipation(participation);
      expect(result.activity_id).toEqual(activityResult[0].id);
    });
  });

  describe('getParticipationsByActivityId', () => {
    it('should return empty array for activity with no participants', async () => {
      const results = await getParticipationsByActivityId(1);
      expect(results).toHaveLength(0);
    });

    it('should return participations for activity', async () => {
      await createActivityParticipation(testParticipation);

      const results = await getParticipationsByActivityId(1);
      expect(results).toHaveLength(1);
      expect(results[0].activity_id).toEqual(1);
      expect(results[0].child_id).toEqual(1);
    });

    it('should return multiple participations for same activity', async () => {
      // Create second child
      const secondUser = await db.insert(usersTable)
        .values({ ...testUser, email: 'child2@test.com' })
        .returning()
        .execute();

      await db.insert(childrenTable)
        .values({ ...testChild, user_id: secondUser[0].id, full_name: 'Test Child 2' })
        .returning()
        .execute();

      // Create participations
      await createActivityParticipation(testParticipation);
      await createActivityParticipation({
        ...testParticipation,
        child_id: 2
      });

      const results = await getParticipationsByActivityId(1);
      expect(results).toHaveLength(2);
    });
  });

  describe('getParticipationsByChildId', () => {
    it('should return empty array for child with no participations', async () => {
      const results = await getParticipationsByChildId(1);
      expect(results).toHaveLength(0);
    });

    it('should return participations for child', async () => {
      await createActivityParticipation(testParticipation);

      const results = await getParticipationsByChildId(1);
      expect(results).toHaveLength(1);
      expect(results[0].activity_id).toEqual(1);
      expect(results[0].child_id).toEqual(1);
    });

    it('should return multiple participations for same child', async () => {
      // Create second activity
      const secondActivity = {
        ...testActivity,
        title: 'Second Activity',
        created_by: 1
      };

      await db.insert(activitiesTable)
        .values(secondActivity)
        .execute();

      // Create participations
      await createActivityParticipation(testParticipation);
      await createActivityParticipation({
        ...testParticipation,
        activity_id: 2
      });

      const results = await getParticipationsByChildId(1);
      expect(results).toHaveLength(2);
    });
  });

  describe('updateParticipationStatus', () => {
    it('should update participation status', async () => {
      const participation = await createActivityParticipation(testParticipation);
      
      const result = await updateParticipationStatus(participation.id, 'ATTENDED');
      
      expect(result).not.toBeNull();
      expect(result!.status).toEqual('ATTENDED');
      expect(result!.id).toEqual(participation.id);
    });

    it('should return null for non-existent participation', async () => {
      const result = await updateParticipationStatus(999, 'ATTENDED');
      expect(result).toBeNull();
    });

    it('should update the database record', async () => {
      const participation = await createActivityParticipation(testParticipation);
      
      await updateParticipationStatus(participation.id, 'ATTENDED');
      
      const updated = await db.select()
        .from(activityParticipationsTable)
        .where(eq(activityParticipationsTable.id, participation.id))
        .execute();

      expect(updated[0].status).toEqual('ATTENDED');
    });
  });

  describe('removeActivityParticipation', () => {
    it('should remove participation successfully', async () => {
      const participation = await createActivityParticipation(testParticipation);
      
      const result = await removeActivityParticipation(participation.id);
      
      expect(result.success).toBe(true);
    });

    it('should return false for non-existent participation', async () => {
      const result = await removeActivityParticipation(999);
      expect(result.success).toBe(false);
    });

    it('should remove the record from database', async () => {
      const participation = await createActivityParticipation(testParticipation);
      
      await removeActivityParticipation(participation.id);
      
      const remaining = await db.select()
        .from(activityParticipationsTable)
        .where(eq(activityParticipationsTable.id, participation.id))
        .execute();

      expect(remaining).toHaveLength(0);
    });
  });
});
