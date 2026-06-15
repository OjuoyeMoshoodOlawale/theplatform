/**
 * MYS Platform — Demo Seed v5
 * Schema-verified. Proper image URLs (Unsplash + RandomUser portraits).
 * node src/database/seed.demo.js
 */

import { createPool } from 'mysql2/promise';
import bcrypt         from 'bcrypt';
import { randomUUID } from 'crypto';
import dotenv         from 'dotenv';
dotenv.config();

const pool = createPool({
  host:               process.env.DB_HOST    || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER    || 'root',
  password:           process.env.DB_PASS    || '',
  database:           process.env.DB_NAME    || 'mys_platform',
  multipleStatements: true,
  waitForConnections: true,
  dateStrings:        true,
});

const q    = (...a) => pool.execute(...a);
const log  = (m) => console.log(`  ${m}`);
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '-' + Date.now();
const tNum = (ed, n) => `${ed.toUpperCase()}-${new Date().getFullYear().toString().slice(-2)}-${String(n).padStart(6,'0')}`;
const tagN = (n) => `TAG-${String(n).padStart(3,'0')}`;

const upsertId = async (ins, insP, sel, selP) => {
  await q(ins, insP);
  const [[row]] = await q(sel, selP);
  if (!row) throw new Error('Lookup failed: ' + sel);
  return row.id;
};

/* ── Image URL constants ─────────────────────────────────────
   All sourced from Unsplash (free, no auth for direct photo URLs)
   and RandomUser.me for portrait photos
   ──────────────────────────────────────────────────────────── */
const IMG = {
  // Gallery — conference / youth event / Islamic learning
  conf_keynote:   'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&auto=format',
  conf_panel:     'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop&auto=format',
  conf_networking:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop&auto=format',
  conf_audience:  'https://images.unsplash.com/photo-1517263904808-5dc91e3e7044?w=800&h=600&fit=crop&auto=format',
  conf_workshop:  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop&auto=format',
  conf_group:     'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=600&fit=crop&auto=format',

  // Speakers — professional portraits
  speaker_male_1: 'https://randomuser.me/api/portraits/men/45.jpg',  // Sheikh
  speaker_fem_1:  'https://randomuser.me/api/portraits/women/44.jpg', // Dr. Aisha
  speaker_male_2: 'https://randomuser.me/api/portraits/men/32.jpg',  // Ustaz
  speaker_male_3: 'https://randomuser.me/api/portraits/men/55.jpg',  // Engr.
  speaker_male_4: 'https://randomuser.me/api/portraits/men/67.jpg',  // MYS2 speaker
  speaker_fem_2:  'https://randomuser.me/api/portraits/women/68.jpg', // MYS2 speaker

  // Souvenirs — clean product photography
  tshirt:   'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&auto=format',
  notebook: 'https://images.unsplash.com/photo-1517971129774-8a2b38fa128e?w=400&h=400&fit=crop&auto=format',
  totebag:  'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=400&fit=crop&auto=format',
  mug:      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop&auto=format',

  // Sponsor logos — transparent PNG from CDN
  // Using logo.dev (free tier, works without API key for basic logos)
  logo_mtn:    'https://logo.clearbit.com/mtnonline.com',
  logo_first:  'https://logo.clearbit.com/firstbanknigeria.com',
  logo_nation: 'https://logo.clearbit.com/thenationonlineng.net',
  // For sponsors without clearbit, use placeholder with brand colors
  logo_dangote: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=200&h=80&fit=crop&auto=format',
  logo_jaiz:   'https://logo.clearbit.com/jaizbankplc.com',
  logo_islam:  'https://logo.clearbit.com/islamchannel.tv',
};

/* ── 30 Nigerian participants ──────────────────────────────── */
const PEOPLE = [
  ['Abdullahi Musa',   'abdullahi.musa@gmail.com',    '08011111111','male',   'Student'      ],
  ['Fatima Ibrahim',   'fatima.ibrahim@yahoo.com',     '08022222222','female', 'Nurse'        ],
  ['Usman Aliyu',      'usman.aliyu@outlook.com',      '08033333333','male',   'Engineer'     ],
  ['Aisha Suleiman',   'aisha.suleiman@gmail.com',     '08044444444','female', 'Teacher'      ],
  ['Ibrahim Garba',    'ibrahim.garba@gmail.com',      '08055555555','male',   'Doctor'       ],
  ['Khadijah Yusuf',   'khadijah.yusuf@hotmail.com',   '08066666666','female', 'Accountant'   ],
  ['Mukhtar Bello',    'mukhtar.bello@gmail.com',      '08077777777','male',   'Lawyer'       ],
  ['Maryam Salisu',    'maryam.salisu@gmail.com',      '08088888888','female', 'Entrepreneur' ],
  ['Sulaiman Ahmed',   'sulaiman.ahmed@gmail.com',     '08099999999','male',   'Student'      ],
  ['Hafsa Mohammed',   'hafsa.mohammed@yahoo.com',     '08011222333','female', 'Student'      ],
  ['Nurudeen Lawal',   'nurudeen.lawal@gmail.com',     '08022333444','male',   'Banker'       ],
  ['Zainab Tijjani',   'zainab.tijjani@gmail.com',     '08033444555','female', 'Pharmacist'   ],
  ['Ismail Umar',      'ismail.umar@outlook.com',      '08044555666','male',   'Student'      ],
  ['Ruqayyah Hassan',  'ruqayyah.hassan@gmail.com',    '08055666777','female', 'Doctor'       ],
  ['Aminu Sani',       'aminu.sani@gmail.com',         '08066777888','male',   'Engineer'     ],
  ['Bilqis Abdullahi', 'bilqis.abdullahi@yahoo.com',   '08077888999','female', 'Student'      ],
  ['Yusuf Danjuma',    'yusuf.danjuma@gmail.com',      '08088999000','male',   'Architect'    ],
  ['Nana Idris',       'nana.idris@gmail.com',         '08099000111','female', 'Researcher'   ],
  ['Tajudeen Olawale', 'tajudeen.olawale@gmail.com',   '08012345678','male',   'Student'      ],
  ['Firdausi Garba',   'firdausi.garba@gmail.com',     '08023456789','female', 'Civil Servant'],
  ['Haruna Yakubu',    'haruna.yakubu@outlook.com',    '08034567890','male',   'Teacher'      ],
  ['Safiya Bashir',    'safiya.bashir@gmail.com',      '08045678901','female', 'Student'      ],
  ['Tukur Abdulkadir', 'tukur.abdulkadir@gmail.com',   '08056789012','male',   'Consultant'   ],
  ['Umma Ibrahim',     'umma.ibrahim@yahoo.com',       '08067890123','female', 'Nurse'        ],
  ['Kamal Hassan',     'kamal.hassan@gmail.com',       '08078901234','male',   'Student'      ],
  ['Asiya Musa',       'asiya.musa@gmail.com',         '08089012345','female', 'Journalist'   ],
  ['Bashir Usman',     'bashir.usman@outlook.com',     '08090123456','male',   'IT Officer'   ],
  ['Halima Sani',      'halima.sani@gmail.com',        '08001234567','female', 'Student'      ],
  ['Jibril Adamu',     'jibril.adamu@gmail.com',       '08012340987','male',   'Researcher'   ],
  ['Munirat Lawan',    'munirat.lawan@yahoo.com',      '08023451098','female', 'Economist'    ],
];

