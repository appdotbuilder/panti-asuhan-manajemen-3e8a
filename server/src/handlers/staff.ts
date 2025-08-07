
import { db } from '../db';
import { staffTable, usersTable } from '../db/schema';
import { type CreateStaffInput, type Staff } from '../schema';
import { eq } from 'drizzle-orm';

export async function createStaff(input: CreateStaffInput): Promise<Staff> {
  try {
    // Verify that the user exists and has STAFF role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'STAFF') {
      throw new Error('User must have STAFF role');
    }

    // Check if staff record already exists for this user
    const existingStaff = await db.select()
      .from(staffTable)
      .where(eq(staffTable.user_id, input.user_id))
      .execute();

    if (existingStaff.length > 0) {
      throw new Error('Staff record already exists for this user');
    }

    // Convert Date to string for date column
    const hireDateString = input.hire_date.toISOString().split('T')[0];

    // Insert staff record
    const result = await db.insert(staffTable)
      .values({
        user_id: input.user_id,
        full_name: input.full_name,
        position: input.position,
        phone: input.phone || null,
        address: input.address || null,
        hire_date: hireDateString,
        photo_url: input.photo_url || null
      })
      .returning()
      .execute();

    // Convert string back to Date for return type
    const staff = result[0];
    return {
      ...staff,
      hire_date: new Date(staff.hire_date)
    };
  } catch (error) {
    console.error('Staff creation failed:', error);
    throw error;
  }
}

export async function getAllStaff(): Promise<Staff[]> {
  try {
    const result = await db.select()
      .from(staffTable)
      .execute();

    // Convert hire_date strings back to Date objects
    return result.map(staff => ({
      ...staff,
      hire_date: new Date(staff.hire_date)
    }));
  } catch (error) {
    console.error('Failed to fetch all staff:', error);
    throw error;
  }
}

export async function getStaffById(id: number): Promise<Staff | null> {
  try {
    const result = await db.select()
      .from(staffTable)
      .where(eq(staffTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert hire_date string back to Date object
    const staff = result[0];
    return {
      ...staff,
      hire_date: new Date(staff.hire_date)
    };
  } catch (error) {
    console.error('Failed to fetch staff by ID:', error);
    throw error;
  }
}

export async function getStaffByUserId(userId: number): Promise<Staff | null> {
  try {
    const result = await db.select()
      .from(staffTable)
      .where(eq(staffTable.user_id, userId))
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert hire_date string back to Date object
    const staff = result[0];
    return {
      ...staff,
      hire_date: new Date(staff.hire_date)
    };
  } catch (error) {
    console.error('Failed to fetch staff by user ID:', error);
    throw error;
  }
}

export async function updateStaff(id: number, input: Partial<CreateStaffInput>): Promise<Staff | null> {
  try {
    // Check if staff exists
    const existingStaff = await db.select()
      .from(staffTable)
      .where(eq(staffTable.id, id))
      .execute();

    if (existingStaff.length === 0) {
      return null;
    }

    // If user_id is being updated, verify the new user exists and has STAFF role
    if (input.user_id !== undefined) {
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (user.length === 0) {
        throw new Error('User not found');
      }

      if (user[0].role !== 'STAFF') {
        throw new Error('User must have STAFF role');
      }

      // Check if another staff record exists for this user (excluding current record)
      const existingStaffForUser = await db.select()
        .from(staffTable)
        .where(eq(staffTable.user_id, input.user_id))
        .execute();

      if (existingStaffForUser.length > 0 && existingStaffForUser[0].id !== id) {
        throw new Error('Staff record already exists for this user');
      }
    }

    // Prepare update data, converting Date to string if hire_date is provided
    const updateData: any = {
      ...input,
      updated_at: new Date()
    };

    if (input.hire_date !== undefined) {
      updateData.hire_date = input.hire_date.toISOString().split('T')[0];
    }

    // Update staff record
    const result = await db.update(staffTable)
      .set(updateData)
      .where(eq(staffTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert hire_date string back to Date object
    const staff = result[0];
    return {
      ...staff,
      hire_date: new Date(staff.hire_date)
    };
  } catch (error) {
    console.error('Staff update failed:', error);
    throw error;
  }
}
