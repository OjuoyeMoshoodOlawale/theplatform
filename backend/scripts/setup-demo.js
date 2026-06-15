/**
 * MYS Platform — Full Demo Setup Script
 * Drops and recreates the DB, seeds admin + realistic demo data
 *
 * Run from: backend/
 *   node scripts/setup-demo.js
 *
 * Uses values from .env (DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT)
 */

import { createPool }  from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt           from 'bcrypt';
import { randomUUID }  from 'crypto';
import dotenv           from 'dotenv';
dotenv.config();

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');   // backend/

/* ── DB connection (no database selected yet — we need to create it) ── */
const pool = createPool({
  host:    process.env.DB_HOST    || 'localhost',
  port:    parseInt(process.env.DB_PORT   || '3306'),
  user:    process.env.DB_USER    || 'root',
  password:process.env.DB_PASS    || '',
  multipleStatements: true,
  waitForConnections: true,
  dateStrings: true,
});

const q    = (...a) => pool.execute(...a);
const line = (msg) => console.log(' ', msg);

/* ── Professional ticket number ─── */
const tNum = (prefix, n) =>
  `${prefix.toUpperCase()}-${new Date().getFullYear().toString().slice(-2)}-${String(n).padStart(6,'0')}`;

/* ── Set event dates relative to TODAY for a realistic demo ── */
const today   = new Date();
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r.toISOString().slice(0,10); };
const fmtTs   = (d)     => new Date(d).toISOString().slice(0,19).replace('T',' ');

/* Event is in 3 weeks — countdown is live on landing page */
const EVENT_START   = addDays(today, 21);
const EVENT_END     = addDays(today, 22);
const EARLY_BIRD_END= fmtTs(addDays(today, 7) + 'T23:59:59');  // 1 week from now

