import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// PATCH /api/checklist/[taskId]/[itemId] — toggle checked
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string; itemId: string }> }) {
  try {
    const { itemId } = await params;
    const body = await req.json();
    const clId = parseInt(itemId);

    if (body.checked !== undefined) {
      const result = await sql`
        UPDATE checklist_items SET checked = ${body.checked} WHERE id = ${clId} RETURNING *
      `;
      return NextResponse.json(result[0]);
    }
    return NextResponse.json({ error: 'No action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/checklist/[taskId]/[itemId] — remove checklist item
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ taskId: string; itemId: string }> }) {
  try {
    const { itemId } = await params;
    const clId = parseInt(itemId);
    await sql`DELETE FROM checklist_items WHERE id = ${clId}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
