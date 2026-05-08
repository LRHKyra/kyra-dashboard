import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { readSettings } from "@/lib/outreach-settings";

interface Step1Variant {
  persona: string;
  sender: string;
  body: string;
}

interface Step23Variant {
  sender: string;
  body: string;
}

interface Step1Template {
  step_number: 1;
  note?: string;
  subject_pool: string[];
  variants: Step1Variant[];
}

interface Step23Template {
  step_number: number;
  subject: string;
  note?: string;
  variants: Step23Variant[];
}

type StepTemplate = Step1Template | Step23Template;

interface TemplatesPayload {
  copywriterPrompt: string;
  steps: StepTemplate[];
}

function getPromptsDir(): string {
  const settings = readSettings();
  return path.join(settings.kyraOutreachRoot, "src", "kyra_outreach", "prompts");
}

export async function GET() {
  try {
    const promptsDir = getPromptsDir();

    // Copywriter prompt
    const promptPath = path.join(promptsDir, "copywriter_v1.txt");
    const copywriterPrompt = fs.existsSync(promptPath)
      ? fs.readFileSync(promptPath, "utf8")
      : "";

    // Step templates
    const templatesPath = path.join(promptsDir, "step_templates.json");
    let steps: StepTemplate[] = [];
    if (fs.existsSync(templatesPath)) {
      const data = JSON.parse(fs.readFileSync(templatesPath, "utf8")) as {
        steps: StepTemplate[];
      };
      steps = data.steps ?? [];
    }

    return NextResponse.json({ copywriterPrompt, steps } satisfies TemplatesPayload);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<TemplatesPayload>;
    const promptsDir = getPromptsDir();

    if (!fs.existsSync(promptsDir)) {
      return NextResponse.json(
        { error: `Prompts directory not found: ${promptsDir}` },
        { status: 404 }
      );
    }

    // Write copywriter prompt
    if (typeof body.copywriterPrompt === "string") {
      const promptPath = path.join(promptsDir, "copywriter_v1.txt");
      fs.writeFileSync(promptPath, body.copywriterPrompt, "utf8");
    }

    // Write step templates
    if (Array.isArray(body.steps)) {
      const templatesPath = path.join(promptsDir, "step_templates.json");
      fs.writeFileSync(
        templatesPath,
        JSON.stringify({ steps: body.steps }, null, 2),
        "utf8"
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
