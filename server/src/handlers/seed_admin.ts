import { db } from '../db';
import { usersTable } from '../db/schema';

export const seedDefaultAdmin = async (): Promise<void> => {
  try {
    // Check if any users exist in the database
    const existingUsers = await db.select().from(usersTable).limit(1).execute();
    
    if (existingUsers.length > 0) {
      console.log('Users already exist in the database. Skipping default admin creation.');
      return;
    }

    // Get environment variables
    const defaultEmail = process.env['DEFAULT_ADMIN_EMAIL'];
    const defaultPassword = process.env['DEFAULT_ADMIN_PASSWORD'];

    if (!defaultEmail || !defaultPassword) {
      throw new Error('DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD environment variables must be set');
    }

    // Hash the password
    const passwordHash = await Bun.password.hash(defaultPassword, {
      algorithm: 'bcrypt',
      cost: 10
    });

    // Create the default admin user
    const result = await db.insert(usersTable)
      .values({
        email: defaultEmail,
        password_hash: passwordHash,
        role: 'ADMIN',
        is_active: true
      })
      .returning()
      .execute();

    console.log(`Default admin user created successfully with email: ${defaultEmail}`);
    console.log(`Admin user ID: ${result[0].id}`);
    
  } catch (error) {
    console.error('Failed to seed default admin:', error);
    throw error;
  }
};