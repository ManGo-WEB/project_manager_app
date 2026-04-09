"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, GitBranch } from "lucide-react";

interface Settings {
  github: {
    username: string;
    email: string;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ github: { username: "", email: "" } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Все проекты
      </Link>

      <h1 className="text-2xl font-semibold mb-8">Настройки</h1>

      <form onSubmit={handleSave} className="space-y-8">
        {/* GitHub */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <GitBranch className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold">GitHub</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Эти данные используются для настройки git в создаваемых проектах.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Имя пользователя</label>
              <input
                type="text"
                value={settings.github.username}
                onChange={(e) => setSettings({ ...settings, github: { ...settings.github, username: e.target.value } })}
                placeholder="ManGo-WEB"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c36] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={settings.github.email}
                onChange={(e) => setSettings({ ...settings, github: { ...settings.github, email: e.target.value } })}
                placeholder="info@mango-web.ru"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c36] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          {saved && (
            <span className="text-sm text-green-500">Сохранено</span>
          )}
        </div>
      </form>
    </main>
  );
}