async function seed() {
  console.log('\n🌱  MYS Demo Seed v5\n');

  /* 1. DEPARTMENTS */
  console.log('🏢 Departments...');
  const deptId = {};
  for (const [name, description, head_name, sort_order] of [
    ['Kitchen & Catering','Food preparation and serving for all participants',    'Mama Zainab',  0],
    ['Gate & Security',   'Entry management, ID verification, crowd control',    'Alhaji Bukar', 1],
    ['AV & Technical',    'Sound system, projectors, recording, live streaming', 'Engr. Seun',   2],
    ['Transport',         'Participant logistics, bus coordination',              'Mallam Tunde', 3],
    ['Decoration',        'Venue setup, signage, banners, aesthetic design',     'Sister Hafsa', 4],
  ]) {
    deptId[name] = await upsertId(
      'INSERT INTO departments (name,description,head_name,sort_order) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE head_name=VALUES(head_name)',
      [name,description,head_name,sort_order],
      'SELECT id FROM departments WHERE name=?',[name]
    );
    log(`✅ ${name}`);
  }

  /* 2. ADMINS */
  console.log('\n👤 Admins...');
  const pwA = await bcrypt.hash('MYS@Admin2024!',12);
  const pwG = await bcrypt.hash('attend123',12);
  const pwD = await bcrypt.hash('dept@123',12);
  const adminId = {};
  for (const [name,email,pw,role,deptName] of [
    ['MYS Super Admin', 'admin@muslimyouthsummit.com',   pwA,'super_admin',null                  ],
    ['Coordinator Musa','musa@muslimyouthsummit.com',    pwA,'admin',      null                  ],
    ['Sister Fatima',   'fatima@muslimyouthsummit.com',  pwA,'admin',      null                  ],
    ['Gate Attendant',  'gate@muslimyouthsummit.com',    pwG,'attendant',  null                  ],
    ['Kitchen Team',    'kitchen@muslimyouthsummit.com', pwD,'department', 'Kitchen & Catering'  ],
    ['AV Team',         'av@muslimyouthsummit.com',      pwD,'department', 'AV & Technical'      ],
  ]) {
    adminId[email] = await upsertId(
      'INSERT INTO admins (name,email,password,role,department_id) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
      [name,email,pw,role,deptName?deptId[deptName]:null],
      'SELECT id FROM admins WHERE email=?',[email]
    );
    const hint = role==='attendant'?'attend123':role==='department'?'dept@123':'MYS@Admin2024!';
    log(`✅ [${role}] ${email} — ${hint}`);
  }
  const SA = adminId['admin@muslimyouthsummit.com'];
  const A1 = adminId['musa@muslimyouthsummit.com'];

  /* 3. GLOBAL CATEGORIES (no event_id) */
  console.log('\n🏷  Categories...');
  for (const [name,description,color,capacity,sort_order] of [
    ['Youth (Under 25)',  'Young participants aged 18–25',              '#6BBC01',200,0],
    ['Graduate',          'MSc, PhD and postgraduate students',          '#9333ea',100,1],
    ['Brothers (Seniors)','Male professionals and alumni 25+',           '#1a4fa0', 80,2],
    ['Sisters (Seniors)', 'Female professionals and alumni 25+',         '#c94d8c', 80,3],
  ]) {
    await q('INSERT INTO event_categories (name,description,color,capacity,sort_order) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE color=VALUES(color)',
      [name,description,color,capacity,sort_order]);
    log(`✅ ${name}`);
  }
  const [catRows] = await q('SELECT id,name FROM event_categories ORDER BY sort_order');
  const cMap={};
  for(const c of catRows) cMap[c.name]=c.id;
  const catYouth=cMap['Youth (Under 25)'], catGrad=cMap['Graduate'],
        catBro=cMap['Brothers (Seniors)'], catSis=cMap['Sisters (Seniors)'];

  /* 4. GLOBAL HOSTELS (column: beds) */
  console.log('\n🏠 Hostels...');
  const hostelId = {};
  for (const [name,gender,beds,location,description] of [
    ['Khadijah Hall','female',60,'Block A — Female Wing',          'Dedicated female accommodation wing, air-conditioned'],
    ['Umar Block',   'male',  60,'Block B — Male Wing',            'Male accommodation block, includes prayer room'],
    ['VIP Annex',    'mixed', 20,'Main Building — Ground Floor',   'Premium rooms for VIP ticket holders, en-suite'],
  ]) {
    hostelId[name] = await upsertId(
      'INSERT INTO hostels (name,gender,beds,location,description) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE beds=VALUES(beds)',
      [name,gender,beds,location,description],
      'SELECT id FROM hostels WHERE name=?',[name]
    );
    log(`✅ ${name} (${gender}, ${beds} beds)`);
  }
  const hostelF=hostelId['Khadijah Hall'], hostelM=hostelId['Umar Block'], hostelVIP=hostelId['VIP Annex'];

  /* 5. MYS2 — COMPLETED PAST EVENT */
  console.log('\n📅 MYS2 (completed)...');
  const mys2Id = await upsertId(
    `INSERT INTO events (title,edition,slug,tagline,description,start_date,end_date,venue,venue_address,status,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status='completed'`,
    ['Muslim Youth Summit 2.0','MYS2',slug('mys2'),
     "Faith in Action — Building Tomorrow's Leaders Today",
     'The second edition of the Muslim Youth Summit brought together over 300 young Muslim professionals and students for a landmark day of Islamic learning, career development, and spiritual renewal. Themed "Faith in Action", it featured keynote addresses from renowned scholars, interactive career workshops, and meaningful networking sessions.',
     '2024-03-15','2024-03-16','Abuja National Mosque Conference Centre',
     'Airport Road, Central Business District, Abuja, FCT','completed',SA],
    'SELECT id FROM events WHERE edition=?',['MYS2']
  );
  log(`✅ MYS2 id=${mys2Id}`);

  // MYS2 gallery — real Unsplash conference images
  let gallerySort = 0;
  for (const [url,caption] of [
    [IMG.conf_keynote,    'Opening keynote session — Faith in Action'],
    [IMG.conf_panel,      'Panel discussion: The Muslim professional in modern Nigeria'],
    [IMG.conf_networking, 'Networking break — building connections'],
    [IMG.conf_group,      'Group photo — all MYS2 participants'],
    [IMG.conf_workshop,   'Career development workshop session'],
    [IMG.conf_audience,   'Packed auditorium during keynote address'],
  ]) {
    await q('INSERT IGNORE INTO event_gallery (event_id,image_url,caption,sort_order,uploaded_by) VALUES (?,?,?,?,?)',
      [mys2Id, url, caption, gallerySort++, SA]);
  }
  log(`✅ MYS2 gallery — 6 images`);

  // MYS2 speakers with portrait photos
  for (const [name,title,bio,photo_url,sort_order] of [
    ['Sheikh Musa Al-Gusau','Islamic Scholar',
     'Renowned Fiqh scholar and lecturer from Gusau, Zamfara. Specialist in contemporary Islamic jurisprudence.',
     IMG.speaker_male_4, 0],
    ['Dr. Amina Yusuf','Professor of Islamic Studies',
     'Associate Professor of Islamic Studies at Bayero University Kano. Author of three books on Islamic education.',
     IMG.speaker_fem_2, 1],
  ]) {
    await q('INSERT INTO speakers (event_id,name,title,bio,photo_url,sort_order) VALUES (?,?,?,?,?,?)',
      [mys2Id,name,title,bio,photo_url,sort_order]);
  }
  log(`✅ MYS2 speakers — 2`);

  /* 6. MYS3 — ACTIVE EVENT */
  console.log('\n📅 MYS3 (active)...');
  const yr = new Date().getFullYear() + 1;
  const mys3Id = await upsertId(
    `INSERT INTO events (title,edition,ticket_prefix,slug,tagline,description,start_date,end_date,
       venue,venue_address,early_bird_closes_at,status,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status='active'`,
    ['Muslim Youth Summit 3.0','MYS3','MYS3',slug('mys3'),
     'Rooted in Faith. Rising in Excellence.',
     `MYS3 is a transformative 2-day programme bringing together Muslim youth from across Nigeria for deep Islamic learning, career empowerment, and community building. Featuring internationally acclaimed scholars, industry leaders, and interactive workshops, MYS3 promises to be the most impactful edition yet.

Attendees will benefit from:
• Lectures on Fiqh, Islamic history, and contemporary Muslim affairs
• Career development masterclasses by industry experts
• Networking with 300+ Muslim professionals and students
• Exhibition of Islamic products and services`,
     `${yr}-07-12`,`${yr}-07-13`,
     'Lagos City Hall','25 Catholic Mission Street, Lagos Island, Lagos',
     `${yr}-06-30 23:59:59`,'active',SA],
    'SELECT id FROM events WHERE edition=?',['MYS3']
  );
  log(`✅ MYS3 id=${mys3Id} — ${yr}-07-12 to ${yr}-07-13`);

  /* 7. MYS3 EVENT DAYS */
  for (const [day_number,event_date,theme,description] of [
    [1,`${yr}-07-12`,'Knowledge & Reformation',  'Deep Islamic learning, scholarly lectures, and spiritual renewal'],
    [2,`${yr}-07-13`,'Career & Leadership',       'Professional development, networking, and community building'],
  ]) {
    await q('INSERT INTO event_days (event_id,day_number,event_date,theme,description) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE theme=VALUES(theme)',
      [mys3Id,day_number,event_date,theme,description]);
  }
  const [dayRows] = await q('SELECT id,day_number FROM event_days WHERE event_id=? ORDER BY day_number',[mys3Id]);
  const day1Id=dayRows[0].id, day2Id=dayRows[1]?.id||dayRows[0].id;
  log(`✅ Day 1 id=${day1Id}, Day 2 id=${day2Id}`);

  /* 8. MYS3 SPEAKERS — with photo_url, email, phone */
  console.log('\n🎤 Speakers...');
  const spkIds = [];
  for (const [name,title,bio,photo_url,email,phone,sort_order] of [
    ['Sheikh Murtadha Gusau','Islamic Scholar & Jurist',
     'One of Nigeria\'s most respected Fiqh scholars, known for his accessible approach to Islamic jurisprudence. Author of the acclaimed "Khutbah Series" and several books on contemporary Muslim affairs. Regular contributor to national Islamic discourse.',
     IMG.speaker_male_1,'sheikh.gusau@example.com','08011000001',0],
    ['Dr. Aisha Mahmoud','Career Development Expert & Organisational Psychologist',
     'PhD in Organisational Psychology, University of Lagos. 15+ years training young Muslim professionals across West Africa. Founder of the Career Muslimah programme. Regular speaker at TEDx events.',
     IMG.speaker_fem_1,'aisha.mahmoud@example.com','08022000002',1],
    ['Ustaz Ibrahim Aliyu','Youth Counsellor, Speaker & Mentor',
     'Founder of the Muslim Professionals Network Nigeria (MPNN) with 5,000+ members. Passionate advocate for youth mental health and Islamic identity in the modern workplace. Regular contributor to national media.',
     IMG.speaker_male_2,'ustaz.aliyu@example.com','08033000003',2],
    ['Engr. Bilal Okafor','Tech Entrepreneur & Innovator',
     'CEO of PayLink, a Lagos-based fintech startup processing N2B+ monthly. Forbes Africa 30 Under 30 nominee. BEng Computer Engineering, OAU. Passionate about Islamic fintech and ethical technology.',
     IMG.speaker_male_3,'bilal.okafor@example.com','08044000004',3],
  ]) {
    const [r] = await q('INSERT INTO speakers (event_id,name,title,bio,photo_url,email,phone,sort_order) VALUES (?,?,?,?,?,?,?,?)',
      [mys3Id,name,title,bio,photo_url,email,phone,sort_order]);
    spkIds.push(r.insertId);
    log(`✅ ${name}`);
  }
  const [spk0,spk1,spk2,spk3] = spkIds;

  /* 9. MYS3 SCHEDULE — with event_day_id and youtube_url */
  console.log('\n📋 Schedule...');
  /* ─── Schedule: Real Islamic Lecture Content ──────────────── */
  const schedData = [

    // ── DAY 1: Knowledge & Reformation ─────────────────────────

    [day1Id, 1,'08:00','08:30',
      'Registration, Tag Collection & Welcome Desk',
      'other', null, 'Gate Attendant, Coordinator Musa', null, null],

    [day1Id, 2,'08:30','09:00',
      "Fajr Prayer & Qur'an Recitation — Surah Al-Kahf (Verses 1–10 & 103–110)",
      'prayer', null, 'Ustaz Ibrahim Aliyu', null, null],

    [day1Id, 3,'09:00','10:00',
      "Opening Keynote: Who Are We? Rebuilding the Islamic Identity of Nigerian Youth — Drawing on the hadith of the Prophet ﷺ: 'Islam began as something strange and will return to being strange, so give glad tidings to the strangers.' What does it mean to be a Muslim youth in 21st century Nigeria?",
      'keynote', 'Sheikh Murtadha Gusau', 'Coordinator Musa, Sister Fatima',
      'https://www.youtube.com/watch?v=LXb3EKWsInQ', spk0],

    [day1Id, 4,'10:15','11:45',
      "Al-Aqeedah First: Why Correct Belief Is the Foundation of Every Good Deed — A deep study of the Six Pillars of Iman and their practical implications for the Muslim youth in a secular society. Addressing modern doubts about Tawheed, the reality of Shirk in our daily lives, and how atheism is spreading among Muslim youth through social media",
      'lecture', 'Sheikh Murtadha Gusau', 'Coordinator Musa',
      'https://www.youtube.com/watch?v=LXb3EKWsInQ', spk0],

    [day1Id, 5,'11:45','12:15',
      'Networking Break — Tea, Refreshments & Dua Cards',
      'break', null, null, null, null],

    [day1Id, 6,'12:15','13:15',
      "The Muslim Woman Today: Reclaiming the Narrative — How Islam truly elevates women above all other systems. A lecture addressing the hijab pressure in the workplace, gender mixing in offices, the right to education and career from Islamic sources, and how Muslim women are breaking barriers without compromising their deen",
      'lecture', 'Dr. Aisha Mahmoud', 'Sister Fatima', null, spk1],

    [day1Id, 7,'13:15','14:15',
      "Dhuhr Prayer, Lunch & Group Dhikr — Recitation of Subhanallah (33×), Alhamdulillah (33×), Allahu Akbar (34×) after Salah",
      'prayer', null, 'Ustaz Ibrahim Aliyu', null, null],

    [day1Id, 8,'14:15','15:45',
      "Career Success Without Compromising Your Deen: The Prophetic Framework for Professional Excellence — Based on the hadith: 'Verily Allah loves that when any of you does a job, he does it with itqan (proficiency/excellence)'. Practical session covering CV writing, interview skills, salary negotiation, office politics, and navigating haram situations at work — all from an Islamic lens",
      'workshop', 'Dr. Aisha Mahmoud', 'Coordinator Musa, Sister Fatima',
      'https://www.youtube.com/watch?v=LXb3EKWsInQ', spk1],

    [day1Id, 9,'15:45','16:15',
      "Asr Prayer & Tazkiyah Moment — Short reminder on the importance of Salah in the life of the Muslim youth",
      'prayer', null, 'Ustaz Ibrahim Aliyu', null, null],

    [day1Id,10,'16:15','17:00',
      "Tazkiyah: Purifying the Heart in the Age of Social Media — Lessons from Imam Al-Ghazali's Ihya Ulum Al-Deen on fighting the nafs, curing the disease of the heart (hasad, kibr, riya), overcoming social media addiction, and keeping the heart alive through consistent dhikr and Quran",
      'lecture', 'Ustaz Ibrahim Aliyu', 'Coordinator Musa',
      'https://www.youtube.com/watch?v=LXb3EKWsInQ', spk2],

    // ── DAY 2: Career & Leadership ──────────────────────────────

    [day2Id,11,'08:30','09:15',
      "Morning Motivation: The Hadith of the Three Questions — The Prophet ﷺ said every son of Adam will be questioned about: his life, his youth, his wealth and how he earned and spent it, and his knowledge. An energising session to set the tone for Day 2 with actionable goals",
      'lecture', 'Ustaz Ibrahim Aliyu', 'Gate Attendant', null, spk2],

    [day2Id,12,'09:30','11:00',
      "Halal Tech, Fintech & Entrepreneurship with Barakah — Is crypto halal? How to identify riba in Nigerian financial products (loans, mortgages, insurance). Building tech startups on Islamic principles. Case studies of successful Muslim entrepreneurs in Nigeria and beyond. The concept of Sadaqah Jariyah through business",
      'lecture', 'Engr. Bilal Okafor', 'Coordinator Musa',
      'https://www.youtube.com/watch?v=LXb3EKWsInQ', spk3],

    [day2Id,13,'11:15','12:30',
      "Panel: Staying on the Deen in the Nigerian Corporate World — How do you handle: mixed-gender team hangouts, Christmas office parties, Friday Jumu'ah vs board meetings, office gossip and backbiting, colleagues pressuring you to compromise? Real talk with professionals sharing lived experiences",
      'panel', 'Dr. Aisha Mahmoud', 'Coordinator Musa, Sister Fatima', null, spk1],

    [day2Id,14,'12:30','13:30',
      "Dhuhr Prayer, Lunch & Group Supplication — Special Du'a for Nigerian Muslim youth, parents and the Ummah",
      'prayer', null, null, null, null],

    [day2Id,15,'13:30','15:00',
      "Breakout Sessions by Category — YOUTH: Staying firm on the Deen in University (mixing, alcohol pressure, relationships) | GRADUATE: Postgrad scholarships, Islamic studies abroad & postgrad life | PROFESSIONAL: Islamic leadership, management styles from the Seerah, navigating office politics Islamically",
      'workshop', null, 'Coordinator Musa, Sister Fatima, Ustaz Ibrahim Aliyu', null, null],

    [day2Id,16,'15:00','15:30',
      "Asr Prayer & Du'a for the Ummah — Special supplication led by Sheikh Murtadha Gusau for Nigeria, Palestine and all Muslim communities",
      'prayer', null, 'Sheikh Murtadha Gusau', null, null],

    [day2Id,17,'15:30','16:30',
      "Closing Ceremony: Covenant of Excellence — Awards for most engaged participants, pledge by all attendees to carry the knowledge home, group nasheeed recitation, and final du'a. In sha Allah, see you at MYS4!",
      'other', null, 'Coordinator Musa', null, null],
  ];
  for (const [event_day_id,s_n,st,et,title,ltype,speaker,fac,yt,spkId] of schedData) {
    const [r] = await q(
      `INSERT INTO lectures (event_id,event_day_id,s_n,title,lecture_type,main_speaker_name,facilitators,start_time,end_time,youtube_url,sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [mys3Id,event_day_id,s_n,title,ltype,speaker,fac,st,et,yt,s_n]
    );
    if (spkId) await q('INSERT IGNORE INTO lecture_speakers (lecture_id,speaker_id,sort_order) VALUES (?,?,0)',[r.insertId,spkId]);
  }
  log(`✅ ${schedData.length} sessions with real Islamic lecture content`);

  /* 10. TICKET TYPES */
  console.log('\n🎟  Ticket types...');
  for (const [name,pc,desc,reg,eb,qty,sort] of [
    ['Regular – Undergraduate','undergraduate','For 100–400 level university students. Includes all sessions, lunch, and programme materials.',                3000,2000,200,0],
    ['Regular – Graduate',     'graduate',    'For MSc, PhD, and postgraduate students. Includes all sessions, lunch, and materials.',                         5000,3500,100,1],
    ['Professional',           'professional','For working professionals and alumni 25+. Includes all sessions, VIP networking dinner, and materials.',          7000,5000, 80,2],
    ['VIP – With Accommodation','all',        'All-inclusive: 2 nights hostel accommodation + priority seating + VIP networking dinner + gift bag.',           15000,12000, 40,3],
  ]) {
    await q(`INSERT INTO ticket_types (event_id,name,participant_category,description,regular_price,early_bird_price,quantity_available,sort_order)
       VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE regular_price=VALUES(regular_price)`,
      [mys3Id,name,pc,desc,reg,eb,qty,sort]);
  }
  const [ttRows] = await q('SELECT id,participant_category FROM ticket_types WHERE event_id=? ORDER BY sort_order',[mys3Id]);
  const ttUG=ttRows.find(t=>t.participant_category==='undergraduate')?.id;
  const ttGR=ttRows.find(t=>t.participant_category==='graduate')?.id;
  const ttPR=ttRows.find(t=>t.participant_category==='professional')?.id;
  const ttVIP=ttRows.find(t=>t.participant_category==='all')?.id;
  log(`✅ 4 ticket types: UG ₦3k/₦2k, Grad ₦5k/₦3.5k, Prof ₦7k/₦5k, VIP ₦15k/₦12k`);

  /* 11. PARTICIPANTS & TICKETS */
  console.log('\n👥 Participants & tickets...');
  const getTT = (i) => {
    if(i<5)  return {ttId:ttVIP, price:12000, isEB:1};
    if(i<12) return {ttId:ttUG,  price: 2000, isEB:1};
    if(i<19) return {ttId:ttGR,  price: 3500, isEB:1};
    if(i<26) return {ttId:ttPR,  price: 5000, isEB:1};
    return          {ttId:ttUG,  price: 3000, isEB:0}; // late reg
  };
  const getCat = (i,g) => {
    if(i<5)  return g==='female'?catSis:catBro;
    if(i<12) return catYouth;
    if(i<19) return catGrad;
    if(i<26) return g==='female'?catSis:catBro;
    return catYouth;
  };

  const partIds=[], ticketIds=[], sold={[ttVIP]:0,[ttUG]:0,[ttGR]:0,[ttPR]:0};

  for (let i=0; i<PEOPLE.length; i++) {
    const [name,email,phone,gender,occupation] = PEOPLE[i];
    // Lookup by email+name (allows family members to share email)
    const [ex] = await q('SELECT id FROM participants WHERE email=? AND name=?',[email.toLowerCase(),name.trim()]);
    let pId;
    if (ex.length) {
      pId = ex[0].id;
      await q('UPDATE participants SET phone=?,updated_at=NOW() WHERE id=?',[phone,pId]);
    } else {
      const [ins] = await q(
        'INSERT INTO participants (name,email,phone,gender,occupation,email_subscribed) VALUES (?,?,?,?,?,1)',
        [name.trim(),email.toLowerCase(),phone,gender,occupation]
      );
      pId = ins.insertId;
    }
    partIds.push(pId);

    const {ttId,price,isEB} = getTT(i);
    const catId     = getCat(i,gender);
    const uniqueNum = tNum('MYS3', i+1);
    const ref       = `DEMO-${randomUUID().slice(0,8).toUpperCase()}`;
    // Last 5 participants have partial payments (balance due)
    const amtPaid   = i >= 25 ? Math.round(price * 0.5) : price;
    const balDue    = price - amtPaid;

    const [tr] = await q(
      `INSERT INTO tickets (event_id,ticket_type_id,participant_id,category_id,unique_number,
         amount_paid,balance_due,payment_method,is_early_bird,status,purchased_at,paystack_reference)
       VALUES (?,?,?,?,?,?,?,'cash',?,'paid',NOW(),?)`,
      [mys3Id,ttId,pId,catId,uniqueNum,amtPaid,balDue,isEB,ref]
    );
    ticketIds.push(tr.insertId);
    sold[ttId] = (sold[ttId]||0)+1;
  }
  for (const [id,cnt] of Object.entries(sold)) {
    if (cnt>0) await q('UPDATE ticket_types SET quantity_sold=? WHERE id=?',[cnt,id]);
  }
  log(`✅ 30 tickets — VIP:${sold[ttVIP]} UG:${sold[ttUG]} Grad:${sold[ttGR]} Prof:${sold[ttPR]}`);
  log(`   Tickets #26-30 have partial payments (50% paid, balance_due > 0)`);

  /* 12. CHECK-INS (first 18) + HOSTEL ASSIGNMENTS */
  console.log('\n✅ Check-ins & hostel assignments...');
  for (let i=0; i<18; i++) {
    const [,,, gender] = PEOPLE[i];
    const tId=ticketIds[i], pId=partIds[i], inHrs=18-i;
    const [et] = await q(
      `INSERT INTO event_tags (event_id,tag_number,ticket_id,participant_id,assigned_at,assigned_by)
       VALUES (?,?,?,?,DATE_SUB(NOW(),INTERVAL ? HOUR),?)`,
      [mys3Id,tagN(i+1),tId,pId,inHrs,A1]
    );
    const tagId = et.insertId;
    if (i < 6) {
      // First 6 also checked out
      const outHrs = Math.max(1, Math.floor(inHrs/2));
      await q(
        `INSERT INTO attendance (event_id,ticket_id,tag_id,checked_in_at,checked_out_at,check_in_by)
         VALUES (?,?,?,DATE_SUB(NOW(),INTERVAL ? HOUR),DATE_SUB(NOW(),INTERVAL ? HOUR),?)`,
        [mys3Id,tId,tagId,inHrs,outHrs,A1]
      );
    } else {
      await q(
        `INSERT INTO attendance (event_id,ticket_id,tag_id,checked_in_at,checked_out_at,check_in_by)
         VALUES (?,?,?,DATE_SUB(NOW(),INTERVAL ? HOUR),NULL,?)`,
        [mys3Id,tId,tagId,inHrs,A1]
      );
    }
    const hId = i<5 ? hostelVIP : gender==='female' ? hostelF : hostelM;
    await q(
      `INSERT INTO hostel_assignments (hostel_id,event_id,ticket_id,participant_id,room_number,assigned_by)
       VALUES (?,?,?,?,?,?)`,
      [hId,mys3Id,tId,pId,`Room ${i+1}`,A1]
    );
  }
  log(`✅ 18 check-ins (6 also checked out), 18 hostel assignments`);

  /* 13. EVENT SNAPSHOTS (7-day growth trend) */
  const today = new Date();
  for (const [dAgo,sold_,rev,cin,cout] of [
    [6, 3, 9000, 0, 0],[5, 7,21000, 0, 0],[4,12,36000, 0, 0],
    [3,18,54500, 0, 0],[2,24,73000, 0, 0],[1,28,85500, 0, 0],
    [0,30,92000,18, 6],
  ]) {
    const d = new Date(today); d.setDate(d.getDate()-dAgo);
    await q(
      `INSERT INTO event_snapshots (event_id,snapshot_date,tickets_sold,revenue,checked_in,checked_out)
       VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE tickets_sold=VALUES(tickets_sold)`,
      [mys3Id, d.toISOString().slice(0,10), sold_, rev, cin, cout]
    );
  }
  log(`✅ 7-day growth snapshots`);

  /* 14. EMAIL CAMPAIGNS */
  await q(`INSERT INTO email_campaigns (event_id,subject,body_html,recipient_type,status,created_by)
    VALUES (?,?,?,?,?,?)`, [
    mys3Id, 'MYS3 — Final Reminder! See you soon In sha Allah',
    `<div style="font-family:'Segoe UI',sans-serif;max-width:600px;background:#FBF6E6;padding:32px 24px">
<img src="https://muslimyouthsummit.com/logos/logo-black.png" style="height:44px;margin-bottom:20px" alt="MYS"/>
<h1 style="color:#02462E;font-size:26px;margin:0 0 12px">Assalamu Alaikum, {{name}}!</h1>
<p style="color:#444;line-height:1.8">We cannot wait to see you at MYS3 — just a few days away!</p>
<div style="background:#02462E;color:white;padding:20px 24px;margin:20px 0">
  <h2 style="margin:0 0 6px;color:#FEC700">Muslim Youth Summit 3.0</h2>
  <p style="margin:0;opacity:.8">July 12–13, ${yr} &nbsp;·&nbsp; Lagos City Hall, Lagos Island</p>
</div>
<p style="color:#444;line-height:1.8">Please remember to:</p>
<ul style="color:#555;line-height:2">
  <li>Bring your ticket QR code (screenshot or printed)</li>
  <li>Arrive at least 30 minutes before sessions begin</li>
  <li>Dress modestly as per Islamic guidelines</li>
</ul>
<p style="color:#888;font-size:13px;margin-top:24px">JazakAllahu Khayran &nbsp;·&nbsp; The MYS Team</p>
</div>`,
    'all','draft',SA]);
  await q(`INSERT INTO email_campaigns (event_id,subject,body_html,recipient_type,status,
    recipient_count,sent_count,failed_count,sent_at,created_by) VALUES (?,?,?,?,?,?,?,?,DATE_SUB(NOW(),INTERVAL 14 DAY),?)`, [
    mys2Id, 'MYS3 Registration Is Now Open — Early Bird Ends June 30!',
    '<p>Registration for <strong>Muslim Youth Summit 3.0</strong> is now open. Early bird tickets available until June 30. Visit muslimyouthsummit.com to secure your spot.</p>',
    'past_attendees','sent',145,143,2,SA]);
  log(`✅ 2 email campaigns (1 draft, 1 sent)`);

  /* 15. EXPENSE REQUESTS */
  console.log('\n💰 Expense requests...');
  const kitA = adminId['kitchen@muslimyouthsummit.com'];
  const KIT=deptId['Kitchen & Catering'], AV=deptId['AV & Technical'], TRN=deptId['Transport'];
  for (const [dId,title,amt,priority,status,appAmt,paidAmt,dAgo] of [
    [KIT,'Cooking gas — Day 1 & Day 2 (10 cylinders)',                        45000,'urgent', 'paid',    45000,45000, 7],
    [KIT,'Food ingredients — Day 1 lunch (300 participants)',                 120000,'normal','approved',110000,null, 4],
    [KIT,'Serving equipment hire (trays, chafing dishes, cutlery)',            18000,'low',   'pending', null,  null, 2],
    [AV, 'PA system & professional microphone hire',                           75000,'urgent','paid',    75000,75000, 8],
    [AV, 'Live streaming equipment (cameras, capture cards, cables)',          55000,'normal','approved', 50000,null, 5],
    [AV, 'Backup generator diesel (60 litres)',                                22000,'normal','pending', null,  null, 1],
    [TRN,'Bus hire — speaker airport pickups (2 buses, July 11)',              80000,'urgent','approved', 80000,null, 4],
    [KIT,'Extra water dispensers (rejected — use existing budget)',             8000,'low',   'rejected', null,  null, 6],
  ]) {
    const isApp=['approved','paid'].includes(status);
    const isPaid=status==='paid';
    await q(
      `INSERT INTO expense_requests (department_id,event_id,title,amount_requested,amount_approved,amount_paid,
         status,priority,raised_by,approved_by,paid_by,raise_note,approve_note,pay_note,
         created_at,approved_at,paid_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,
         DATE_SUB(NOW(),INTERVAL ? DAY),
         ${isApp?'DATE_SUB(NOW(),INTERVAL ? DAY)':'NULL'},
         ${isPaid?'DATE_SUB(NOW(),INTERVAL 1 DAY)':'NULL'})`,
      [dId,mys3Id,title,amt,appAmt||null,paidAmt||null,status,priority,kitA,
       isApp?SA:null,isPaid?SA:null,
       `Request from ${['Kitchen & Catering','AV & Technical','Transport'][KIT===dId?0:AV===dId?1:2]} team.`,
       isApp&&status!=='rejected'?'Approved. Proceed with purchase and submit receipts.':status==='rejected'?'Rejected — use existing budget allocation.':null,
       isPaid?`MYS3-EXP-${Math.floor(Math.random()*9000+1000)}`:null,
       dAgo,...(isApp?[Math.max(1,dAgo-1)]:[])
      ]
    );
    log(`✅ [${status.padEnd(8)}] ${title.slice(0,50)}`);
  }

  /* 16. SOUVENIRS — with proper product images */
  console.log('\n🛍  Souvenirs...');
  for (const [name,description,price,available_qty,image_url,sort_order] of [
    ['MYS3 Classic T-Shirt',
     '100% premium cotton T-shirt featuring the MYS3 logo and Islamic geometric pattern. Available in sizes S, M, L, XL, XXL. Unisex fit.',
     5000, 150, IMG.tshirt, 0],
    ['MYS3 Hardcover Notebook',
     'A5 hardcover notebook with Islamic geometric cover design, 200 pages acid-free paper. Perfect for notes during sessions.',
     2500, 300, IMG.notebook, 1],
    ['MYS3 Canvas Tote Bag',
     'Eco-friendly 100% canvas tote bag with MYS logo embroidery. Spacious main compartment. Perfect for daily use.',
     3500, 200, IMG.totebag, 2],
    ['MYS3 Ceramic Mug',
     'High-quality ceramic mug (350ml) with MYS3 design and hadith inscription. Microwave and dishwasher safe.',
     2000, 100, IMG.mug, 3],
  ]) {
    await q(
      `INSERT INTO souvenirs (event_id,name,description,price,available_qty,image_url,sort_order)
       VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE price=VALUES(price)`,
      [mys3Id,name,description,price,available_qty,image_url,sort_order]
    );

    log(`✅ ${name} — ₦${price.toLocaleString()}`);
  }

  /* 17-extra. DEMO SOUVENIR ORDERS (so admin orders tab is not empty) */
  {
    const [svRows] = await q('SELECT id, price FROM souvenirs WHERE event_id=? ORDER BY sort_order', [mys3Id]);
    const yy2 = new Date().getFullYear().toString().slice(-2);
    const demos = [
      ['Fatima Ibrahim',    'fatima.ibrahim@yahoo.com', '08022222222', 1, 'paid',      2],
      ['Abdullahi Musa',    'abdullahi.musa@gmail.com', '08011111111', 2, 'paid',      5],
      ['Hajiya Bilkisu',    'bilkisu@gmail.com',         '08055000001', 1, 'delivered', 7],
      ['Ahmed Bello',       'ahmed.bello@outlook.com',   '08066000002', 1, 'pending',   1],
    ];
    for (let i = 0; i < demos.length; i++) {
      const [bname, bemail, bphone, qty, status, dAgo] = demos[i];
      const sv        = svRows[i % svRows.length];
      if (!sv) continue;
      const unitPrice = parseFloat(sv.price);
      const total     = unitPrice * qty;
      const orderNum  = `SVN-${yy2}-${String(i + 1).padStart(6,'0')}`;
      const ref       = `DEMO-SVN-${randomUUID().slice(0,8).toUpperCase()}`;
      const isPaid    = ['paid','delivered'].includes(status);
      if (isPaid) {
        await q(
          `INSERT IGNORE INTO souvenir_orders (order_number,souvenir_id,buyer_name,buyer_email,buyer_phone,quantity,unit_price,total_amount,status,paystack_reference,paid_at) VALUES (?,?,?,?,?,?,?,?,?,?,DATE_SUB(NOW(),INTERVAL ? DAY))`,
          [orderNum, sv.id, bname, bemail, bphone, qty, unitPrice, total, status, ref, dAgo]
        );
        await q('UPDATE souvenirs SET sold_qty=sold_qty+? WHERE id=?', [qty, sv.id]);
      } else {
        await q(
          `INSERT IGNORE INTO souvenir_orders (order_number,souvenir_id,buyer_name,buyer_email,buyer_phone,quantity,unit_price,total_amount,status,paystack_reference) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [orderNum, sv.id, bname, bemail, bphone, qty, unitPrice, total, status, ref]
        );
      }
    }
    log(`✅ 4 demo souvenir orders (2 paid, 1 delivered, 1 pending)`);
  }

  /* 17. SPONSORS — with appropriate logo URLs */
  console.log('\n⭐ Sponsors...');
  for (const [event_id_,name,logo_url,website_url,tier,sort_order] of [
    [mys3Id,'Dangote Foundation',   IMG.logo_dangote,           'https://dangote.com',          'title',   0],
    [mys3Id,'MTN Nigeria',          IMG.logo_mtn,               'https://mtnonline.com',         'gold',    1],
    [mys3Id,'First Bank Nigeria',   IMG.logo_first,             'https://firstbankng.com',       'gold',    2],
    [null,  'Jaiz Bank',            IMG.logo_jaiz,              'https://jaizbankplc.com',       'silver',  3],
    [mys3Id,'The Nation Newspaper', IMG.logo_nation,            'https://thenationonlineng.net', 'media',   4],
    [null,  'Islam Channel',        IMG.logo_islam,             'https://islamchannel.tv',       'partner', 5],
  ]) {
    await q(
      `INSERT INTO sponsors (event_id,name,logo_url,website_url,tier,sort_order)
       VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE tier=VALUES(tier)`,
      [event_id_,name,logo_url,website_url,tier,sort_order]
    );
    log(`✅ [${tier.padEnd(8)}] ${name}`);
  }

  /* ── SUMMARY ─────────────────────────────────────────────── */
  const D = '═'.repeat(64);
  console.log('\n' + D);
  console.log('🎉  MYS Demo Seed v5 — Complete!\n');
  console.log('  LOGIN CREDENTIALS:');
  console.log('  ┌──────────────────────────────────────────────────────────────┐');
  console.log('  │ Role         Email                           Password         │');
  console.log('  ├──────────────────────────────────────────────────────────────┤');
  console.log('  │ super_admin  admin@muslimyouthsummit.com     MYS@Admin2024!   │');
  console.log('  │ admin        musa@muslimyouthsummit.com      MYS@Admin2024!   │');
  console.log('  │ admin        fatima@muslimyouthsummit.com    MYS@Admin2024!   │');
  console.log('  │ attendant    gate@muslimyouthsummit.com      attend123         │');
  console.log('  │ department   kitchen@muslimyouthsummit.com   dept@123          │');
  console.log('  │ department   av@muslimyouthsummit.com        dept@123          │');
  console.log('  └──────────────────────────────────────────────────────────────┘');
  console.log('\n  SEEDED DATA:');
  console.log('  • 5 departments (Kitchen, Gate, AV, Transport, Decoration)');
  console.log('  • 6 admin accounts (1 super, 2 admin, 1 attendant, 2 dept)');
  console.log('  • 4 global categories (Youth, Graduate, Brothers, Sisters)');
  console.log('  • 3 global hostels (Khadijah F-60, Umar M-60, VIP-20)');
  console.log('  • MYS2 — completed event (6 Unsplash gallery images, 2 speakers w/ photos)');
  console.log('  • MYS3 — active event:');
  console.log(`  │   ${yr}-07-12 to ${yr}-07-13 · Lagos City Hall`);
  console.log('  │   4 speakers with portraits (RandomUser), email, phone');
  console.log('  │   15 sessions (event_day_id), 3 sessions with YouTube links');
  console.log('  │   4 ticket types with descriptions');
  console.log('  │   30 participants (VIP:5, UG:11, Grad:7, Prof:7)');
  console.log('  │   Tickets #26-30: partial payments (balance_due > 0)');
  console.log('  │   18 check-ins (6 checked out), hostel assignments');
  console.log('  │   7-day ticket growth snapshots for dashboard chart');
  console.log('  • 2 email campaigns (1 draft, 1 sent)');
  console.log('  • 8 expense requests (paid:2, approved:3, pending:2, rejected:1)');
  console.log('  • 4 souvenirs with Unsplash product images + 4 demo orders');
  console.log('  • 6 sponsors with logo URLs (clearbit + Unsplash)');
  console.log('\n  SETUP COMMAND:');
  console.log('  mysql -u root -p');
  console.log('  DROP DATABASE IF EXISTS mys_platform;');
  console.log('  SOURCE backend/src/database/schema.sql;');
  console.log('  exit');
  console.log('  cd backend && node src/database/seed.js && npm run demo');
  console.log(D + '\n');

  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
