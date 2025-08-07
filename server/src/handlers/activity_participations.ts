
import { db } from '../db';
import { activityParticipationsTable, activitiesTable, childrenTable } from '../db/schema';
import { type CreateActivityParticipationInput, type ActivityParticipation } from '../schema';
import { eq, and, sql, count } from 'drizzle-orm';

export async function createActivityParticipation(input: CreateActivityParticipationInput): Promise<ActivityParticipation> {
  try {
    // Validate that the activity exists
    const activity = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.id, input.activity_id))
      .limit(1)
      .execute();

    if (activity.length === 0) {
      throw new Error(`Activity with id ${input.activity_id} does not exist`);
    }

    // Validate that the child exists
    const child = await db.select()
      .from(childrenTable)
      .where(eq(childrenTable.id, input.child_id))
      .limit(1)
      .execute();

    if (child.length === 0) {
      throw new Error(`Child with id ${input.child_id} does not exist`);
    }

    // Check if child is already registered for this activity
    const existing = await db.select()
      .from(activityParticipationsTable)
      .where(and(
        eq(activityParticipationsTable.activity_id, input.activity_id),
        eq(activityParticipationsTable.child_id, input.child_id)
      ))
      .limit(1)
      .execute();

    if (existing.length > 0) {
      throw new Error('Child is already registered for this activity');
    }

    // Check max participants limit if set
    if (activity[0].max_participants !== null) {
      const currentCount = await db.select({ count: count() })
        .from(activityParticipationsTable)
        .where(eq(activityParticipationsTable.activity_id, input.activity_id))
        .execute();

      if (currentCount[0].count >= activity[0].max_participants) {
        throw new Error('Activity has reached maximum participant limit');
      }
    }

    // Create the participation record
    const result = await db.insert(activityParticipationsTable)
      .values({
        activity_id: input.activity_id,
        child_id: input.child_id,
        status: input.status,
        notes: input.notes || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Activity participation creation failed:', error);
    throw error;
  }
}

export async function getParticipationsByActivityId(activityId: number): Promise<ActivityParticipation[]> {
  try {
    const results = await db.select()
      .from(activityParticipationsTable)
      .where(eq(activityParticipationsTable.activity_id, activityId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch participations by activity:', error);
    throw error;
  }
}

export async function getParticipationsByChildId(childId: number): Promise<ActivityParticipation[]> {
  try {
    const results = await db.select()
      .from(activityParticipationsTable)
      .where(eq(activityParticipationsTable.child_id, childId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch participations by child:', error);
    throw error;
  }
}

export async function updateParticipationStatus(
  id: number, 
  status: 'REGISTERED' | 'ATTENDED' | 'ABSENT' | 'CANCELLED'
): Promise<ActivityParticipation | null> {
  try {
    const result = await db.update(activityParticipationsTable)
      .set({ 
        status,
        updated_at: sql`now()`
      })
      .where(eq(activityParticipationsTable.id, id))
      .returning()
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to update participation status:', error);
    throw error;
  }
}

export async function removeActivityParticipation(id: number): Promise<{ success: boolean }> {
  try {
    const result = await db.delete(activityParticipationsTable)
      .where(eq(activityParticipationsTable.id, id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Failed to remove activity participation:', error);
    throw error;
  }
}
