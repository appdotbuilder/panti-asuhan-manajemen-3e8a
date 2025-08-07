
import { db } from '../db';
import { donorsTable, usersTable } from '../db/schema';
import { type CreateDonorInput, type Donor } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createDonor(input: CreateDonorInput): Promise<Donor> {
  try {
    // Verify user exists and has DONOR role
    const user = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, input.user_id),
        eq(usersTable.role, 'DONOR'),
        eq(usersTable.is_active, true)
      ))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found or does not have DONOR role');
    }

    // Check if donor already exists for this user
    const existingDonor = await db.select()
      .from(donorsTable)
      .where(eq(donorsTable.user_id, input.user_id))
      .execute();

    if (existingDonor.length > 0) {
      throw new Error('Donor profile already exists for this user');
    }

    // Create donor record
    const result = await db.insert(donorsTable)
      .values({
        user_id: input.user_id,
        full_name: input.full_name,
        phone: input.phone || null,
        address: input.address || null,
        organization: input.organization || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Donor creation failed:', error);
    throw error;
  }
}

export async function getAllDonors(): Promise<Donor[]> {
  try {
    const results = await db.select()
      .from(donorsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch all donors:', error);
    throw error;
  }
}

export async function getDonorById(id: number): Promise<Donor | null> {
  try {
    const results = await db.select()
      .from(donorsTable)
      .where(eq(donorsTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch donor by ID:', error);
    throw error;
  }
}

export async function getDonorByUserId(userId: number): Promise<Donor | null> {
  try {
    const results = await db.select()
      .from(donorsTable)
      .where(eq(donorsTable.user_id, userId))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch donor by user ID:', error);
    throw error;
  }
}

export async function updateDonor(id: number, input: Partial<CreateDonorInput>): Promise<Donor | null> {
  try {
    // Check if donor exists
    const existingDonor = await getDonorById(id);
    if (!existingDonor) {
      return null;
    }

    // Update donor record
    const result = await db.update(donorsTable)
      .set({
        full_name: input.full_name,
        phone: input.phone !== undefined ? input.phone : undefined,
        address: input.address !== undefined ? input.address : undefined,
        organization: input.organization !== undefined ? input.organization : undefined,
        updated_at: new Date()
      })
      .where(eq(donorsTable.id, id))
      .returning()
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to update donor:', error);
    throw error;
  }
}
