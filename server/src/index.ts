
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  loginInputSchema, 
  createUserInputSchema,
  createChildInputSchema,
  createDonorInputSchema,
  createStaffInputSchema,
  createDonationInputSchema,
  createExpenseInputSchema,
  createActivityInputSchema,
  createActivityParticipationInputSchema,
  createAuditLogInputSchema
} from './schema';

// Import handlers
import { loginUser, logoutUser, getCurrentUser } from './handlers/auth';
import { createUser, getAllUsers, getUserById, deactivateUser } from './handlers/users';
import { createChild, getAllChildren, getChildById, updateChild, getChildByUserId } from './handlers/children';
import { createDonor, getAllDonors, getDonorById, getDonorByUserId, updateDonor } from './handlers/donors';
import { createStaff, getAllStaff, getStaffById, getStaffByUserId, updateStaff } from './handlers/staff';
import { createDonation, getAllDonations, getDonationsByDonorId, getDonationById, updateDonation } from './handlers/donations';
import { createExpense, getAllExpenses, getExpensesByStaffId, getExpenseById, updateExpense } from './handlers/expenses';
import { createActivity, getAllActivities, getActivityById, updateActivity, updateActivityStatus } from './handlers/activities';
import { 
  createActivityParticipation, 
  getParticipationsByActivityId, 
  getParticipationsByChildId, 
  updateParticipationStatus, 
  removeActivityParticipation 
} from './handlers/activity_participations';
import { createAuditLog, getAllAuditLogs, getAuditLogsByUserId, getAuditLogsByTableName } from './handlers/audit_logs';
import { 
  getDashboardStats, 
  getRecentDonations, 
  getRecentExpenses, 
  getUpcomingActivities, 
  getMonthlyFinancialSummary 
} from './handlers/dashboard';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),
  logout: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(({ input }) => logoutUser(input.userId)),
  getCurrentUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getCurrentUser(input.userId)),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  createAdminUser: publicProcedure
    .input(z.object({ 
      email: z.string().email(),
      password: z.string().min(1)
    }))
    .mutation(({ input }) => createUser({
      ...input,
      role: 'ADMIN'
    })),
  getAllUsers: publicProcedure
    .query(() => getAllUsers()),
  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),
  deactivateUser: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deactivateUser(input.id)),

  // Children management
  createChild: publicProcedure
    .input(createChildInputSchema)
    .mutation(({ input }) => createChild(input)),
  getAllChildren: publicProcedure
    .query(() => getAllChildren()),
  getChildById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getChildById(input.id)),
  getChildByUserId: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getChildByUserId(input.userId)),
  updateChild: publicProcedure
    .input(z.object({ id: z.number(), data: createChildInputSchema.partial() }))
    .mutation(({ input }) => updateChild(input.id, input.data)),

  // Donors management
  createDonor: publicProcedure
    .input(createDonorInputSchema)
    .mutation(({ input }) => createDonor(input)),
  getAllDonors: publicProcedure
    .query(() => getAllDonors()),
  getDonorById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getDonorById(input.id)),
  getDonorByUserId: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getDonorByUserId(input.userId)),
  updateDonor: publicProcedure
    .input(z.object({ id: z.number(), data: createDonorInputSchema.partial() }))
    .mutation(({ input }) => updateDonor(input.id, input.data)),

  // Staff management
  createStaff: publicProcedure
    .input(createStaffInputSchema)
    .mutation(({ input }) => createStaff(input)),
  getAllStaff: publicProcedure
    .query(() => getAllStaff()),
  getStaffById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getStaffById(input.id)),
  getStaffByUserId: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getStaffByUserId(input.userId)),
  updateStaff: publicProcedure
    .input(z.object({ id: z.number(), data: createStaffInputSchema.partial() }))
    .mutation(({ input }) => updateStaff(input.id, input.data)),

  // Donations management
  createDonation: publicProcedure
    .input(createDonationInputSchema)
    .mutation(({ input }) => createDonation(input)),
  getAllDonations: publicProcedure
    .query(() => getAllDonations()),
  getDonationsByDonorId: publicProcedure
    .input(z.object({ donorId: z.number() }))
    .query(({ input }) => getDonationsByDonorId(input.donorId)),
  getDonationById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getDonationById(input.id)),
  updateDonation: publicProcedure
    .input(z.object({ id: z.number(), data: createDonationInputSchema.partial() }))
    .mutation(({ input }) => updateDonation(input.id, input.data)),

  // Expenses management
  createExpense: publicProcedure
    .input(createExpenseInputSchema)
    .mutation(({ input }) => createExpense(input)),
  getAllExpenses: publicProcedure
    .query(() => getAllExpenses()),
  getExpensesByStaffId: publicProcedure
    .input(z.object({ staffId: z.number() }))
    .query(({ input }) => getExpensesByStaffId(input.staffId)),
  getExpenseById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getExpenseById(input.id)),
  updateExpense: publicProcedure
    .input(z.object({ id: z.number(), data: createExpenseInputSchema.partial() }))
    .mutation(({ input }) => updateExpense(input.id, input.data)),

  // Activities management
  createActivity: publicProcedure
    .input(createActivityInputSchema)
    .mutation(({ input }) => createActivity(input)),
  getAllActivities: publicProcedure
    .query(() => getAllActivities()),
  getActivityById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getActivityById(input.id)),
  updateActivity: publicProcedure
    .input(z.object({ id: z.number(), data: createActivityInputSchema.partial() }))
    .mutation(({ input }) => updateActivity(input.id, input.data)),
  updateActivityStatus: publicProcedure
    .input(z.object({ id: z.number(), status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']) }))
    .mutation(({ input }) => updateActivityStatus(input.id, input.status)),

  // Activity participations
  createActivityParticipation: publicProcedure
    .input(createActivityParticipationInputSchema)
    .mutation(({ input }) => createActivityParticipation(input)),
  getParticipationsByActivityId: publicProcedure
    .input(z.object({ activityId: z.number() }))
    .query(({ input }) => getParticipationsByActivityId(input.activityId)),
  getParticipationsByChildId: publicProcedure
    .input(z.object({ childId: z.number() }))
    .query(({ input }) => getParticipationsByChildId(input.childId)),
  updateParticipationStatus: publicProcedure
    .input(z.object({ 
      id: z.number(), 
      status: z.enum(['REGISTERED', 'ATTENDED', 'ABSENT', 'CANCELLED']) 
    }))
    .mutation(({ input }) => updateParticipationStatus(input.id, input.status)),
  removeActivityParticipation: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => removeActivityParticipation(input.id)),

  // Audit logs
  createAuditLog: publicProcedure
    .input(createAuditLogInputSchema)
    .mutation(({ input }) => createAuditLog(input)),
  getAllAuditLogs: publicProcedure
    .query(() => getAllAuditLogs()),
  getAuditLogsByUserId: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getAuditLogsByUserId(input.userId)),
  getAuditLogsByTableName: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .query(({ input }) => getAuditLogsByTableName(input.tableName)),

  // Dashboard
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
  getRecentDonations: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => getRecentDonations(input.limit)),
  getRecentExpenses: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => getRecentExpenses(input.limit)),
  getUpcomingActivities: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => getUpcomingActivities(input.limit)),
  getMonthlyFinancialSummary: publicProcedure
    .query(() => getMonthlyFinancialSummary()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
