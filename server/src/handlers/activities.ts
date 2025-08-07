
import { db } from '../db';
import { activitiesTable, staffTable } from '../db/schema';
import { type CreateActivityInput, type Activity, activityStatusEnum } from '../schema';
import { eq } from 'drizzle-orm';

export async function createActivity(input: CreateActivityInput): Promise<Activity> {
  try {
    // Verify staff exists
    const staff = await db.select()
      .from(staffTable)
      .where(eq(staffTable.id, input.created_by))
      .execute();

    if (staff.length === 0) {
      throw new Error('Staff member not found');
    }

    // Insert activity record
    const result = await db.insert(activitiesTable)
      .values({
        title: input.title,
        description: input.description || null,
        activity_date: input.activity_date,
        location: input.location || null,
        status: 'PLANNED',
        max_participants: input.max_participants || null,
        created_by: input.created_by
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Activity creation failed:', error);
    throw error;
  }
}

export async function getAllActivities(): Promise<Activity[]> {
  try {
    const results = await db.select()
      .from(activitiesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    throw error;
  }
}

export async function getActivityById(id: number): Promise<Activity | null> {
  try {
    const results = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.id, id))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    throw error;
  }
}

export async function updateActivity(id: number, input: Partial<CreateActivityInput>): Promise<Activity | null> {
  try {
    // Check if activity exists
    const existing = await getActivityById(id);
    if (!existing) {
      return null;
    }

    // If created_by is being updated, verify staff exists
    if (input.created_by !== undefined) {
      const staff = await db.select()
        .from(staffTable)
        .where(eq(staffTable.id, input.created_by))
        .execute();

      if (staff.length === 0) {
        throw new Error('Staff member not found');
      }
    }

    // Build update values
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) updateValues.title = input.title;
    if (input.description !== undefined) updateValues.description = input.description || null;
    if (input.activity_date !== undefined) updateValues.activity_date = input.activity_date;
    if (input.location !== undefined) updateValues.location = input.location || null;
    if (input.max_participants !== undefined) updateValues.max_participants = input.max_participants || null;
    if (input.created_by !== undefined) updateValues.created_by = input.created_by;

    const result = await db.update(activitiesTable)
      .set(updateValues)
      .where(eq(activitiesTable.id, id))
      .returning()
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Activity update failed:', error);
    throw error;
  }
}

export async function updateActivityStatus(id: number, status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'): Promise<Activity | null> {
  try {
    // Check if activity exists
    const existing = await getActivityById(id);
    if (!existing) {
      return null;
    }

    const result = await db.update(activitiesTable)
      .set({ 
        status: status,
        updated_at: new Date()
      })
      .where(eq(activitiesTable.id, id))
      .returning()
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Activity status update failed:', error);
    throw error;
  }
}
