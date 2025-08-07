#!/usr/bin/env bun

import { seedDefaultAdmin } from './seed_admin';

// Execute if this file is run directly
if (import.meta.main) {
  seedDefaultAdmin()
    .then(() => {
      console.log('Default admin seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Default admin seeding failed:', error);
      process.exit(1);
    });
}