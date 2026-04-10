import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// PATCH /api/tasks/[id] — update a task (name, owner, deadline, status, etc.)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const taskId = parseInt(id);

    // Update each provided field individually using safe tagged templates
    if (body.name !== undefined) await sql`UPDATE tasks SET name = ${body.name} WHERE id = ${taskId}`;
    if (body.owner !== undefined) await sql`UPDATE tasks SET owner = ${body.owner} WHERE id = ${taskId}`;
    if (body.poc !== undefined) await sql`UPDATE tasks SET poc = ${body.poc} WHERE id = ${taskId}`;
    if (body.deadline !== undefined) await sql`UPDATE tasks SET deadline = ${body.deadline} WHERE id = ${taskId}`;
    if (body.status !== undefined) await sql`UPDATE tasks SET status = ${body.status} WHERE id = ${taskId}`;
    if (body.sub !== undefined) await sql`UPDATE tasks SET sub = ${body.sub} WHERE id = ${taskId}`;
    if (body.cat_id !== undefined) await sql`UPDATE tasks SET cat_id = ${body.cat_id} WHERE id = ${taskId}`;

    // If status changed to CP, mark all checklist items as checked
    if (body.status === 'CP') {
      await sql`UPDATE checklist_items SET checked = TRUE WHERE task_id = ${taskId}`;
    }

    const result = await sql`SELECT * FROM tasks WHERE id = ${taskId}`;
    if (result.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);
    await sql`DELETE FROM checklist_items WHERE task_id = ${taskId}`;
    await sql`DELETE FROM tasks WHERE id = ${taskId}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
