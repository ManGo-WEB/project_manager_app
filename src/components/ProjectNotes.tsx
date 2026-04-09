"use client";

import { useState, useEffect } from "react";
import { Trash2, Send } from "lucide-react";
import type { Note } from "@/types/project";

interface ProjectNotesProps {
  slug: string;
}

function formatNoteDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) + ", " + date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProjectNotes({ slug }: ProjectNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchNotes = () => {
    fetch(`/api/projects/${slug}/notes`)
      .then((res) => res.json())
      .then(setNotes)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSending(true);
    await fetch(`/api/projects/${slug}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setText("");
    setSending(false);
    fetchNotes();
  };

  const handleDelete = async (noteId: string) => {
    await fetch(`/api/projects/${slug}/notes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    fetchNotes();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Input */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Напишите заметку..."
          rows={2}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#22224a] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              handleAdd(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="self-end p-2.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Добавить (Ctrl+Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Notes list */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-6">Загрузка...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Заметок пока нет</p>
      ) : (
        <div className="space-y-3 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#161630] border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.text}</p>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-500 transition-all shrink-0"
                  title="Удалить заметку"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">{formatNoteDate(note.date)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
