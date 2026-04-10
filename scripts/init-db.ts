import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function init() {
  console.log('Creating schema...');

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL,
      light TEXT NOT NULL,
      sort_order INT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      cat_id TEXT NOT NULL REFERENCES categories(id),
      sub TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      owner TEXT NOT NULL DEFAULT '',
      poc TEXT NOT NULL DEFAULT '',
      deadline TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'NS',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id SERIAL PRIMARY KEY,
      task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      checked BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INT NOT NULL DEFAULT 0
    )
  `;

  console.log('Schema created. Seeding data...');

  // Seed categories
  await sql`DELETE FROM checklist_items`;
  await sql`DELETE FROM tasks`;
  await sql`DELETE FROM categories`;

  await sql`
    INSERT INTO categories (id, label, color, light, sort_order) VALUES
    ('land', 'Land & Legal Structuring', '#3D1E7C', '#EDE8FB', 1),
    ('plan', 'Planning & Development', '#1E2D7C', '#E8ECFB', 2),
    ('comm', 'Commercial & Strategic', '#1A3A2A', '#E8F5EE', 3),
    ('fin',  'Finance & Corporate', '#7C5C1E', '#FBF4E3', 4),
    ('ops',  'Operations & Sales', '#7C2A1E', '#FBE8E3', 5),
    ('mkt',  'Marketing & Synergy', '#7C1E4A', '#FBE8F2', 6),
    ('adm',  'Admin & External', '#374151', '#F1F5F9', 7)
  `;

  // Seed tasks
  const tasks = [
    { cat:'land', sub:'1.1 Land Registry', name:'Confirm registry value with RUDA', owner:'', poc:'RUDA Legal', deadline:'2025-04-14', status:'NS',
      cl:['Confirm agreed registry value','Draft reimbursement mechanism','Define payment trigger events','Legal validation','Written approval from RUDA'] },
    { cat:'land', sub:'1.2 RTW Service Agreement', name:'Qantara Division service agreement', owner:'', poc:'RUDA Commercial', deadline:'2025-04-16', status:'IP',
      cl:['Define land division ARD vs RUDA','Map Qantara commercial plots','Define service areas','Revenue split agreement','Draft agreement','Sign-off'] },
    { cat:'land', sub:'1.3 TPID Adjustment', name:'12 Acres TPID mismatch resolution', owner:'', poc:'RUDA Land Dept', deadline:'2025-04-15', status:'NS',
      cl:['Identify TPID mismatch','Coordinate with RUDA','Legal documentation','Adjustment approval','Record update'] },
    { cat:'land', sub:'1.4 Land Swap / Purchase', name:'Define land swap or purchase model', owner:'', poc:'CFO', deadline:'2025-04-17', status:'NS',
      cl:['Define model','RUDA alignment','Financial impact analysis','Legal framework','Execution plan'] },
    { cat:'land', sub:'1.5 TPID Master Account', name:'TPID master account lock & activation', owner:'', poc:'Legal', deadline:'2025-04-18', status:'NS',
      cl:['Define structure','Align with RUDA','Finalize documentation','Activate account'] },

    { cat:'plan', sub:'2.1 Bab1 Alignment', name:'Bab1 land alignment & commercial design', owner:'', poc:'RUDA Land Dept', deadline:'2025-04-15', status:'IP',
      cl:['Land alignment confirmation','RUDA land dept sign-off','Engineering drawings received','Profiles obtained','Commercial inventory designed','3D visualization generated'] },
    { cat:'plan', sub:'2.2 CB2 Layout Optimization', name:'CB2 layout review and expansion', owner:'', poc:'Architecture', deadline:'2025-04-16', status:'NS',
      cl:['Existing layout review','Identify expansion areas','Increase commercial inventory','Revised layout approval'] },
    { cat:'plan', sub:'2.3 Development Plan', name:'Infrastructure, branding & building phases', owner:'', poc:'Dev Lead', deadline:'2025-04-18', status:'NS',
      cl:['Infra scope defined','Branding zones identified','Building phases mapped','Costing prepared','Timeline created'] },
    { cat:'plan', sub:'2.4 Enforcement D&BC', name:'Dedicated enforcement resource & monitoring', owner:'', poc:'Operations', deadline:'2025-04-14', status:'NS',
      cl:['Enforcement resource assigned','Scope defined','Monitoring mechanism','Reporting structure'] },
    { cat:'plan', sub:'2.5 D&BC Agreement PHS', name:'Draft & finalize D&BC agreement', owner:'', poc:'Legal', deadline:'2025-04-17', status:'NS',
      cl:['Draft agreement','Compliance terms','RUDA alignment','Final sign-off'] },

    { cat:'comm', sub:'3.1 RUDA Commercial Engagement', name:'RUDA relationships & investment summit', owner:'', poc:'CEO', deadline:'2025-04-13', status:'IP',
      cl:['Relationship with Sherry','Relationship with Waseem','Investment summit insights','Stall/booth locked','Media plan access','ARD inclusion secured'] },
    { cat:'comm', sub:'3.2 Barrister Hesham FAQs', name:'Legal FAQs on cancellations & rebates', owner:'', poc:'Barrister Hesham', deadline:'2025-04-16', status:'NS',
      cl:['Define key questions','Cover cancellation rules','Cover rebates structure','Legal review','Publish document'] },

    { cat:'fin', sub:'4.1 Financial Plan', name:'Annual revenue & expense forecast', owner:'', poc:'CFO', deadline:'2025-04-17', status:'NS',
      cl:['Revenue forecast','Expense planning','Cash flow','Scenario modeling'] },
    { cat:'fin', sub:'4.2 Banking Structure', name:'Escrow account & allocation mapping', owner:'', poc:'CFO', deadline:'2025-04-15', status:'NS',
      cl:['Existing accounts list','Escrow account creation','Allocation mapping'] },
    { cat:'fin', sub:'4.3 Taxation Plan', name:'Tax exposure & compliance mapping', owner:'', poc:'Tax Advisor', deadline:'2025-04-18', status:'NS',
      cl:['Tax exposure analysis','Optimization strategy','Compliance mapping'] },
    { cat:'fin', sub:'4.4 Group Reporting', name:'Reporting formats, frequency & dashboard', owner:'', poc:'CFO', deadline:'2025-04-16', status:'NS',
      cl:['Define formats','Define frequency','Dashboard integration'] },

    { cat:'ops', sub:'5.1 CSD Recovery Plan', name:'CSD outstanding mapping & recovery', owner:'', poc:'Sales Head', deadline:'2025-04-14', status:'IP',
      cl:['Outstanding mapping','Recovery strategy','Timeline','Tracking system'] },
    { cat:'ops', sub:'5.2 IMD Inventory Release', name:'Inventory classification & release schedule', owner:'', poc:'Inventory Mgr', deadline:'2025-04-15', status:'NS',
      cl:['Inventory classification','Release schedule','Approval mechanism'] },
    { cat:'ops', sub:'5.3 Sales Plan Multi-Vertical', name:'B2C, B2B & Corporate sales plan', owner:'', poc:'Sales Head', deadline:'2025-04-17', status:'NS',
      cl:['Product list defined','Pricing strategy','Channel allocation','Targets set'] },

    { cat:'mkt', sub:'6.1 Marketing Plan', name:'B2C, B2B, Corporate & RUDA campaigns', owner:'', poc:'Marketing Head', deadline:'2025-04-17', status:'NS',
      cl:['B2C campaigns','B2B outreach','Corporate marketing','RUDA synergy'] },
    { cat:'mkt', sub:'6.2 Synergy Plan', name:'Daily reporting, automation & conference', owner:'', poc:'Tech Lead', deadline:'2025-04-16', status:'NS',
      cl:['Daily reporting system','Automation layer','Conference room alignment'] },

    { cat:'adm', sub:'7.1 LESCO Case', name:'LESCO issue identification & resolution', owner:'', poc:'Admin', deadline:'2025-04-14', status:'BL',
      cl:['Status update','Issue identification','Resolution path'] },
    { cat:'adm', sub:'7.2 Kashif Architect Payment', name:'Advance payment & scope confirmation', owner:'', poc:'Admin', deadline:'2025-04-15', status:'NS',
      cl:['Advance payment','Work scope confirmation','Completion tracking'] },
  ];

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const result = await sql`
      INSERT INTO tasks (cat_id, sub, name, owner, poc, deadline, status)
      VALUES (${t.cat}, ${t.sub}, ${t.name}, ${t.owner}, ${t.poc}, ${t.deadline}, ${t.status})
      RETURNING id
    `;
    const taskId = result[0].id;
    for (let j = 0; j < t.cl.length; j++) {
      await sql`
        INSERT INTO checklist_items (task_id, text, checked, sort_order)
        VALUES (${taskId}, ${t.cl[j]}, FALSE, ${j})
      `;
    }
  }

  console.log('Database seeded successfully!');
}

init().catch(e => { console.error(e); process.exit(1); });
