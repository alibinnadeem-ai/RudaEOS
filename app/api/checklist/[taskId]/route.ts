import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// POST /api/checklist/[taskId] — add a checklist item
export async function POST(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const body = await req.json();
    const text = body.text?.trim();
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 });

    const task_id = parseInt(taskId);

    // Get max sort_order
    const maxOrder = await sql`
      SELECT COALESCE(MAX(sort_order), -1) as max FROM checklist_items WHERE task_id = ${task_id}
    `;
    const sortOrder = maxOrder[0].max + 1;

    const result = await sql`
      INSERT INTO checklist_items (task_id, text, checked, sort_order)
      VALUES (${task_id}, ${text}, FALSE, ${sortOrder})
      RETURNING *
    `;
    return NextResponse.json(result[0], { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
