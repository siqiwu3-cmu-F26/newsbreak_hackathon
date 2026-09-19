import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const emptyState = () => ({ users: [], sessions: [], credits: [] });

// Minimal JSON-file database: the whole state lives in memory and is written to disk
// after every mutation. Fine for a single-process demo; swap for a real DB later.
export function createStore(file) {
  function load() {
    try {
      return { ...emptyState(), ...JSON.parse(fs.readFileSync(file, "utf8")) };
    } catch (error) {
      // A missing file means a fresh database; a corrupt one should fail loudly, not be wiped.
      if (error.code === "ENOENT") return emptyState();
      throw error;
    }
  }

  function persist(state) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
    fs.renameSync(temp, file);
  }

  const state = load();

  return {
    read: () => state,
    // Mutators must validate before they change anything, because a throw skips the write.
    update(mutator) {
      const result = mutator(state);
      persist(state);
      return result;
    }
  };
}

export const store = createStore(process.env.DB_FILE || path.join(here, "../data/db.json"));
