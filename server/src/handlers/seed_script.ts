import 'dotenv/config';
import { seedDefaultAdmin } from './seed_admin';

console.log('Starting admin seeding process...');

seedDefaultAdmin()
  .then(() => {
    console.log('Admin seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Admin seeding failed:', error);
    process.exit(1);
  });