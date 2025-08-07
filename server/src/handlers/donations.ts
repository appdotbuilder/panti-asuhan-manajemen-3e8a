
import { db } from '../db';
import { donationsTable, donorsTable, usersTable, auditLogsTable } from '../db/schema';
import { type CreateDonationInput, type Donation } from '../schema';
import { eq } from 'drizzle-orm';

export async function createDonation(input: CreateDonationInput): Promise<Donation> {
  try {
    // Verify donor exists
    const donor = await db.select()
      .from(donorsTable)
      .where(eq(donorsTable.id, input.donor_id))
      .limit(1)
      .execute();

    if (donor.length === 0) {
      throw new Error(`Donor with ID ${input.donor_id} not found`);
    }

    // Insert donation record
    const result = await db.insert(donationsTable)
      .values({
        donor_id: input.donor_id,
        donation_type: input.donation_type,
        amount: input.amount ? input.amount.toString() : null, // Convert number to string for numeric column
        description: input.description,
        donation_date: input.donation_date.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();

    // Convert fields back to expected types before returning
    const donation = result[0];
    return {
      ...donation,
      amount: donation.amount ? parseFloat(donation.amount) : null, // Convert string back to number
      donation_date: new Date(donation.donation_date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Donation creation failed:', error);
    throw error;
  }
}

export async function getAllDonations(): Promise<Donation[]> {
  try {
    const result = await db.select()
      .from(donationsTable)
      .execute();

    // Convert fields back to expected types before returning
    return result.map(donation => ({
      ...donation,
      amount: donation.amount ? parseFloat(donation.amount) : null,
      donation_date: new Date(donation.donation_date)
    }));
  } catch (error) {
    console.error('Failed to fetch all donations:', error);
    throw error;
  }
}

export async function getDonationsByDonorId(donorId: number): Promise<Donation[]> {
  try {
    // Verify donor exists
    const donor = await db.select()
      .from(donorsTable)
      .where(eq(donorsTable.id, donorId))
      .limit(1)
      .execute();

    if (donor.length === 0) {
      throw new Error(`Donor with ID ${donorId} not found`);
    }

    const result = await db.select()
      .from(donationsTable)
      .where(eq(donationsTable.donor_id, donorId))
      .execute();

    // Convert fields back to expected types before returning
    return result.map(donation => ({
      ...donation,
      amount: donation.amount ? parseFloat(donation.amount) : null,
      donation_date: new Date(donation.donation_date)
    }));
  } catch (error) {
    console.error('Failed to fetch donations by donor ID:', error);
    throw error;
  }
}

export async function getDonationById(id: number): Promise<Donation | null> {
  try {
    const result = await db.select()
      .from(donationsTable)
      .where(eq(donationsTable.id, id))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert fields back to expected types before returning
    const donation = result[0];
    return {
      ...donation,
      amount: donation.amount ? parseFloat(donation.amount) : null,
      donation_date: new Date(donation.donation_date)
    };
  } catch (error) {
    console.error('Failed to fetch donation by ID:', error);
    throw error;
  }
}

export async function updateDonation(id: number, input: Partial<CreateDonationInput>): Promise<Donation | null> {
  try {
    // Verify donation exists
    const existing = await db.select()
      .from(donationsTable)
      .where(eq(donationsTable.id, id))
      .limit(1)
      .execute();

    if (existing.length === 0) {
      throw new Error(`Donation with ID ${id} not found`);
    }

    // If donor_id is being updated, verify the new donor exists
    if (input.donor_id !== undefined) {
      const donor = await db.select()
        .from(donorsTable)
        .where(eq(donorsTable.id, input.donor_id))
        .limit(1)
        .execute();

      if (donor.length === 0) {
        throw new Error(`Donor with ID ${input.donor_id} not found`);
      }
    }

    // Prepare update values with proper conversions
    const updateValues: any = {};
    if (input.donor_id !== undefined) updateValues.donor_id = input.donor_id;
    if (input.donation_type !== undefined) updateValues.donation_type = input.donation_type;
    if (input.amount !== undefined) {
      updateValues.amount = input.amount ? input.amount.toString() : null; // Convert number to string
    }
    if (input.description !== undefined) updateValues.description = input.description;
    if (input.donation_date !== undefined) {
      updateValues.donation_date = input.donation_date.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD string
    }

    const result = await db.update(donationsTable)
      .set(updateValues)
      .where(eq(donationsTable.id, id))
      .returning()
      .execute();

    // Convert fields back to expected types before returning
    const donation = result[0];
    return {
      ...donation,
      amount: donation.amount ? parseFloat(donation.amount) : null,
      donation_date: new Date(donation.donation_date)
    };
  } catch (error) {
    console.error('Donation update failed:', error);
    throw error;
  }
}
