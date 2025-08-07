
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, staffTable, expensesTable } from '../db/schema';
import { type CreateExpenseInput } from '../schema';
import { 
  createExpense, 
  getAllExpenses, 
  getExpensesByStaffId, 
  getExpenseById,
  updateExpense 
} from '../handlers/expenses';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'staff@test.com',
  password_hash: 'hashedpassword',
  role: 'STAFF' as const
};

const testStaff = {
  full_name: 'John Smith',
  position: 'Caregiver',
  hire_date: '2023-01-01', // Use string format for date column
  phone: '+1234567890',
  address: '123 Test Street',
  photo_url: 'http://example.com/photo.jpg'
};

const testExpenseInput: CreateExpenseInput = {
  staff_id: 1, // Will be set after staff creation
  expense_type: 'FOOD',
  amount: 150.75,
  description: 'Grocery supplies for children',
  expense_date: new Date('2024-01-15'),
  receipt_url: 'http://example.com/receipt.pdf'
};

describe('Expense Handlers', () => {
  let staffId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    // Create test staff
    const staffResult = await db.insert(staffTable)
      .values({
        ...testStaff,
        user_id: userResult[0].id
      })
      .returning()
      .execute();
    
    staffId = staffResult[0].id;
    testExpenseInput.staff_id = staffId;
  });

  afterEach(resetDB);

  describe('createExpense', () => {
    it('should create an expense successfully', async () => {
      const result = await createExpense(testExpenseInput);

      expect(result.staff_id).toEqual(staffId);
      expect(result.expense_type).toEqual('FOOD');
      expect(result.amount).toEqual(150.75);
      expect(typeof result.amount).toBe('number');
      expect(result.description).toEqual('Grocery supplies for children');
      expect(result.expense_date).toEqual(testExpenseInput.expense_date);
      expect(result.expense_date).toBeInstanceOf(Date);
      expect(result.receipt_url).toEqual('http://example.com/receipt.pdf');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save expense to database', async () => {
      const result = await createExpense(testExpenseInput);

      const expenses = await db.select()
        .from(expensesTable)
        .where(eq(expensesTable.id, result.id))
        .execute();

      expect(expenses).toHaveLength(1);
      expect(expenses[0].staff_id).toEqual(staffId);
      expect(expenses[0].expense_type).toEqual('FOOD');
      expect(parseFloat(expenses[0].amount)).toEqual(150.75);
      expect(expenses[0].description).toEqual('Grocery supplies for children');
      expect(expenses[0].expense_date).toEqual('2024-01-15'); // Date stored as string
      expect(expenses[0].created_at).toBeInstanceOf(Date);
    });

    it('should handle expenses without receipt_url', async () => {
      const inputWithoutReceipt = {
        ...testExpenseInput,
        receipt_url: undefined
      };

      const result = await createExpense(inputWithoutReceipt);

      expect(result.receipt_url).toBeNull();
    });

    it('should throw error for non-existent staff', async () => {
      const inputWithInvalidStaff = {
        ...testExpenseInput,
        staff_id: 999999
      };

      expect(createExpense(inputWithInvalidStaff)).rejects.toThrow(/staff member not found/i);
    });

    it('should handle different expense types', async () => {
      const educationExpense = {
        ...testExpenseInput,
        expense_type: 'EDUCATION' as const,
        description: 'School supplies'
      };

      const result = await createExpense(educationExpense);
      expect(result.expense_type).toEqual('EDUCATION');
      expect(result.description).toEqual('School supplies');
    });

    it('should handle decimal amounts correctly', async () => {
      const decimalExpense = {
        ...testExpenseInput,
        amount: 99.99
      };

      const result = await createExpense(decimalExpense);
      expect(result.amount).toEqual(99.99);
      expect(typeof result.amount).toBe('number');
    });

    it('should handle date conversion correctly', async () => {
      const testDate = new Date('2024-03-15');
      const expenseWithDate = {
        ...testExpenseInput,
        expense_date: testDate
      };

      const result = await createExpense(expenseWithDate);
      expect(result.expense_date).toBeInstanceOf(Date);
      expect(result.expense_date.getTime()).toEqual(testDate.getTime());
    });
  });

  describe('getAllExpenses', () => {
    it('should return empty array when no expenses exist', async () => {
      const result = await getAllExpenses();
      expect(result).toEqual([]);
    });

    it('should return all expenses', async () => {
      // Create multiple expenses
      await createExpense(testExpenseInput);
      await createExpense({
        ...testExpenseInput,
        expense_type: 'HEALTHCARE',
        amount: 200.50,
        description: 'Medical supplies'
      });

      const result = await getAllExpenses();

      expect(result).toHaveLength(2);
      expect(result[0].amount).toEqual(150.75);
      expect(typeof result[0].amount).toBe('number');
      expect(result[1].amount).toEqual(200.50);
      expect(typeof result[1].amount).toBe('number');
      expect(result[0].expense_type).toEqual('FOOD');
      expect(result[1].expense_type).toEqual('HEALTHCARE');
      expect(result[0].expense_date).toBeInstanceOf(Date);
      expect(result[1].expense_date).toBeInstanceOf(Date);
    });

    it('should convert numeric and date fields correctly', async () => {
      await createExpense(testExpenseInput);

      const result = await getAllExpenses();

      expect(result).toHaveLength(1);
      expect(typeof result[0].amount).toBe('number');
      expect(result[0].amount).toEqual(150.75);
      expect(result[0].expense_date).toBeInstanceOf(Date);
    });
  });

  describe('getExpensesByStaffId', () => {
    it('should return empty array for staff with no expenses', async () => {
      const result = await getExpensesByStaffId(staffId);
      expect(result).toEqual([]);
    });

    it('should return expenses for specific staff member', async () => {
      // Create expenses for this staff member
      await createExpense(testExpenseInput);
      await createExpense({
        ...testExpenseInput,
        expense_type: 'UTILITIES',
        amount: 75.25
      });

      // Create another staff member
      const anotherUser = await db.insert(usersTable)
        .values({
          email: 'staff2@test.com',
          password_hash: 'hashedpassword',
          role: 'STAFF'
        })
        .returning()
        .execute();

      const anotherStaff = await db.insert(staffTable)
        .values({
          ...testStaff,
          user_id: anotherUser[0].id,
          full_name: 'Jane Doe'
        })
        .returning()
        .execute();

      // Create expense for other staff
      await createExpense({
        ...testExpenseInput,
        staff_id: anotherStaff[0].id,
        expense_type: 'MAINTENANCE'
      });

      const result = await getExpensesByStaffId(staffId);

      expect(result).toHaveLength(2);
      expect(result.every(expense => expense.staff_id === staffId)).toBe(true);
      expect(result[0].expense_type).toEqual('FOOD');
      expect(result[1].expense_type).toEqual('UTILITIES');
      expect(typeof result[0].amount).toBe('number');
      expect(typeof result[1].amount).toBe('number');
      expect(result[0].expense_date).toBeInstanceOf(Date);
      expect(result[1].expense_date).toBeInstanceOf(Date);
    });

    it('should return empty array for non-existent staff', async () => {
      const result = await getExpensesByStaffId(999999);
      expect(result).toEqual([]);
    });
  });

  describe('getExpenseById', () => {
    it('should return null for non-existent expense', async () => {
      const result = await getExpenseById(999999);
      expect(result).toBeNull();
    });

    it('should return expense by ID', async () => {
      const createdExpense = await createExpense(testExpenseInput);

      const result = await getExpenseById(createdExpense.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdExpense.id);
      expect(result!.staff_id).toEqual(staffId);
      expect(result!.expense_type).toEqual('FOOD');
      expect(result!.amount).toEqual(150.75);
      expect(typeof result!.amount).toBe('number');
      expect(result!.description).toEqual('Grocery supplies for children');
      expect(result!.expense_date).toBeInstanceOf(Date);
    });
  });

  describe('updateExpense', () => {
    let expenseId: number;

    beforeEach(async () => {
      const expense = await createExpense(testExpenseInput);
      expenseId = expense.id;
    });

    it('should return null for non-existent expense', async () => {
      const result = await updateExpense(999999, { amount: 100 });
      expect(result).toBeNull();
    });

    it('should update expense amount', async () => {
      const result = await updateExpense(expenseId, { amount: 225.50 });

      expect(result).not.toBeNull();
      expect(result!.amount).toEqual(225.50);
      expect(typeof result!.amount).toBe('number');
      expect(result!.id).toEqual(expenseId);
      expect(result!.updated_at.getTime()).toBeGreaterThan(result!.created_at.getTime());
    });

    it('should update expense type and description', async () => {
      const updates = {
        expense_type: 'HEALTHCARE' as const,
        description: 'Medical equipment purchase'
      };

      const result = await updateExpense(expenseId, updates);

      expect(result).not.toBeNull();
      expect(result!.expense_type).toEqual('HEALTHCARE');
      expect(result!.description).toEqual('Medical equipment purchase');
      expect(result!.amount).toEqual(150.75); // Should remain unchanged
    });

    it('should update multiple fields', async () => {
      const updates = {
        amount: 300.00,
        expense_type: 'EDUCATION' as const,
        description: 'Books and supplies',
        expense_date: new Date('2024-02-01')
      };

      const result = await updateExpense(expenseId, updates);

      expect(result).not.toBeNull();
      expect(result!.amount).toEqual(300.00);
      expect(result!.expense_type).toEqual('EDUCATION');
      expect(result!.description).toEqual('Books and supplies');
      expect(result!.expense_date).toBeInstanceOf(Date);
      expect(result!.expense_date.getTime()).toEqual(updates.expense_date.getTime());
    });

    it('should throw error when updating to non-existent staff', async () => {
      expect(updateExpense(expenseId, { staff_id: 999999 }))
        .rejects.toThrow(/staff member not found/i);
    });

    it('should update staff_id successfully', async () => {
      // Create another staff member
      const anotherUser = await db.insert(usersTable)
        .values({
          email: 'staff3@test.com',
          password_hash: 'hashedpassword',
          role: 'STAFF'
        })
        .returning()
        .execute();

      const anotherStaff = await db.insert(staffTable)
        .values({
          ...testStaff,
          user_id: anotherUser[0].id,
          full_name: 'Bob Johnson'
        })
        .returning()
        .execute();

      const result = await updateExpense(expenseId, { staff_id: anotherStaff[0].id });

      expect(result).not.toBeNull();
      expect(result!.staff_id).toEqual(anotherStaff[0].id);
    });

    it('should handle partial updates', async () => {
      const result = await updateExpense(expenseId, { receipt_url: 'http://example.com/new-receipt.pdf' });

      expect(result).not.toBeNull();
      expect(result!.receipt_url).toEqual('http://example.com/new-receipt.pdf');
      expect(result!.amount).toEqual(150.75); // Other fields unchanged
      expect(result!.expense_type).toEqual('FOOD');
    });

    it('should handle date updates correctly', async () => {
      const newDate = new Date('2024-12-25');
      const result = await updateExpense(expenseId, { expense_date: newDate });

      expect(result).not.toBeNull();
      expect(result!.expense_date).toBeInstanceOf(Date);
      expect(result!.expense_date.getTime()).toEqual(newDate.getTime());
    });
  });
});
