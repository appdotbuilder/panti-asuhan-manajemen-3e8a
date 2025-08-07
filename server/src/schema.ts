
import { z } from 'zod';

// Enum definitions
export const userRoleEnum = z.enum(['ADMIN', 'CHILD', 'DONOR', 'STAFF']);
export const donationTypeEnum = z.enum(['MONEY', 'GOODS', 'SERVICE']);
export const expenseTypeEnum = z.enum(['FOOD', 'EDUCATION', 'HEALTHCARE', 'UTILITIES', 'MAINTENANCE', 'OTHER']);
export const activityStatusEnum = z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']);
export const participationStatusEnum = z.enum(['REGISTERED', 'ATTENDED', 'ABSENT', 'CANCELLED']);

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleEnum,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Child schemas
export const childSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  full_name: z.string(),
  date_of_birth: z.coerce.date(),
  gender: z.enum(['MALE', 'FEMALE']),
  admission_date: z.coerce.date(),
  health_status: z.string().nullable(),
  education_level: z.string().nullable(),
  photo_url: z.string().nullable(),
  background_story: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Child = z.infer<typeof childSchema>;

export const createChildInputSchema = z.object({
  user_id: z.number(),
  full_name: z.string(),
  date_of_birth: z.coerce.date(),
  gender: z.enum(['MALE', 'FEMALE']),
  admission_date: z.coerce.date(),
  health_status: z.string().nullable().optional(),
  education_level: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  background_story: z.string().nullable().optional()
});

export type CreateChildInput = z.infer<typeof createChildInputSchema>;

// Donor schemas
export const donorSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  full_name: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  organization: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Donor = z.infer<typeof donorSchema>;

export const createDonorInputSchema = z.object({
  user_id: z.number(),
  full_name: z.string(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  organization: z.string().nullable().optional()
});

export type CreateDonorInput = z.infer<typeof createDonorInputSchema>;

// Staff schemas
export const staffSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  full_name: z.string(),
  position: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  hire_date: z.coerce.date(),
  photo_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Staff = z.infer<typeof staffSchema>;

export const createStaffInputSchema = z.object({
  user_id: z.number(),
  full_name: z.string(),
  position: z.string(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  hire_date: z.coerce.date(),
  photo_url: z.string().nullable().optional()
});

export type CreateStaffInput = z.infer<typeof createStaffInputSchema>;

// Donation schemas
export const donationSchema = z.object({
  id: z.number(),
  donor_id: z.number(),
  donation_type: donationTypeEnum,
  amount: z.number().nullable(),
  description: z.string(),
  donation_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Donation = z.infer<typeof donationSchema>;

export const createDonationInputSchema = z.object({
  donor_id: z.number(),
  donation_type: donationTypeEnum,
  amount: z.number().positive().nullable().optional(),
  description: z.string(),
  donation_date: z.coerce.date()
});

export type CreateDonationInput = z.infer<typeof createDonationInputSchema>;

// Expense schemas
export const expenseSchema = z.object({
  id: z.number(),
  staff_id: z.number(),
  expense_type: expenseTypeEnum,
  amount: z.number(),
  description: z.string(),
  expense_date: z.coerce.date(),
  receipt_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Expense = z.infer<typeof expenseSchema>;

export const createExpenseInputSchema = z.object({
  staff_id: z.number(),
  expense_type: expenseTypeEnum,
  amount: z.number().positive(),
  description: z.string(),
  expense_date: z.coerce.date(),
  receipt_url: z.string().nullable().optional()
});

export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

// Activity schemas
export const activitySchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  activity_date: z.coerce.date(),
  location: z.string().nullable(),
  status: activityStatusEnum,
  max_participants: z.number().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Activity = z.infer<typeof activitySchema>;

export const createActivityInputSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  activity_date: z.coerce.date(),
  location: z.string().nullable().optional(),
  max_participants: z.number().positive().nullable().optional(),
  created_by: z.number()
});

export type CreateActivityInput = z.infer<typeof createActivityInputSchema>;

// Activity participation schemas
export const activityParticipationSchema = z.object({
  id: z.number(),
  activity_id: z.number(),
  child_id: z.number(),
  status: participationStatusEnum,
  notes: z.string().nullable(),
  registered_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ActivityParticipation = z.infer<typeof activityParticipationSchema>;

export const createActivityParticipationInputSchema = z.object({
  activity_id: z.number(),
  child_id: z.number(),
  status: participationStatusEnum,
  notes: z.string().nullable().optional()
});

export type CreateActivityParticipationInput = z.infer<typeof createActivityParticipationInputSchema>;

// Audit log schemas
export const auditLogSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  action: z.string(),
  table_name: z.string(),
  record_id: z.number().nullable(),
  old_values: z.string().nullable(),
  new_values: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.coerce.date()
});

export type AuditLog = z.infer<typeof auditLogSchema>;

export const createAuditLogInputSchema = z.object({
  user_id: z.number(),
  action: z.string(),
  table_name: z.string(),
  record_id: z.number().nullable().optional(),
  old_values: z.string().nullable().optional(),
  new_values: z.string().nullable().optional(),
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional()
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogInputSchema>;

// Dashboard schemas
export const dashboardStatsSchema = z.object({
  total_children: z.number(),
  total_donors: z.number(),
  total_staff: z.number(),
  total_donations: z.number(),
  total_expenses: z.number(),
  recent_activities: z.number(),
  active_children: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
