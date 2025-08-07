
import { serial, text, pgTable, timestamp, numeric, integer, boolean, date, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'CHILD', 'DONOR', 'STAFF']);
export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE']);
export const donationTypeEnum = pgEnum('donation_type', ['MONEY', 'GOODS', 'SERVICE']);
export const expenseTypeEnum = pgEnum('expense_type', ['FOOD', 'EDUCATION', 'HEALTHCARE', 'UTILITIES', 'MAINTENANCE', 'OTHER']);
export const activityStatusEnum = pgEnum('activity_status', ['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']);
export const participationStatusEnum = pgEnum('participation_status', ['REGISTERED', 'ATTENDED', 'ABSENT', 'CANCELLED']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Children table
export const childrenTable = pgTable('children', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  full_name: text('full_name').notNull(),
  date_of_birth: date('date_of_birth').notNull(),
  gender: genderEnum('gender').notNull(),
  admission_date: date('admission_date').notNull(),
  health_status: text('health_status'),
  education_level: text('education_level'),
  photo_url: text('photo_url'),
  background_story: text('background_story'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Donors table
export const donorsTable = pgTable('donors', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  full_name: text('full_name').notNull(),
  phone: text('phone'),
  address: text('address'),
  organization: text('organization'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Staff table
export const staffTable = pgTable('staff', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  full_name: text('full_name').notNull(),
  position: text('position').notNull(),
  phone: text('phone'),
  address: text('address'),
  hire_date: date('hire_date').notNull(),
  photo_url: text('photo_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Donations table
export const donationsTable = pgTable('donations', {
  id: serial('id').primaryKey(),
  donor_id: integer('donor_id').references(() => donorsTable.id).notNull(),
  donation_type: donationTypeEnum('donation_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }),
  description: text('description').notNull(),
  donation_date: date('donation_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Expenses table
export const expensesTable = pgTable('expenses', {
  id: serial('id').primaryKey(),
  staff_id: integer('staff_id').references(() => staffTable.id).notNull(),
  expense_type: expenseTypeEnum('expense_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  expense_date: date('expense_date').notNull(),
  receipt_url: text('receipt_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Activities table
export const activitiesTable = pgTable('activities', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  activity_date: timestamp('activity_date').notNull(),
  location: text('location'),
  status: activityStatusEnum('status').notNull().default('PLANNED'),
  max_participants: integer('max_participants'),
  created_by: integer('created_by').references(() => staffTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Activity participation table
export const activityParticipationsTable = pgTable('activity_participations', {
  id: serial('id').primaryKey(),
  activity_id: integer('activity_id').references(() => activitiesTable.id).notNull(),
  child_id: integer('child_id').references(() => childrenTable.id).notNull(),
  status: participationStatusEnum('status').notNull().default('REGISTERED'),
  notes: text('notes'),
  registered_at: timestamp('registered_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Audit logs table
export const auditLogsTable = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  action: text('action').notNull(),
  table_name: text('table_name').notNull(),
  record_id: integer('record_id'),
  old_values: text('old_values'),
  new_values: text('new_values'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ one }) => ({
  child: one(childrenTable),
  donor: one(donorsTable),
  staff: one(staffTable)
}));

export const childrenRelations = relations(childrenTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [childrenTable.user_id],
    references: [usersTable.id]
  }),
  participations: many(activityParticipationsTable)
}));

export const donorsRelations = relations(donorsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [donorsTable.user_id],
    references: [usersTable.id]
  }),
  donations: many(donationsTable)
}));

export const staffRelations = relations(staffTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [staffTable.user_id],
    references: [usersTable.id]
  }),
  expenses: many(expensesTable),
  activities: many(activitiesTable)
}));

export const donationsRelations = relations(donationsTable, ({ one }) => ({
  donor: one(donorsTable, {
    fields: [donationsTable.donor_id],
    references: [donorsTable.id]
  })
}));

export const expensesRelations = relations(expensesTable, ({ one }) => ({
  staff: one(staffTable, {
    fields: [expensesTable.staff_id],
    references: [staffTable.id]
  })
}));

export const activitiesRelations = relations(activitiesTable, ({ one, many }) => ({
  creator: one(staffTable, {
    fields: [activitiesTable.created_by],
    references: [staffTable.id]
  }),
  participations: many(activityParticipationsTable)
}));

export const activityParticipationsRelations = relations(activityParticipationsTable, ({ one }) => ({
  activity: one(activitiesTable, {
    fields: [activityParticipationsTable.activity_id],
    references: [activitiesTable.id]
  }),
  child: one(childrenTable, {
    fields: [activityParticipationsTable.child_id],
    references: [childrenTable.id]
  })
}));

export const auditLogsRelations = relations(auditLogsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [auditLogsTable.user_id],
    references: [usersTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  children: childrenTable,
  donors: donorsTable,
  staff: staffTable,
  donations: donationsTable,
  expenses: expensesTable,
  activities: activitiesTable,
  activityParticipations: activityParticipationsTable,
  auditLogs: auditLogsTable
};
