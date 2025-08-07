
import { db } from '../db';
import { 
  childrenTable, 
  donorsTable, 
  staffTable, 
  donationsTable, 
  expensesTable, 
  activitiesTable,
  usersTable
} from '../db/schema';
import { type DashboardStats } from '../schema';
import { count, desc, gte, eq, and, sql, lte } from 'drizzle-orm';

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total counts for each entity
    const [childrenCount] = await db.select({ count: count() }).from(childrenTable).execute();
    const [donorsCount] = await db.select({ count: count() }).from(donorsTable).execute();
    const [staffCount] = await db.select({ count: count() }).from(staffTable).execute();

    // Get total donations amount
    const [donationsSum] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${donationsTable.amount}), 0)` })
      .from(donationsTable)
      .execute();

    // Get total expenses amount
    const [expensesSum] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
      .from(expensesTable)
      .execute();

    // Get recent activities count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [recentActivitiesCount] = await db
      .select({ count: count() })
      .from(activitiesTable)
      .where(gte(activitiesTable.created_at, thirtyDaysAgo))
      .execute();

    // Get active children count (children with active user accounts)
    const [activeChildrenCount] = await db
      .select({ count: count() })
      .from(childrenTable)
      .innerJoin(usersTable, eq(childrenTable.user_id, usersTable.id))
      .where(eq(usersTable.is_active, true))
      .execute();

    return {
      total_children: childrenCount.count,
      total_donors: donorsCount.count,
      total_staff: staffCount.count,
      total_donations: parseFloat(donationsSum.sum || '0'),
      total_expenses: parseFloat(expensesSum.sum || '0'),
      recent_activities: recentActivitiesCount.count,
      active_children: activeChildrenCount.count
    };
  } catch (error) {
    console.error('Dashboard stats fetch failed:', error);
    throw error;
  }
}

export async function getRecentDonations(limit: number = 10): Promise<any[]> {
  try {
    const results = await db
      .select({
        id: donationsTable.id,
        donation_type: donationsTable.donation_type,
        amount: donationsTable.amount,
        description: donationsTable.description,
        donation_date: donationsTable.donation_date,
        donor_name: donorsTable.full_name,
        donor_organization: donorsTable.organization
      })
      .from(donationsTable)
      .innerJoin(donorsTable, eq(donationsTable.donor_id, donorsTable.id))
      .orderBy(desc(donationsTable.created_at))
      .limit(limit)
      .execute();

    return results.map(donation => ({
      ...donation,
      amount: donation.amount ? parseFloat(donation.amount) : null
    }));
  } catch (error) {
    console.error('Recent donations fetch failed:', error);
    throw error;
  }
}

export async function getRecentExpenses(limit: number = 10): Promise<any[]> {
  try {
    const results = await db
      .select({
        id: expensesTable.id,
        expense_type: expensesTable.expense_type,
        amount: expensesTable.amount,
        description: expensesTable.description,
        expense_date: expensesTable.expense_date,
        staff_name: staffTable.full_name,
        staff_position: staffTable.position
      })
      .from(expensesTable)
      .innerJoin(staffTable, eq(expensesTable.staff_id, staffTable.id))
      .orderBy(desc(expensesTable.created_at))
      .limit(limit)
      .execute();

    return results.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount)
    }));
  } catch (error) {
    console.error('Recent expenses fetch failed:', error);
    throw error;
  }
}

export async function getUpcomingActivities(limit: number = 10): Promise<any[]> {
  try {
    const now = new Date();
    
    const results = await db
      .select({
        id: activitiesTable.id,
        title: activitiesTable.title,
        description: activitiesTable.description,
        activity_date: activitiesTable.activity_date,
        location: activitiesTable.location,
        status: activitiesTable.status,
        max_participants: activitiesTable.max_participants,
        creator_name: staffTable.full_name,
        creator_position: staffTable.position
      })
      .from(activitiesTable)
      .innerJoin(staffTable, eq(activitiesTable.created_by, staffTable.id))
      .where(
        and(
          gte(activitiesTable.activity_date, now),
          eq(activitiesTable.status, 'PLANNED')
        )
      )
      .orderBy(activitiesTable.activity_date)
      .limit(limit)
      .execute();

    return results;
  } catch (error) {
    console.error('Upcoming activities fetch failed:', error);
    throw error;
  }
}

export async function getMonthlyFinancialSummary(): Promise<{ donations: number; expenses: number; balance: number }> {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Format dates as strings for date columns
    const startDateStr = firstDayOfMonth.toISOString().split('T')[0];
    const endDateStr = lastDayOfMonth.toISOString().split('T')[0];

    // Get monthly donations sum
    const [monthlyDonations] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${donationsTable.amount}), 0)` })
      .from(donationsTable)
      .where(
        and(
          gte(donationsTable.donation_date, startDateStr),
          lte(donationsTable.donation_date, endDateStr)
        )
      )
      .execute();

    // Get monthly expenses sum
    const [monthlyExpenses] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
      .from(expensesTable)
      .where(
        and(
          gte(expensesTable.expense_date, startDateStr),
          lte(expensesTable.expense_date, endDateStr)
        )
      )
      .execute();

    const donations = parseFloat(monthlyDonations.sum || '0');
    const expenses = parseFloat(monthlyExpenses.sum || '0');

    return {
      donations,
      expenses,
      balance: donations - expenses
    };
  } catch (error) {
    console.error('Monthly financial summary fetch failed:', error);
    throw error;
  }
}
