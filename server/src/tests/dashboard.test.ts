
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable,
  childrenTable,
  donorsTable,
  staffTable,
  donationsTable,
  expensesTable,
  activitiesTable
} from '../db/schema';
import {
  getDashboardStats,
  getRecentDonations,
  getRecentExpenses,
  getUpcomingActivities,
  getMonthlyFinancialSummary
} from '../handlers/dashboard';

describe('Dashboard Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestUser = async (role: 'ADMIN' | 'CHILD' | 'DONOR' | 'STAFF', isActive = true) => {
    const result = await db.insert(usersTable)
      .values({
        email: `test-${Date.now()}-${Math.random()}@example.com`,
        password_hash: 'hashedpassword',
        role,
        is_active: isActive
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestChild = async (userId: number) => {
    const result = await db.insert(childrenTable)
      .values({
        user_id: userId,
        full_name: 'Test Child',
        date_of_birth: '2010-01-01',
        gender: 'MALE',
        admission_date: '2020-01-01'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestDonor = async (userId: number) => {
    const result = await db.insert(donorsTable)
      .values({
        user_id: userId,
        full_name: 'Test Donor',
        organization: 'Test Org'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestStaff = async (userId: number) => {
    const result = await db.insert(staffTable)
      .values({
        user_id: userId,
        full_name: 'Test Staff',
        position: 'Manager',
        hire_date: '2020-01-01'
      })
      .returning()
      .execute();
    return result[0];
  };

  describe('getDashboardStats', () => {
    it('should return correct dashboard statistics', async () => {
      // Create test data
      const childUser = await createTestUser('CHILD', true);
      const inactiveChildUser = await createTestUser('CHILD', false);
      const donorUser = await createTestUser('DONOR');
      const staffUser = await createTestUser('STAFF');

      await createTestChild(childUser.id);
      await createTestChild(inactiveChildUser.id);
      const donor = await createTestDonor(donorUser.id);
      const staff = await createTestStaff(staffUser.id);

      // Create donations
      await db.insert(donationsTable)
        .values({
          donor_id: donor.id,
          donation_type: 'MONEY',
          amount: '100.50',
          description: 'Test donation',
          donation_date: new Date().toISOString().split('T')[0]
        })
        .execute();

      // Create expenses
      await db.insert(expensesTable)
        .values({
          staff_id: staff.id,
          expense_type: 'FOOD',
          amount: '50.25',
          description: 'Test expense',
          expense_date: new Date().toISOString().split('T')[0]
        })
        .execute();

      // Create recent activity
      await db.insert(activitiesTable)
        .values({
          title: 'Test Activity',
          description: 'Test description',
          activity_date: new Date(),
          created_by: staff.id
        })
        .execute();

      const stats = await getDashboardStats();

      expect(stats.total_children).toBe(2);
      expect(stats.total_donors).toBe(1);
      expect(stats.total_staff).toBe(1);
      expect(stats.total_donations).toBe(100.50);
      expect(stats.total_expenses).toBe(50.25);
      expect(stats.recent_activities).toBe(1);
      expect(stats.active_children).toBe(1); // Only one child has active user account
    });

    it('should return zero values when no data exists', async () => {
      const stats = await getDashboardStats();

      expect(stats.total_children).toBe(0);
      expect(stats.total_donors).toBe(0);
      expect(stats.total_staff).toBe(0);
      expect(stats.total_donations).toBe(0);
      expect(stats.total_expenses).toBe(0);
      expect(stats.recent_activities).toBe(0);
      expect(stats.active_children).toBe(0);
    });
  });

  describe('getRecentDonations', () => {
    it('should return recent donations with donor information', async () => {
      // Create test data
      const donorUser = await createTestUser('DONOR');
      const donor = await createTestDonor(donorUser.id);

      await db.insert(donationsTable)
        .values({
          donor_id: donor.id,
          donation_type: 'MONEY',
          amount: '150.75',
          description: 'Recent donation',
          donation_date: new Date().toISOString().split('T')[0]
        })
        .execute();

      const donations = await getRecentDonations(5);

      expect(donations).toHaveLength(1);
      expect(donations[0].donation_type).toBe('MONEY');
      expect(donations[0].amount).toBe(150.75);
      expect(donations[0].description).toBe('Recent donation');
      expect(donations[0].donor_name).toBe('Test Donor');
      expect(donations[0].donor_organization).toBe('Test Org');
    });

    it('should handle null amounts correctly', async () => {
      const donorUser = await createTestUser('DONOR');
      const donor = await createTestDonor(donorUser.id);

      await db.insert(donationsTable)
        .values({
          donor_id: donor.id,
          donation_type: 'GOODS',
          amount: null,
          description: 'Non-monetary donation',
          donation_date: new Date().toISOString().split('T')[0]
        })
        .execute();

      const donations = await getRecentDonations();

      expect(donations).toHaveLength(1);
      expect(donations[0].amount).toBeNull();
      expect(donations[0].donation_type).toBe('GOODS');
    });

    it('should respect the limit parameter', async () => {
      const donorUser = await createTestUser('DONOR');
      const donor = await createTestDonor(donorUser.id);

      // Create multiple donations
      for (let i = 0; i < 3; i++) {
        await db.insert(donationsTable)
          .values({
            donor_id: donor.id,
            donation_type: 'MONEY',
            amount: '100.00',
            description: `Donation ${i}`,
            donation_date: new Date().toISOString().split('T')[0]
          })
          .execute();
      }

      const donations = await getRecentDonations(2);
      expect(donations).toHaveLength(2);
    });
  });

  describe('getRecentExpenses', () => {
    it('should return recent expenses with staff information', async () => {
      const staffUser = await createTestUser('STAFF');
      const staff = await createTestStaff(staffUser.id);

      await db.insert(expensesTable)
        .values({
          staff_id: staff.id,
          expense_type: 'EDUCATION',
          amount: '200.00',
          description: 'School supplies',
          expense_date: new Date().toISOString().split('T')[0]
        })
        .execute();

      const expenses = await getRecentExpenses(5);

      expect(expenses).toHaveLength(1);
      expect(expenses[0].expense_type).toBe('EDUCATION');
      expect(expenses[0].amount).toBe(200.00);
      expect(expenses[0].description).toBe('School supplies');
      expect(expenses[0].staff_name).toBe('Test Staff');
      expect(expenses[0].staff_position).toBe('Manager');
    });

    it('should respect the limit parameter', async () => {
      const staffUser = await createTestUser('STAFF');
      const staff = await createTestStaff(staffUser.id);

      // Create multiple expenses
      for (let i = 0; i < 4; i++) {
        await db.insert(expensesTable)
          .values({
            staff_id: staff.id,
            expense_type: 'FOOD',
            amount: '50.00',
            description: `Expense ${i}`,
            expense_date: new Date().toISOString().split('T')[0]
          })
          .execute();
      }

      const expenses = await getRecentExpenses(2);
      expect(expenses).toHaveLength(2);
    });
  });

  describe('getUpcomingActivities', () => {
    it('should return upcoming planned activities', async () => {
      const staffUser = await createTestUser('STAFF');
      const staff = await createTestStaff(staffUser.id);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await db.insert(activitiesTable)
        .values({
          title: 'Future Activity',
          description: 'Upcoming event',
          activity_date: futureDate,
          location: 'Community Center',
          status: 'PLANNED',
          max_participants: 20,
          created_by: staff.id
        })
        .execute();

      const activities = await getUpcomingActivities(5);

      expect(activities).toHaveLength(1);
      expect(activities[0].title).toBe('Future Activity');
      expect(activities[0].description).toBe('Upcoming event');
      expect(activities[0].location).toBe('Community Center');
      expect(activities[0].status).toBe('PLANNED');
      expect(activities[0].max_participants).toBe(20);
      expect(activities[0].creator_name).toBe('Test Staff');
      expect(activities[0].creator_position).toBe('Manager');
    });

    it('should not return past activities', async () => {
      const staffUser = await createTestUser('STAFF');
      const staff = await createTestStaff(staffUser.id);

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      await db.insert(activitiesTable)
        .values({
          title: 'Past Activity',
          description: 'Already happened',
          activity_date: pastDate,
          status: 'PLANNED',
          created_by: staff.id
        })
        .execute();

      const activities = await getUpcomingActivities();
      expect(activities).toHaveLength(0);
    });

    it('should not return completed or cancelled activities', async () => {
      const staffUser = await createTestUser('STAFF');
      const staff = await createTestStaff(staffUser.id);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await db.insert(activitiesTable)
        .values({
          title: 'Completed Activity',
          description: 'Already done',
          activity_date: futureDate,
          status: 'COMPLETED',
          created_by: staff.id
        })
        .execute();

      const activities = await getUpcomingActivities();
      expect(activities).toHaveLength(0);
    });
  });

  describe('getMonthlyFinancialSummary', () => {
    it('should return correct monthly financial summary', async () => {
      const donorUser = await createTestUser('DONOR');
      const staffUser = await createTestUser('STAFF');
      const donor = await createTestDonor(donorUser.id);
      const staff = await createTestStaff(staffUser.id);

      const thisMonth = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const thisMonthStr = thisMonth.toISOString().split('T')[0];
      const lastMonthStr = lastMonth.toISOString().split('T')[0];

      // Create donation this month
      await db.insert(donationsTable)
        .values({
          donor_id: donor.id,
          donation_type: 'MONEY',
          amount: '300.00',
          description: 'This month donation',
          donation_date: thisMonthStr
        })
        .execute();

      // Create donation last month (should not be included)
      await db.insert(donationsTable)
        .values({
          donor_id: donor.id,
          donation_type: 'MONEY',
          amount: '100.00',
          description: 'Last month donation',
          donation_date: lastMonthStr
        })
        .execute();

      // Create expense this month
      await db.insert(expensesTable)
        .values({
          staff_id: staff.id,
          expense_type: 'FOOD',
          amount: '150.00',
          description: 'This month expense',
          expense_date: thisMonthStr
        })
        .execute();

      const summary = await getMonthlyFinancialSummary();

      expect(summary.donations).toBe(300.00);
      expect(summary.expenses).toBe(150.00);
      expect(summary.balance).toBe(150.00);
    });

    it('should return zero values when no monthly data exists', async () => {
      const summary = await getMonthlyFinancialSummary();

      expect(summary.donations).toBe(0);
      expect(summary.expenses).toBe(0);
      expect(summary.balance).toBe(0);
    });

    it('should handle negative balance correctly', async () => {
      const staffUser = await createTestUser('STAFF');
      const staff = await createTestStaff(staffUser.id);

      await db.insert(expensesTable)
        .values({
          staff_id: staff.id,
          expense_type: 'UTILITIES',
          amount: '500.00',
          description: 'High expense',
          expense_date: new Date().toISOString().split('T')[0]
        })
        .execute();

      const summary = await getMonthlyFinancialSummary();

      expect(summary.donations).toBe(0);
      expect(summary.expenses).toBe(500.00);
      expect(summary.balance).toBe(-500.00);
    });
  });
});
