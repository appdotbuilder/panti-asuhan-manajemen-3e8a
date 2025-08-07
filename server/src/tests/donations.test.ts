
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { donationsTable, donorsTable, usersTable } from '../db/schema';
import { type CreateDonationInput, type CreateDonorInput, type CreateUserInput } from '../schema';
import { 
  createDonation, 
  getAllDonations, 
  getDonationsByDonorId, 
  getDonationById,
  updateDonation 
} from '../handlers/donations';
import { eq } from 'drizzle-orm';

// Test user and donor data
const testUser: CreateUserInput = {
  email: 'donor@test.com',
  password: 'password123',
  role: 'DONOR'
};

const testDonor: CreateDonorInput = {
  user_id: 1, // Will be set after user creation
  full_name: 'John Doe',
  phone: '+1234567890',
  address: '123 Test St',
  organization: 'Test Org'
};

const testDonation: CreateDonationInput = {
  donor_id: 1, // Will be set after donor creation
  donation_type: 'MONEY',
  amount: 100.50,
  description: 'Monthly donation',
  donation_date: new Date('2024-01-15')
};

const testServiceDonation: CreateDonationInput = {
  donor_id: 1,
  donation_type: 'SERVICE',
  amount: null, // Service donations may not have monetary value
  description: 'Volunteer teaching services',
  donation_date: new Date('2024-01-16')
};

async function createTestUserAndDonor() {
  // Create user
  const user = await db.insert(usersTable)
    .values({
      email: testUser.email,
      password_hash: 'hashed_password',
      role: testUser.role
    })
    .returning()
    .execute();

  // Create donor
  const donor = await db.insert(donorsTable)
    .values({
      user_id: user[0].id,
      full_name: testDonor.full_name,
      phone: testDonor.phone,
      address: testDonor.address,
      organization: testDonor.organization
    })
    .returning()
    .execute();

  return { user: user[0], donor: donor[0] };
}

describe('createDonation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a money donation successfully', async () => {
    const { donor } = await createTestUserAndDonor();
    
    const donationInput = {
      ...testDonation,
      donor_id: donor.id
    };

    const result = await createDonation(donationInput);

    expect(result.donor_id).toEqual(donor.id);
    expect(result.donation_type).toEqual('MONEY');
    expect(result.amount).toEqual(100.50);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Monthly donation');
    expect(result.donation_date).toBeInstanceOf(Date);
    expect(result.donation_date.toISOString().split('T')[0]).toEqual('2024-01-15');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a service donation with null amount', async () => {
    const { donor } = await createTestUserAndDonor();
    
    const donationInput = {
      ...testServiceDonation,
      donor_id: donor.id
    };

    const result = await createDonation(donationInput);

    expect(result.donor_id).toEqual(donor.id);
    expect(result.donation_type).toEqual('SERVICE');
    expect(result.amount).toBeNull();
    expect(result.description).toEqual('Volunteer teaching services');
    expect(result.donation_date).toBeInstanceOf(Date);
    expect(result.donation_date.toISOString().split('T')[0]).toEqual('2024-01-16');
  });

  it('should save donation to database correctly', async () => {
    const { donor } = await createTestUserAndDonor();
    
    const donationInput = {
      ...testDonation,
      donor_id: donor.id
    };

    const result = await createDonation(donationInput);

    const donations = await db.select()
      .from(donationsTable)
      .where(eq(donationsTable.id, result.id))
      .execute();

    expect(donations).toHaveLength(1);
    expect(donations[0].donor_id).toEqual(donor.id);
    expect(donations[0].donation_type).toEqual('MONEY');
    expect(parseFloat(donations[0].amount!)).toEqual(100.50);
    expect(donations[0].description).toEqual('Monthly donation');
    expect(donations[0].donation_date).toEqual('2024-01-15');
    expect(donations[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error if donor does not exist', async () => {
    const donationInput = {
      ...testDonation,
      donor_id: 999 // Non-existent donor
    };

    expect(createDonation(donationInput)).rejects.toThrow(/donor with id 999 not found/i);
  });
});

describe('getAllDonations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no donations exist', async () => {
    const result = await getAllDonations();
    expect(result).toEqual([]);
  });

  it('should return all donations with proper conversions', async () => {
    const { donor } = await createTestUserAndDonor();
    
    // Create multiple donations
    const donation1Input = {
      ...testDonation,
      donor_id: donor.id,
      amount: 100.25
    };
    
    const donation2Input = {
      ...testServiceDonation,
      donor_id: donor.id
    };

    await createDonation(donation1Input);
    await createDonation(donation2Input);

    const result = await getAllDonations();

    expect(result).toHaveLength(2);
    
    const moneyDonation = result.find(d => d.donation_type === 'MONEY');
    const serviceDonation = result.find(d => d.donation_type === 'SERVICE');
    
    expect(moneyDonation?.amount).toEqual(100.25);
    expect(typeof moneyDonation?.amount).toBe('number');
    expect(moneyDonation?.donation_date).toBeInstanceOf(Date);
    expect(serviceDonation?.amount).toBeNull();
    expect(serviceDonation?.donation_date).toBeInstanceOf(Date);
  });
});

