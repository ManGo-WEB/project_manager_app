import fs from "fs";
import path from "path";
import { getProjectDocsPath } from "./config";
import { findFileInsensitive } from "./markdown";
import type { Note } from "@/types/project";

function getNotesPath(slug: string): string {
  const docsPath = getProjectDocsPath(slug);
  const existing = findFileInsensitive(docsPath, "notes.md");
  if (fs.existsSync(existing)) return existing;
  return path.join(docsPath, "notes.md");
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function getNotes(slug: string): Note[] {
  const filePath = getNotesPath(slug);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const notes: Note[] = [];
  const blocks = content.split(/^---$/m).filter((b) => b.trim());

  for (const block of blocks) {
    const idMatch = block.match(/<!-- id:(\S+) -->/);
    const dateMatch = block.match(/<!-- date:(\S+) -->/);
    const text = block
      .replace(/<!-- id:\S+ -->/, "")
      .replace(/<!-- date:\S+ -->/, "")
      .replace(/^# Заметки.*\n?/, "")
      .trim();

    if (idMatch && dateMatch && text) {
      notes.push({
        id: idMatch[1],
        date: dateMatch[1],
        text,
      });
    }
  }

  return notes;
}

function writeNotes(slug: string, notes: Note[]): void {
  const filePath = getNotesPath(slug);
  const docsPath = getProjectDocsPath(slug);

  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath, { recursive: true });
  }

  if (notes.length === 0) {
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "# Заметки\n", "utf-8");
    }
    return;
  }

  const blocks = notes.map((note) =>
    `<!-- id:${note.id} -->\n<!-- date:${note.date} -->\n${note.text}`
  );

  const content = `# Заметки\n\n${blocks.join("\n\n---\n\n")}\n`;
  fs.writeFileSync(filePath, content, "utf-8");
}

export function addNote(slug: string, text: string): Note {
  const notes = getNotes(slug);
  const note: Note = {
    id: generateId(),
    date: new Date().toISOString(),
    text: text.trim(),
  };

  notes.unshift(note);
  writeNotes(slug, notes);
  return note;
}

export function deleteNote(slug: string, noteId: string): void {
  const notes = getNotes(slug);
  const filtered = notes.filter((n) => n.id !== noteId);

  if (filtered.length === notes.length) {
    throw new Error("Заметка не найдена");
  }

  writeNotes(slug, filtered);
}
