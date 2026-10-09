import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { actionFromKey } from "../input/actions";
import type { SettingsTile } from "../types";

type Props = {
  onBack: () => void;
};

export function SettingsScreen({ onBack }: Props) {
  const [tiles, setTiles] = useState<SettingsTile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<SettingsTile[]>("get_settings_tiles")
      .then(setTiles)
      .catch((e) => setError(String(e)));
  }, []);

  // Esc goes back to Home.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (actionFromKey(event.key) === "back") {
        event.preventDefault();
        onBack();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  return (
    <main className="launcher">
      <header className="launcher-header">
        <h1 className="launcher-title">Settings</h1>
        <p className="hint">Esc to go back</p>
      </header>
      <div className="settings-body">
        {error && <pre className="launcher-error">{error}</pre>}
        {tiles && (
          <p className="hint">{tiles.length} tiles loaded. The tile list comes in the next step.</p>
        )}
      </div>
    </main>
  );
}