/* ══════════════════════════════════════════════════════════════ */
async function setup() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   MYS Platform — Demo Setup                  ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const DB = process.env.DB_NAME || 'mys_platform';

  /* 1. Drop + recreate database */
  console.log(`🗑️  Resetting database '${DB}'…`);
  await pool.query(`DROP DATABASE IF EXISTS \`${DB}\``);
  await pool.query(`CREATE DATABASE \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await pool.query(`USE \`${DB}\``);
  line(`✅ Database '${DB}' recreated`);

  /* 2. Run schema.sql */
  console.log('\n📐 Creating tables…');
  const schema = readFileSync(join(ROOT, 'src/database/schema.sql'), 'utf-8');
  await pool.query(schema);
  line('✅ 24 tables created');

  await pool.query(`USE \`${DB}\``);

  /* ── Helpers that use the selected DB ── */
  const run  = (sql, params=[]) => pool.execute(sql, params);
  const getId = async (sel, selP) => { const [[row]] = await run(sel, selP); return row?.id || null; };

  /* 3. DEPARTMENTS */
  console.log('\n🏢 Seeding departments…');
  const depts = {
    kitchen:   'Kitchen & Catering',
    gate:      'Gate & Security',
    av:        'AV & Technical',
    transport: 'Transport',
    deco:      'Decoration',
  };
  const deptId = {};
  const deptMeta = [
    ['Kitchen & Catering','Food prep and serving',         'Mama Zainab',  0],
    ['Gate & Security',   'Entry management and checks',   'Alhaji Bukar', 1],
    ['AV & Technical',    'Sound, projectors, streaming',  'Engr. Seun',   2],
    ['Transport',         'Logistics and bus coordination','Mallam Tunde', 3],
    ['Decoration',        'Venue setup and signage',       'Sister Hafsa', 4],
  ];
  for (const [name, desc, head, sort] of deptMeta) {
    await run('INSERT INTO departments (name,description,head_name,sort_order) VALUES (?,?,?,?)', [name,desc,head,sort]);
    deptId[name] = await getId('SELECT id FROM departments WHERE name=?',[name]);
    line(`✅ ${name}`);
  }

  /* 4. ADMINS */
  console.log('\n👤 Seeding admin accounts…');
  const pwAdmin = await bcrypt.hash('MYS@Admin2024!',12);
  const pwGate  = await bcrypt.hash('attend123',12);
  const pwDept  = await bcrypt.hash('dept@123',12);

  const admins = [
    ['MYS Super Admin',  'admin@muslimyouthsummit.com',    pwAdmin,'super_admin',null],
    ['Coordinator Musa', 'musa@muslimyouthsummit.com',     pwAdmin,'admin',      null],
    ['Sister Fatima',    'fatima@muslimyouthsummit.com',   pwAdmin,'admin',      null],
    ['Gate Attendant',   'gate@muslimyouthsummit.com',     pwGate, 'attendant',  null],
    ['Kitchen Team',     'kitchen@muslimyouthsummit.com',  pwDept, 'department', deptId['Kitchen & Catering']],
    ['AV Team',          'av@muslimyouthsummit.com',       pwDept, 'department', deptId['AV & Technical']],
  ];
  const adminId = {};
  for (const [name,email,pw,role,did] of admins) {
    await run('INSERT INTO admins (name,email,password,role,department_id) VALUES (?,?,?,?,?)',[name,email,pw,role,did||null]);
    adminId[email] = await getId('SELECT id FROM admins WHERE email=?',[email]);
    const hint = role==='attendant'?'attend123':role==='department'?'dept@123':'MYS@Admin2024!';
    line(`✅ [${role.padEnd(11)}] ${email} / ${hint}`);
  }
  const SA = adminId['admin@muslimyouthsummit.com'];
  const A1 = adminId['musa@muslimyouthsummit.com'];

  /* 5. GLOBAL CATEGORIES */
  console.log('\n🏷  Seeding categories…');
  const cats = [
    ['Youth (Under 25)',  'Participants aged 18–25',       '#6BBC01',200,0],
    ['Graduate',          'MSc, PhD and postgraduate',     '#9333ea',100,1],
    ['Brothers (Seniors)','Male professionals 25+',        '#1a4fa0', 80,2],
    ['Sisters (Seniors)', 'Female professionals 25+',      '#c94d8c', 80,3],
  ];
  for (const [name,desc,color,cap,sort] of cats) {
    await run('INSERT INTO event_categories (name,description,color,capacity,sort_order) VALUES (?,?,?,?,?)',[name,desc,color,cap,sort]);
  }
  const [catRows] = await run('SELECT id,name FROM event_categories ORDER BY sort_order');
  const cMap = Object.fromEntries(catRows.map(c=>[c.name,c.id]));
  line('✅ Youth, Graduate, Brothers (Seniors), Sisters (Seniors)');

  /* 6. GLOBAL HOSTELS */
  console.log('\n🏠 Seeding hostels…');
  const hostels = [
    ['Khadijah Hall','female',60,'Block A — Female Wing'],
    ['Umar Block',   'male',  60,'Block B — Male Wing'  ],
    ['VIP Annex',    'mixed', 20,'Main Building, Ground Floor'],
  ];
  const hostelId = {};
  for (const [name,gender,beds,loc] of hostels) {
    await run('INSERT INTO hostels (name,gender,beds,location) VALUES (?,?,?,?)',[name,gender,beds,loc]);
    hostelId[name] = await getId('SELECT id FROM hostels WHERE name=?',[name]);
    line(`✅ ${name} (${gender}, ${beds} beds)`);
  }
  const HF=hostelId['Khadijah Hall'], HM=hostelId['Umar Block'], HV=hostelId['VIP Annex'];

  /* 7. MYS2 — COMPLETED PAST EVENT */
  console.log('\n📅 MYS2 (completed past event)…');
  await run(
    `INSERT INTO events (title,edition,slug,tagline,description,start_date,end_date,venue,venue_address,status,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ['Muslim Youth Summit 2.0','MYS2',`mys2-${Date.now()}`,
     "Faith in Action — Building Tomorrow's Leaders Today",
     'The second edition brought together 300+ young Muslims for a day of Islamic learning, career development, and networking.',
     '2024-03-15','2024-03-16','Abuja National Mosque Conference Centre','Airport Road, Central Business District, Abuja, FCT','completed',SA]
  );
  const mys2Id = await getId('SELECT id FROM events WHERE edition=?',['MYS2']);
  const galleryImgs = [
    ['https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop','Opening keynote session'],
    ['https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop','Panel discussion'],
    ['https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop','Networking break'],
    ['https://images.unsplash.com/photo-1517263904808-5dc91e3e7044?w=800&h=600&fit=crop','Packed auditorium'],
    ['https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop','Workshop session'],
    ['https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=600&fit=crop','Group photo'],
  ];
  for (let i=0;i<galleryImgs.length;i++) {
    await run('INSERT INTO event_gallery (event_id,image_url,caption,sort_order,uploaded_by) VALUES (?,?,?,?,?)',
      [mys2Id,galleryImgs[i][0],galleryImgs[i][1],i,SA]);
  }
  line(`✅ MYS2 created (id=${mys2Id}) + 6 gallery images`);

  /* 8. MYS3 — ACTIVE EVENT (happening in 3 weeks) */
  console.log(`\n📅 MYS3 — Active Event (${EVENT_START} to ${EVENT_END})…`);
  await run(
    `INSERT INTO events (title,edition,ticket_prefix,slug,tagline,description,start_date,end_date,
       venue,venue_address,early_bird_closes_at,status,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['Muslim Youth Summit 3.0','MYS3','MYS3',`mys3-${Date.now()}`,
     'Rooted in Faith. Rising in Excellence.',
     `MYS3 is a 2-day intensive programme bringing together Muslim youth from across Nigeria for deep Islamic learning, career empowerment, and community building. Featuring internationally acclaimed scholars, industry leaders, and interactive workshops.

Highlights:
• Lectures on Fiqh, Islamic history and contemporary Muslim affairs
• Career development masterclasses by industry experts
• Networking with 300+ Muslim professionals and students
• Exhibition of Islamic products and services
• Full catering and accommodation available`,
     EVENT_START, EVENT_END,
     'Lagos City Hall',
     '25 Catholic Mission Street, Lagos Island, Lagos',
     EARLY_BIRD_END,
     'active', SA]
  );
  const mys3Id = await getId('SELECT id FROM events WHERE edition=?',['MYS3']);
  line(`✅ MYS3 created (id=${mys3Id}) — starts ${EVENT_START}`);
  line(`   Early bird ends: ${EARLY_BIRD_END}`);

  /* 9. EVENT DAYS */
  await run('INSERT INTO event_days (event_id,day_number,event_date,theme,description) VALUES (?,?,?,?,?)',
    [mys3Id,1,EVENT_START,'Knowledge & Reformation','Deep Islamic learning, scholarly lectures, Qur\'an recitation and spiritual renewal']);
  await run('INSERT INTO event_days (event_id,day_number,event_date,theme,description) VALUES (?,?,?,?,?)',
    [mys3Id,2,EVENT_END,'Career & Leadership','Professional development, networking, and community empowerment']);
  const [dayRows] = await run('SELECT id,day_number FROM event_days WHERE event_id=? ORDER BY day_number',[mys3Id]);
  const D1=dayRows[0].id, D2=dayRows[1].id;
  line(`✅ Day 1 (id=${D1}): Knowledge & Reformation`);
  line(`   Day 2 (id=${D2}): Career & Leadership`);

  /* 10. SPEAKERS */
  console.log('\n🎤 Seeding speakers…');
  const speakers = [
    ['Sheikh Murtadha Gusau','Islamic Scholar & Jurist',
     'One of Nigeria\'s most respected Fiqh scholars. Author of the acclaimed Khutbah Series and several books on contemporary Islamic jurisprudence.',
     'https://randomuser.me/api/portraits/men/45.jpg','sheikh.gusau@example.com','08011000001',0],
    ['Dr. Aisha Mahmoud','Career Development Expert',
     'PhD Organisational Psychology, University of Lagos. 15+ years training young Muslim professionals across West Africa. Founder of Career Muslimah.',
     'https://randomuser.me/api/portraits/women/44.jpg','aisha.mahmoud@example.com','08022000002',1],
    ['Ustaz Ibrahim Aliyu','Youth Counsellor & Speaker',
     'Founder, Muslim Professionals Network Nigeria (5,000+ members). Advocate for youth mental health and Islamic identity in the workplace.',
     'https://randomuser.me/api/portraits/men/32.jpg','ustaz.aliyu@example.com','08033000003',2],
    ['Engr. Bilal Okafor','Tech Entrepreneur',
     'CEO of PayLink fintech (₦2B+ monthly volume). Forbes Africa 30 Under 30 nominee. BEng Computer Engineering, OAU.',
     'https://randomuser.me/api/portraits/men/55.jpg','bilal.okafor@example.com','08044000004',3],
  ];
  const spkIds = [];
  for (const [name,title,bio,photo,email,phone,sort] of speakers) {
    await run('INSERT INTO speakers (event_id,name,title,bio,photo_url,email,phone,sort_order) VALUES (?,?,?,?,?,?,?,?)',
      [mys3Id,name,title,bio,photo,email,phone,sort]);
    spkIds.push(await getId('SELECT id FROM speakers WHERE email=?',[email]));
    line(`✅ ${name}`);
  }
  const [S0,S1,S2,S3] = spkIds;

  /* 11. SCHEDULE */
  console.log('\n📋 Seeding schedule…');
  const sessions = [
    [D1,1,'08:00','08:30','Registration & Welcome Desk',                 'other',   null,                    'Gate Attendant, Coordinator Musa',  null,   null],
    [D1,2,'08:30','09:00',"Fajr Prayer & Qur'an Recitation",              'prayer',  null,                    'Ustaz Ibrahim Aliyu',               null,   null],
    [D1,3,'09:00','10:00','Opening Keynote: Rooted in Faith',             'keynote', 'Sheikh Murtadha Gusau', 'Coordinator Musa, Sister Fatima',   null,   S0  ],
    [D1,4,'10:15','11:30','Fiqh of the Contemporary Muslim',             'lecture', 'Sheikh Murtadha Gusau', 'Coordinator Musa',                  'https://youtube.com/watch?v=mys3-s1', S0],
    [D1,5,'11:30','12:00','Networking & Refreshments',                   'break',   null,                    null,                                null,   null],
    [D1,6,'12:00','13:00','Women in Islam: Empowerment & Identity',       'lecture', 'Dr. Aisha Mahmoud',     'Sister Fatima',                     null,   S1  ],
    [D1,7,'13:00','14:00','Dhuhr Prayer & Lunch',                         'prayer',  null,                    null,                                null,   null],
    [D1,8,'14:00','15:30','Career Development Masterclass',              'workshop','Dr. Aisha Mahmoud',     'Coordinator Musa, Sister Fatima',   'https://youtube.com/watch?v=mys3-s2', S1],
    [D1,9,'15:30','16:00','Asr Prayer',                                  'prayer',  null,                    'Ustaz Ibrahim Aliyu',               null,   null],
    [D2,10,'08:30','09:30','Morning Reflection: The Purposeful Muslim',  'lecture', 'Ustaz Ibrahim Aliyu',   'Gate Attendant',                    null,   S2  ],
    [D2,11,'09:45','11:00','Tech, Business & Islamic Ethics',            'lecture', 'Engr. Bilal Okafor',    'Coordinator Musa',                  null,   S3  ],
    [D2,12,'11:15','12:30','Panel: Faith at the Workplace',              'panel',   'Dr. Aisha Mahmoud',     'Coordinator Musa, Sister Fatima',   null,   S1  ],
    [D2,13,'12:30','13:30','Dhuhr Prayer & Lunch',                       'prayer',  null,                    null,                                null,   null],
    [D2,14,'13:30','15:00','Breakout Sessions by Category',              'workshop',null,                    'Coordinator Musa, Sister Fatima',   null,   null],
    [D2,15,'15:30','16:30','Closing Ceremony & Awards',                  'other',   null,                    'Coordinator Musa',                  null,   null],
  ];
  for (const [eid,sn,st,et,title,ltype,speaker,fac,yt,spk] of sessions) {
    const [r] = await run(
      `INSERT INTO lectures (event_id,event_day_id,s_n,title,lecture_type,main_speaker_name,facilitators,start_time,end_time,youtube_url,sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [mys3Id,eid,sn,title,ltype,speaker,fac,st,et,yt,sn]
    );
    if (spk) await run('INSERT IGNORE INTO lecture_speakers (lecture_id,speaker_id) VALUES (?,?)',[r.insertId,spk]);
  }
  line(`✅ 15 sessions seeded (2 with YouTube links)`);

  /* 12. TICKET TYPES */
  console.log('\n🎟  Seeding ticket types…');
  const ttypes = [
    ['Regular – Undergraduate','undergraduate','For 100–400 level students. Includes all sessions, lunch, and materials.',            3000,2000,200,0],
    ['Regular – Graduate',     'graduate',    'For MSc, PhD and postgraduate students.',                                               5000,3500,100,1],
    ['Professional',           'professional','For working professionals. Includes VIP networking dinner.',                             7000,5000, 80,2],
    ['VIP – With Accommodation','all',        '2-night hostel + priority seating + VIP networking dinner + gift bag.',               15000,12000, 40,3],
  ];
  for (const [name,cat,desc,reg,eb,qty,sort] of ttypes) {
    await run(`INSERT INTO ticket_types (event_id,name,participant_category,description,regular_price,early_bird_price,quantity_available,sort_order)
      VALUES (?,?,?,?,?,?,?,?)`, [mys3Id,name,cat,desc,reg,eb,qty,sort]);
  }
  const [ttRows] = await run('SELECT id,participant_category FROM ticket_types WHERE event_id=? ORDER BY sort_order',[mys3Id]);
  const ttMap = Object.fromEntries(ttRows.map(t=>[t.participant_category,t.id]));
  const TT_UG=ttMap['undergraduate'], TT_GR=ttMap['graduate'], TT_PR=ttMap['professional'], TT_VIP=ttMap['all'];
  line(`✅ 4 ticket types: UG ₦3k|₦2kEB  Grad ₦5k|₦3.5kEB  Prof ₦7k|₦5kEB  VIP ₦15k|₦12kEB`);

  /* 13. PARTICIPANTS & TICKETS */
  console.log('\n👥 Seeding 30 participants & tickets…');
  const PEOPLE = [
    ['Abdullahi Musa Aliyu',   'abdullahi.musa@gmail.com',    '08011111111','male',   'Student',       TT_VIP, 12000],
    ['Fatima Ibrahim Sani',    'fatima.ibrahim@yahoo.com',     '08022222222','female', 'Nurse',         TT_VIP, 12000],
    ['Usman Garba Aliyu',      'usman.garba@outlook.com',      '08033333333','male',   'Engineer',      TT_VIP, 15000],
    ['Aisha Bello Suleiman',   'aisha.bello@gmail.com',        '08044444444','female', 'Teacher',       TT_VIP,  6000], // partial
    ['Ibrahim Yakubu Musa',    'ibrahim.yakubu@gmail.com',     '08055555555','male',   'Doctor',        TT_VIP, 12000],
    ['Khadijah Yusuf Ahmed',   'khadijah.yusuf@hotmail.com',   '08066666666','female', 'Accountant',    TT_UG,  2000],
    ['Mukhtar Danjuma Bello',  'mukhtar.danjuma@gmail.com',    '08077777777','male',   'Lawyer',        TT_UG,  2000],
    ['Maryam Salisu Umar',     'maryam.salisu@gmail.com',      '08088888888','female', 'Entrepreneur',  TT_UG,  2000],
    ['Sulaiman Ahmed Bashir',  'sulaiman.ahmed@gmail.com',     '08099999999','male',   'Student',       TT_UG,  2000],
    ['Hafsa Mohammed Idris',   'hafsa.mohammed@yahoo.com',     '08011222333','female', 'Student',       TT_UG,  2000],
    ['Nurudeen Lawal Shittu',  'nurudeen.lawal@gmail.com',     '08022333444','male',   'Banker',        TT_UG,  2000],
    ['Zainab Tijjani Hassan',  'zainab.tijjani@gmail.com',     '08033444555','female', 'Pharmacist',    TT_UG,  3000], // late reg
    ['Ismail Umar Dantata',    'ismail.umar@outlook.com',      '08044555666','male',   'Student',       TT_GR,  3500],
    ['Ruqayyah Hassan Kano',   'ruqayyah.hassan@gmail.com',    '08055666777','female', 'Doctor',        TT_GR,  3500],
    ['Aminu Sani Abdullahi',   'aminu.sani@gmail.com',         '08066777888','male',   'Engineer',      TT_GR,  3500],
    ['Bilqis Abdullahi Wada',  'bilqis.abdullahi@yahoo.com',   '08077888999','female', 'Student',       TT_GR,  3500],
    ['Yusuf Danjuma Magaji',   'yusuf.danjuma@gmail.com',      '08088999000','male',   'Architect',     TT_GR,  3500],
    ['Nana Idris Abdulkadir',  'nana.idris@gmail.com',         '08099000111','female', 'Researcher',    TT_GR,  3500],
    ['Tajudeen Olawale Ahmed', 'tajudeen.olawale@gmail.com',   '08012345678','male',   'Student',       TT_GR,  5000], // full price
    ['Firdausi Garba Sule',    'firdausi.garba@gmail.com',     '08023456789','female', 'Civil Servant', TT_PR,  5000],
    ['Haruna Yakubu Tsoho',    'haruna.yakubu@outlook.com',    '08034567890','male',   'Teacher',       TT_PR,  5000],
    ['Safiya Bashir Musa',     'safiya.bashir@gmail.com',      '08045678901','female', 'Student',       TT_PR,  5000],
    ['Tukur Abdulkadir Wali',  'tukur.abdulkadir@gmail.com',   '08056789012','male',   'Consultant',    TT_PR,  5000],
    ['Umma Ibrahim Hassan',    'umma.ibrahim@yahoo.com',       '08067890123','female', 'Nurse',         TT_PR,  5000],
    ['Kamal Hassan Dikko',     'kamal.hassan@gmail.com',       '08078901234','male',   'Student',       TT_PR,  5000],
    ['Asiya Musa Faruk',       'asiya.musa@gmail.com',         '08089012345','female', 'Journalist',    TT_PR,  5000],
    ['Bashir Usman Maikudi',   'bashir.usman@outlook.com',     '08090123456','male',   'IT Officer',    TT_UG,  3000],
    ['Halima Sani Gwarzo',     'halima.sani@gmail.com',        '08001234567','female', 'Student',       TT_UG,  2000],
    ['Jibril Adamu Ruma',      'jibril.adamu@gmail.com',       '08012340987','male',   'Researcher',    TT_UG,  2000],
    ['Munirat Lawan Borno',    'munirat.lawan@yahoo.com',      '08023451098','female', 'Economist',     TT_UG,  3000],
  ];

  const partIds = [], ticketIds = [], soldCnt = {[TT_VIP]:0,[TT_UG]:0,[TT_GR]:0,[TT_PR]:0};
  const getCat = (gender,i) => {
    if(i<5) return gender==='female'?cMap['Sisters (Seniors)']:cMap['Brothers (Seniors)'];
    if(i<12) return cMap['Youth (Under 25)'];
    if(i<19) return cMap['Graduate'];
    return gender==='female'?cMap['Sisters (Seniors)']:cMap['Brothers (Seniors)'];
  };

  for (let i=0;i<PEOPLE.length;i++) {
    const [name,email,phone,gender,occ,ttId,amtPaid] = PEOPLE[i];
    const [ins] = await run(
      'INSERT INTO participants (name,email,phone,gender,occupation,email_subscribed) VALUES (?,?,?,?,?,1)',
      [name,email,phone,gender,occ]
    );
    const pId = ins.insertId; partIds.push(pId);

    const [ttRow] = await run('SELECT regular_price FROM ticket_types WHERE id=?',[ttId]);
    const price   = parseFloat(ttRow[0]?.regular_price || amtPaid);
    const balDue  = Math.max(0, price - amtPaid);
    const uniqNum = tNum('MYS3', i+1);
    const ref     = `DEMO-${randomUUID().slice(0,8).toUpperCase()}`;
    const catId   = getCat(gender,i);

    const [tr] = await run(
      `INSERT INTO tickets (event_id,ticket_type_id,participant_id,category_id,unique_number,
         amount_paid,balance_due,payment_method,is_early_bird,status,purchased_at,paystack_reference)
       VALUES (?,?,?,?,?,?,?,'paystack',1,'paid',DATE_SUB(NOW(),INTERVAL ? DAY),?)`,
      [mys3Id,ttId,pId,catId,uniqNum,amtPaid,balDue,Math.floor(Math.random()*14)+1,ref]
    );
    ticketIds.push(tr.insertId);
    soldCnt[ttId] = (soldCnt[ttId]||0)+1;
  }
  for (const [id,cnt] of Object.entries(soldCnt)) {
    await run('UPDATE ticket_types SET quantity_sold=? WHERE id=?',[cnt,id]);
  }
  line(`✅ 30 participants, 30 tickets (VIP:${soldCnt[TT_VIP]}, UG:${soldCnt[TT_UG]}, Grad:${soldCnt[TT_GR]}, Prof:${soldCnt[TT_PR]})`);
  line(`   Ticket #4 (Aisha) has partial payment — ₦6,000 of ₦15,000 → balance ₦9,000`);

  /* 14. CHECK-INS (first 18 participants already checked in today) */
  console.log('\n✅ Seeding check-ins (today)…');
  for (let i=0;i<18;i++) {
    const [,,, gender]=PEOPLE[i]; const tId=ticketIds[i], pId=partIds[i];
    const minsAgo = (18-i)*12;  // spread over last 3.5 hours
    const [et] = await run(
      `INSERT INTO event_tags (event_id,tag_number,ticket_id,participant_id,assigned_at,assigned_by)
       VALUES (?,?,?,?,DATE_SUB(NOW(),INTERVAL ? MINUTE),?)`,
      [mys3Id,`TAG-${String(i+1).padStart(3,'0')}`,tId,pId,minsAgo,A1]
    );
    const tagId=et.insertId;
    if (i<6) {
      // 6 have checked out
      await run(
        `INSERT INTO attendance (event_id,ticket_id,tag_id,checked_in_at,checked_out_at,check_in_by)
         VALUES (?,?,?,DATE_SUB(NOW(),INTERVAL ? MINUTE),DATE_SUB(NOW(),INTERVAL ? MINUTE),?)`,
        [mys3Id,tId,tagId,minsAgo,Math.floor(minsAgo/2),A1]
      );
    } else {
      await run(
        `INSERT INTO attendance (event_id,ticket_id,tag_id,checked_in_at,check_in_by)
         VALUES (?,?,?,DATE_SUB(NOW(),INTERVAL ? MINUTE),?)`,
        [mys3Id,tId,tagId,minsAgo,A1]
      );
    }
    const hId = i<5?HV:gender==='female'?HF:HM;
    await run(
      `INSERT INTO hostel_assignments (hostel_id,event_id,ticket_id,participant_id,room_number,assigned_by)
       VALUES (?,?,?,?,?,?)`,
      [hId,mys3Id,tId,pId,`Room ${i+1}`,A1]
    );
  }
  line(`✅ 18 checked in today, 6 checked out, 18 hostel assignments`);

  /* 15. TICKET GROWTH SNAPSHOTS (for dashboard chart) */
  for (const [d,sold,rev,cin,cout] of [
    [6,4,12000,0,0],[5,8,24000,0,0],[4,13,39000,0,0],
    [3,19,57000,0,0],[2,25,76000,0,0],[1,28,85500,0,0],[0,30,92000,18,6],
  ]) {
    const dt = new Date(today); dt.setDate(dt.getDate()-d);
    await run(
      `INSERT INTO event_snapshots (event_id,snapshot_date,tickets_sold,revenue,checked_in,checked_out) VALUES (?,?,?,?,?,?)`,
      [mys3Id, dt.toISOString().slice(0,10), sold, rev, cin, cout]
    );
  }
  line(`✅ 7-day growth snapshots`);

  /* 16. EXPENSE REQUESTS */
  console.log('\n💰 Seeding expense requests…');
  const kitA = adminId['kitchen@muslimyouthsummit.com'];
  const DK=deptId['Kitchen & Catering'], DA=deptId['AV & Technical'], DT=deptId['Transport'];
  const expenses = [
    [DK,'Cooking gas — Day 1 & 2 (10 cylinders)',           45000,'urgent', 'paid',    45000,45000, 7],
    [DK,'Food ingredients — Day 1 lunch (300 participants)',120000,'normal','approved',110000,null, 4],
    [DK,'Serving equipment hire',                            18000,'low',   'pending', null,  null, 2],
    [DA,'PA System & microphone hire',                       75000,'urgent','paid',    75000,75000, 8],
    [DA,'Live streaming equipment',                          55000,'normal','approved', 50000,null, 5],
    [DA,'Backup generator diesel',                           22000,'normal','pending', null,  null, 1],
    [DT,'Bus hire — speaker airport pickups',                80000,'urgent','approved', 80000,null, 4],
    [DK,'Extra water dispensers (rejected)',                  8000,'low',   'rejected', null,  null, 6],
  ];
  for (const [did,title,amt,pri,status,appAmt,paidAmt,dAgo] of expenses) {
    const isApp=['approved','paid'].includes(status), isPaid=status==='paid';
    await run(
      `INSERT INTO expense_requests (department_id,event_id,title,amount_requested,amount_approved,amount_paid,status,priority,raised_by,approved_by,paid_by,raise_note,approve_note,created_at,approved_at,paid_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,DATE_SUB(NOW(),INTERVAL ? DAY),${isApp?'DATE_SUB(NOW(),INTERVAL ? DAY)':'NULL'},${isPaid?'DATE_SUB(NOW(),INTERVAL 1 DAY)':'NULL'})`,
      [did,mys3Id,title,amt,appAmt||null,paidAmt||null,status,pri,kitA,isApp?SA:null,isPaid?SA:null,
       `Request: ${title}`,isApp&&status!=='rejected'?'Approved. Proceed with purchase.':status==='rejected'?'Rejected. Use existing budget.':null,
       dAgo,...(isApp?[Math.max(1,dAgo-1)]:[])
      ]
    );
    line(`✅ [${status.padEnd(8)}] ${title.slice(0,50)}`);
  }

  /* 17. SOUVENIRS */
  console.log('\n🛍  Seeding souvenirs…');
  const souvenirs = [
    ['MYS3 Classic T-Shirt','Premium cotton tee, MYS3 design. Sizes S-XXL.',5000,150,
     'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',0],
    ['MYS3 Hardcover Notebook','A5 notebook, Islamic geometric cover, 200 pages.',2500,300,
     'https://images.unsplash.com/photo-1517971129774-8a2b38fa128e?w=400&h=400&fit=crop',1],
    ['MYS3 Canvas Tote Bag','Eco-friendly canvas tote with MYS logo.',3500,200,
     'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=400&fit=crop',2],
    ['MYS3 Ceramic Mug','350ml mug with MYS3 design and hadith inscription.',2000,100,
     'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop',3],
  ];
  for (const [name,desc,price,qty,img,sort] of souvenirs) {
    await run(
      'INSERT INTO souvenirs (event_id,name,description,price,available_qty,image_url,sort_order) VALUES (?,?,?,?,?,?,?)',
      [mys3Id,name,desc,price,qty,img,sort]
    );
    line(`✅ ${name} — ₦${price.toLocaleString()}`);
  }

  /* 18. SPONSORS */
  console.log('\n⭐ Seeding sponsors…');
  const sponsors = [
    [mys3Id,'Dangote Foundation',    'https://logo.clearbit.com/dangote.com',           'https://dangote.com',          'title',   0],
    [mys3Id,'MTN Nigeria',           'https://logo.clearbit.com/mtnonline.com',          'https://mtnonline.com',        'gold',    1],
    [mys3Id,'First Bank Nigeria',    'https://logo.clearbit.com/firstbankng.com',        'https://firstbankng.com',      'gold',    2],
    [null,  'Jaiz Bank',             'https://logo.clearbit.com/jaizbankplc.com',        'https://jaizbankplc.com',      'silver',  3],
    [mys3Id,'The Nation Newspaper',  'https://logo.clearbit.com/thenationonlineng.net',  'https://thenationonlineng.net','media',   4],
    [null,  'Islam Channel',         'https://logo.clearbit.com/islamchannel.tv',        'https://islamchannel.tv',      'partner', 5],
  ];
  for (const [evid,name,logo,website,tier,sort] of sponsors) {
    await run('INSERT INTO sponsors (event_id,name,logo_url,website_url,tier,sort_order) VALUES (?,?,?,?,?,?)',
      [evid,name,logo,website,tier,sort]);
    line(`✅ [${tier.padEnd(7)}] ${name}`);
  }

  /* 19. EMAIL CAMPAIGNS */
  await run(
    `INSERT INTO email_campaigns (event_id,subject,body_html,recipient_type,status,created_by) VALUES (?,?,?,?,?,?)`,
    [mys3Id,'MYS3 — Final Reminder! See you soon In sha Allah',
     `<div style="font-family:sans-serif;max-width:600px;padding:32px;background:#FBF6E6">
<h1 style="color:#02462E">Assalamu Alaikum, {{name}}!</h1>
<p>MYS3 is just days away. We can't wait to see you!</p>
<div style="background:#02462E;color:white;padding:20px;margin:20px 0">
<h2 style="color:#FEC700;margin:0 0 6px">Muslim Youth Summit 3.0</h2>
<p style="margin:0;opacity:.8">${EVENT_START} to ${EVENT_END} · Lagos City Hall</p></div>
<p>Remember to bring your ticket QR code and arrive 30 minutes early.</p>
<p style="color:#888;font-size:13px">The MYS Team — muslimyouthsummit.com</p></div>`,
     'all','draft',SA]
  );
  line(`✅ 1 draft email campaign`);

  /* ══════════════════════════════════════════════════════════ */
  const D = '═'.repeat(64);
  console.log('\n' + D);
  console.log('🎉  Demo Setup Complete!\n');

  console.log('  ADMIN LOGINS:');
  console.log('  ┌──────────────────────────────────────────────────────────────┐');
  console.log('  │ super_admin  admin@muslimyouthsummit.com  MYS@Admin2024!     │');
  console.log('  │ admin        musa@muslimyouthsummit.com   MYS@Admin2024!     │');
  console.log('  │ admin        fatima@muslimyouthsummit.com MYS@Admin2024!     │');
  console.log('  │ attendant    gate@muslimyouthsummit.com   attend123           │');
  console.log('  │ department   kitchen@…                    dept@123            │');
  console.log('  └──────────────────────────────────────────────────────────────┘');

  console.log('\n  EVENT:');
  console.log(`  MYS3 is ACTIVE — starts in 21 days (${EVENT_START})`);
  console.log(`  Countdown is LIVE on the landing page`);
  console.log(`  Early bird ends: ${EARLY_BIRD_END}`);

  console.log('\n  DEMO DATA READY:');
  console.log('  • 30 participants registered (VIP, UG, Grad, Professional)');
  console.log('  • 18 checked in TODAY — check-ins spread over last 3.5 hours');
  console.log('  • 6 checked out · 18 hostel assignments');
  console.log('  • Ticket #4 (Aisha Bello) has ₦9,000 balance due — demo partial payment');
  console.log('  • 8 expense requests across departments');
  console.log('  • 4 souvenirs with product images');
  console.log('  • 6 sponsors (Dangote title, MTN/FirstBank gold)');
  console.log('  • MYS2 completed with gallery (6 photos)');
  console.log('  • 15 sessions in schedule with speakers linked');
  console.log(D + '\n');

  await pool.end();
  process.exit(0);
}

setup().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
