import fs from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "settings.json");

export interface AppSettings {
  github: {
    username: string;
    email: string;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  github: {
    username: "",
    email: "",
  },
};

export function getSettings(): AppSettings {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    const data = JSON.parse(raw);
    return {
      github: {
        username: data.github?.username || "",
        email: data.github?.email || "",
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
}
