/**
 * MYS Platform - Database Seeder
 * Run: node src/database/seed.js
 * Creates the initial super_admin account.
 */
import { createPool } from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mys_platform',
});

const SUPER_ADMIN = {
  name: 'MYS Super Admin',
  email: 'admin@muslimyouthsummit.com',
  password: 'MYS@Admin2024!',
  role: 'super_admin',
};

async function seed() {
  console.log('🌱 Seeding MYS Platform database...');
  try {
    const hash = await bcrypt.hash(SUPER_ADMIN.password, 12);
    await pool.execute(
      `INSERT INTO admins (name, email, password, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role)`,
      [SUPER_ADMIN.name, SUPER_ADMIN.email, hash, SUPER_ADMIN.role]
    );
    console.log('✅ Super admin created:');
    console.log(`   Email   : ${SUPER_ADMIN.email}`);
    console.log(`   Password: ${SUPER_ADMIN.password}`);
    console.log('\n⚠️  Change the default password after first login!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
