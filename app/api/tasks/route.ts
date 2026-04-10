import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/tasks — return all tasks with their checklist items and categories
export async function GET() {
  try {
    const categories = await sql`SELECT * FROM categories ORDER BY sort_order`;
    const tasks = await sql`
      SELECT t.*, json_agg(
        json_build_object('id', c.id, 'text', c.text, 'checked', c.checked, 'sort_order', c.sort_order)
        ORDER BY c.sort_order
      ) FILTER (WHERE c.id IS NOT NULL) as checklist
      FROM tasks t
      LEFT JOIN checklist_items c ON c.task_id = t.id
      GROUP BY t.id
      ORDER BY t.id
    `;
    return NextResponse.json({ categories, tasks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/tasks — create a new task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cat_id, sub, name, owner, poc, deadline, status } = body;
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const result = await sql`
      INSERT INTO tasks (cat_id, sub, name, owner, poc, deadline, status)
      VALUES (${cat_id || 'adm'}, ${sub || 'New task'}, ${name}, ${owner || ''}, ${poc || ''}, ${deadline || ''}, ${status || 'NS'})
      RETURNING *
    `;
    const task = result[0];
    // Return with empty checklist
    return NextResponse.json({ ...task, checklist: [] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