describe('getDonationsByDonorId', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return donations for specific donor', async () => {
    const { donor } = await createTestUserAndDonor();
    
    // Create another donor
    const user2 = await db.insert(usersTable)
      .values({
        email: 'donor2@test.com',
        password_hash: 'hashed_password',
        role: 'DONOR'
      })
      .returning()
      .execute();

    const donor2 = await db.insert(donorsTable)
      .values({
        user_id: user2[0].id,
        full_name: 'Jane Smith',
        phone: '+0987654321',
        address: '456 Test Ave',
        organization: null
      })
      .returning()
      .execute();

    // Create donations for both donors
    await createDonation({
      ...testDonation,
      donor_id: donor.id,
      amount: 100.00
    });

    await createDonation({
      ...testDonation,
      donor_id: donor2[0].id,
      amount: 200.00,
      description: 'Different donation'
    });

    const result = await getDonationsByDonorId(donor.id);

    expect(result).toHaveLength(1);
    expect(result[0].donor_id).toEqual(donor.id);
    expect(result[0].amount).toEqual(100.00);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].description).toEqual('Monthly donation');
    expect(result[0].donation_date).toBeInstanceOf(Date);
  });

  it('should return empty array for donor with no donations', async () => {
    const { donor } = await createTestUserAndDonor();
    
    const result = await getDonationsByDonorId(donor.id);
    expect(result).toEqual([]);
  });

  it('should throw error if donor does not exist', async () => {
    expect(getDonationsByDonorId(999)).rejects.toThrow(/donor with id 999 not found/i);
  });
});

describe('getDonationById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return donation by ID with proper conversions', async () => {
    const { donor } = await createTestUserAndDonor();
    
    const donation = await createDonation({
      ...testDonation,
      donor_id: donor.id
    });

    const result = await getDonationById(donation.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(donation.id);
    expect(result!.donor_id).toEqual(donor.id);
    expect(result!.amount).toEqual(100.50);
    expect(typeof result!.amount).toBe('number');
    expect(result!.description).toEqual('Monthly donation');
    expect(result!.donation_date).toBeInstanceOf(Date);
  });

  it('should return null for non-existent donation', async () => {
    const result = await getDonationById(999);
    expect(result).toBeNull();
  });
});

describe('updateDonation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update donation successfully', async () => {
    const { donor } = await createTestUserAndDonor();
    
    const donation = await createDonation({
      ...testDonation,
      donor_id: donor.id
    });

    const updateInput = {
      amount: 150.75,
      description: 'Updated donation description',
      donation_type: 'GOODS' as const
    };

    const result = await updateDonation(donation.id, updateInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(donation.id);
    expect(result!.amount).toEqual(150.75);
    expect(typeof result!.amount).toBe('number');
    expect(result!.description).toEqual('Updated donation description');
    expect(result!.donation_type).toEqual('GOODS');
    expect(result!.donor_id).toEqual(donor.id); // Unchanged
    expect(result!.donation_date).toBeInstanceOf(Date);
  });

  it('should update donation date correctly', async () => {
    const { donor } = await createTestUserAndDonor();
    
    const donation = await createDonation({
      ...testDonation,
      donor_id: donor.id
    });

    const newDate = new Date('2024-02-20');
    const result = await updateDonation(donation.id, { donation_date: newDate });

    expect(result).not.toBeNull();
    expect(result!.donation_date).toBeInstanceOf(Date);
    expect(result!.donation_date.toISOString().split('T')[0]).toEqual('2024-02-20');
  });

  it('should update donation amount to null', async () => {
    const { donor } = await createTestUserAndDonor();
    
    const donation = await createDonation({
      ...testDonation,
      donor_id: donor.id
    });

    const result = await updateDonation(donation.id, { amount: null });

    expect(result).not.toBeNull();
    expect(result!.amount).toBeNull();
  });

  it('should throw error for non-existent donation', async () => {
    expect(updateDonation(999, { amount: 100 })).rejects.toThrow(/donation with id 999 not found/i);
  });

  it('should throw error when updating to non-existent donor', async () => {
    const { donor } = await createTestUserAndDonor();
    
    const donation = await createDonation({
      ...testDonation,
      donor_id: donor.id
    });

    expect(updateDonation(donation.id, { donor_id: 999 })).rejects.toThrow(/donor with id 999 not found/i);
  });
});
