/**
 * seed-admin.js — Insert admin accounts only (no other data)
 * Useful after a fresh schema run when you just need to log in.
 *
 * Run from: backend/
 *   node scripts/seed-admin.js
 */

import { createPool }  from 'mysql2/promise';
import bcrypt          from 'bcrypt';
import dotenv          from 'dotenv';
dotenv.config();

const pool = createPool({
  host:    process.env.DB_HOST || 'localhost',
  port:    parseInt(process.env.DB_PORT || '3306'),
  user:    process.env.DB_USER || 'root',
  password:process.env.DB_PASS || '',
  database:process.env.DB_NAME || 'mys_platform',
  waitForConnections: true,
});

async function run() {
  console.log('\n👤 Inserting admin accounts…\n');

  const pwAdmin = await bcrypt.hash('MYS@Admin2024!', 12);
  const pwGate  = await bcrypt.hash('attend123',      12);
  const pwDept  = await bcrypt.hash('dept@123',       12);

  const accounts = [
    { name:'MYS Super Admin',  email:'admin@muslimyouthsummit.com',   pw:pwAdmin, role:'super_admin' },
    { name:'Coordinator Musa', email:'musa@muslimyouthsummit.com',    pw:pwAdmin, role:'admin'       },
    { name:'Sister Fatima',    email:'fatima@muslimyouthsummit.com',  pw:pwAdmin, role:'admin'       },
    { name:'Gate Attendant',   email:'gate@muslimyouthsummit.com',    pw:pwGate,  role:'attendant'   },
  ];

  for (const { name, email, pw, role } of accounts) {
    await pool.execute(
      `INSERT INTO admins (name, email, password, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name)`,
      [name, email, pw, role]
    );
    const hint = role === 'attendant' ? 'attend123' : 'MYS@Admin2024!';
    console.log(`  ✅ [${role.padEnd(11)}] ${email.padEnd(42)} ${hint}`);
  }

  console.log('\n  ┌──────────────────────────────────────────────────────┐');
  console.log('  │ URL:    http://localhost:5173/admin/login             │');
  console.log('  │ Email:  admin@muslimyouthsummit.com                   │');
  console.log('  │ Pass:   MYS@Admin2024!                                │');
  console.log('  └──────────────────────────────────────────────────────┘\n');

  await pool.end();
}

run().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
