import { NextRequest, NextResponse } from "next/server";
import { listTasks, createTask } from "@/lib/notion";

export async function GET() {
  try {
    const tasks = await listTasks({ excludeCancelled: false });
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const task = await createTask(body);
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
