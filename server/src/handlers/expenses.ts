
import { db } from '../db';
import { expensesTable, staffTable } from '../db/schema';
import { type CreateExpenseInput, type Expense } from '../schema';
import { eq } from 'drizzle-orm';

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  try {
    // Verify staff exists
    const staff = await db.select()
      .from(staffTable)
      .where(eq(staffTable.id, input.staff_id))
      .execute();

    if (staff.length === 0) {
      throw new Error('Staff member not found');
    }

    // Insert expense record
    const result = await db.insert(expensesTable)
      .values({
        staff_id: input.staff_id,
        expense_type: input.expense_type,
        amount: input.amount.toString(), // Convert number to string for numeric column
        description: input.description,
        expense_date: input.expense_date.toISOString().split('T')[0], // Convert Date to string (YYYY-MM-DD)
        receipt_url: input.receipt_url || null
      })
      .returning()
      .execute();

    // Convert fields back to expected types before returning
    const expense = result[0];
    return {
      ...expense,
      amount: parseFloat(expense.amount), // Convert string back to number
      expense_date: new Date(expense.expense_date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Expense creation failed:', error);
    throw error;
  }
}

export async function getAllExpenses(): Promise<Expense[]> {
  try {
    const results = await db.select()
      .from(expensesTable)
      .execute();

    // Convert fields back to expected types before returning
    return results.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount), // Convert string back to number
      expense_date: new Date(expense.expense_date) // Convert string back to Date
    }));
  } catch (error) {
    console.error('Failed to fetch all expenses:', error);
    throw error;
  }
}

export async function getExpensesByStaffId(staffId: number): Promise<Expense[]> {
  try {
    const results = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.staff_id, staffId))
      .execute();

    // Convert fields back to expected types before returning
    return results.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount), // Convert string back to number
      expense_date: new Date(expense.expense_date) // Convert string back to Date
    }));
  } catch (error) {
    console.error('Failed to fetch expenses by staff ID:', error);
    throw error;
  }
}

export async function getExpenseById(id: number): Promise<Expense | null> {
  try {
    const results = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert fields back to expected types before returning
    const expense = results[0];
    return {
      ...expense,
      amount: parseFloat(expense.amount), // Convert string back to number
      expense_date: new Date(expense.expense_date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Failed to fetch expense by ID:', error);
    throw error;
  }
}

export async function updateExpense(id: number, input: Partial<CreateExpenseInput>): Promise<Expense | null> {
  try {
    // Check if expense exists
    const existingExpense = await getExpenseById(id);
    if (!existingExpense) {
      return null;
    }

    // If staff_id is being updated, verify new staff exists
    if (input.staff_id) {
      const staff = await db.select()
        .from(staffTable)
        .where(eq(staffTable.id, input.staff_id))
        .execute();

      if (staff.length === 0) {
        throw new Error('Staff member not found');
      }
    }

    // Prepare update values
    const updateValues: any = {};
    
    if (input.staff_id !== undefined) updateValues.staff_id = input.staff_id;
    if (input.expense_type !== undefined) updateValues.expense_type = input.expense_type;
    if (input.amount !== undefined) updateValues.amount = input.amount.toString(); // Convert to string
    if (input.description !== undefined) updateValues.description = input.description;
    if (input.expense_date !== undefined) updateValues.expense_date = input.expense_date.toISOString().split('T')[0]; // Convert Date to string
    if (input.receipt_url !== undefined) updateValues.receipt_url = input.receipt_url;

    // Add updated_at timestamp
    updateValues.updated_at = new Date();

    // Update expense record
    const result = await db.update(expensesTable)
      .set(updateValues)
      .where(eq(expensesTable.id, id))
      .returning()
      .execute();

    // Convert fields back to expected types before returning
    const expense = result[0];
    return {
      ...expense,
      amount: parseFloat(expense.amount), // Convert string back to number
      expense_date: new Date(expense.expense_date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Expense update failed:', error);
    throw error;
  }
}
