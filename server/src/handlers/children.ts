
import { db } from '../db';
import { childrenTable, usersTable } from '../db/schema';
import { type CreateChildInput, type Child } from '../schema';
import { eq } from 'drizzle-orm';

export async function createChild(input: CreateChildInput): Promise<Child> {
  try {
    // Verify user exists and has CHILD role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'CHILD') {
      throw new Error('User must have CHILD role');
    }

    // Insert child record - convert dates to strings for database
    const result = await db.insert(childrenTable)
      .values({
        user_id: input.user_id,
        full_name: input.full_name,
        date_of_birth: input.date_of_birth.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD
        gender: input.gender,
        admission_date: input.admission_date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD
        health_status: input.health_status || null,
        education_level: input.education_level || null,
        photo_url: input.photo_url || null,
        background_story: input.background_story || null
      })
      .returning()
      .execute();

    // Convert string dates back to Date objects for return
    const child = result[0];
    return {
      ...child,
      date_of_birth: new Date(child.date_of_birth),
      admission_date: new Date(child.admission_date)
    };
  } catch (error) {
    console.error('Child creation failed:', error);
    throw error;
  }
}

export async function getAllChildren(): Promise<Child[]> {
  try {
    const results = await db.select()
      .from(childrenTable)
      .execute();

    // Convert string dates back to Date objects
    return results.map(child => ({
      ...child,
      date_of_birth: new Date(child.date_of_birth),
      admission_date: new Date(child.admission_date)
    }));
  } catch (error) {
    console.error('Fetching all children failed:', error);
    throw error;
  }
}

export async function getChildById(id: number): Promise<Child | null> {
  try {
    const results = await db.select()
      .from(childrenTable)
      .where(eq(childrenTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert string dates back to Date objects
    const child = results[0];
    return {
      ...child,
      date_of_birth: new Date(child.date_of_birth),
      admission_date: new Date(child.admission_date)
    };
  } catch (error) {
    console.error('Fetching child by ID failed:', error);
    throw error;
  }
}

export async function updateChild(id: number, input: Partial<CreateChildInput>): Promise<Child | null> {
  try {
    // Check if child exists
    const existingChild = await getChildById(id);
    if (!existingChild) {
      return null;
    }

    // If user_id is being updated, verify the new user exists and has CHILD role
    if (input.user_id) {
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (user.length === 0) {
        throw new Error('User not found');
      }

      if (user[0].role !== 'CHILD') {
        throw new Error('User must have CHILD role');
      }
    }

    // Prepare update data - convert Date fields to strings
    const updateData: any = { ...input, updated_at: new Date() };
    if (input.date_of_birth) {
      updateData.date_of_birth = input.date_of_birth.toISOString().split('T')[0];
    }
    if (input.admission_date) {
      updateData.admission_date = input.admission_date.toISOString().split('T')[0];
    }

    // Update child record
    const result = await db.update(childrenTable)
      .set(updateData)
      .where(eq(childrenTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert string dates back to Date objects
    const child = result[0];
    return {
      ...child,
      date_of_birth: new Date(child.date_of_birth),
      admission_date: new Date(child.admission_date)
    };
  } catch (error) {
    console.error('Child update failed:', error);
    throw error;
  }
}

export async function getChildByUserId(userId: number): Promise<Child | null> {
  try {
    const results = await db.select()
      .from(childrenTable)
      .where(eq(childrenTable.user_id, userId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert string dates back to Date objects
    const child = results[0];
    return {
      ...child,
      date_of_birth: new Date(child.date_of_birth),
      admission_date: new Date(child.admission_date)
    };
  } catch (error) {
    console.error('Fetching child by user ID failed:', error);
    throw error;
  }
}
