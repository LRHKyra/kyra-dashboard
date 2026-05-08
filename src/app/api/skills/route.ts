import { NextResponse } from "next/server";
import { PATHS } from "@/lib/paths";
import * as rfs from "@/lib/remote-fs";

export async function GET() {
  try {
    const skills: Array<{ name: string; description?: string; source?: string }> = [];
    const seen = new Set<string>();

    // From sessions.json skillsSnapshot
    const raw = await rfs.readJSON<Record<string, { skillsSnapshot?: { skills?: Array<{ name: string }>; resolvedSkills?: Array<{ name: string; description?: string; source?: string }> } }>>(PATHS.sessionsIndex);
    if (raw) {
      for (const value of Object.values(raw)) {
        if (value.skillsSnapshot?.resolvedSkills) {
          for (const skill of value.skillsSnapshot.resolvedSkills) {
            if (!seen.has(skill.name)) {
              seen.add(skill.name);
              skills.push({ name: skill.name, description: skill.description, source: skill.source });
            }
          }
        }
        if (value.skillsSnapshot?.skills) {
          for (const skill of value.skillsSnapshot.skills) {
            if (!seen.has(skill.name)) {
              seen.add(skill.name);
              skills.push({ name: skill.name });
            }
          }
        }
      }
    }

    // From openclaw.json skills.entries
    const config = await rfs.readJSON<{ skills?: { entries?: Record<string, unknown> } }>(PATHS.config);
    if (config?.skills?.entries) {
      for (const [name, entry] of Object.entries(config.skills.entries)) {
        if (!seen.has(name)) {
          seen.add(name);
          skills.push({ name, source: "config" });
        }
      }
    }

    return NextResponse.json(skills);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
