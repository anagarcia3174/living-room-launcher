import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { GearIcon } from "./components/GearIcon";
import { SettingsScreen } from "./components/SettingsScreen";
import { TileRows } from "./components/TileRows";
import { useIdleCursor } from "./hooks/useIdleCursor";
import { actionFromKey } from "./input/actions";
import type { TileData } from "./types";

type Screen = "home" | "settings";

function App() {
  useIdleCursor();

  const [tiles, setTiles] = useState<TileData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [headerFocused, setHeaderFocused] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);

  const loadTiles = useCallback(() => {
    invoke<TileData[]>("get_tiles")
      .then((loaded) => {
        setTiles(loaded);
        setError(null);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    loadTiles();
  }, [loadTiles]);

  function handleSelect(id: string) {
    setLaunchError(null);
    invoke("launch_tile", { id }).catch((e) => setLaunchError(String(e)));
  }

  function openSettings() {
    setLaunchError(null);
    setScreen("settings");
  }

  function closeSettings() {
    setScreen("home");
    setHeaderFocused(true); // return to the gear you left from
    loadTiles(); // pick up any changes saved in Settings
  }

  // Keep real focus on the gear while it's highlighted.
  useEffect(() => {
    if (screen === "home" && headerFocused) gearRef.current?.focus();
  }, [screen, headerFocused]);

  // Keys while the gear is highlighted.
  useEffect(() => {
    if (screen !== "home" || !headerFocused) return;

    function handleKeyDown(event: KeyboardEvent) {
      const action = actionFromKey(event.key);
      if (!action) return;
      event.preventDefault(); // also stops the button's built-in Enter click
      if (action === "down") setHeaderFocused(false);
      else if (action === "select" && !event.repeat) openSettings();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, headerFocused]);

  if (error) {
    return (
      <main className="launcher">
        <header className="launcher-header">
          <h1 className="launcher-title">Couldn't load tiles</h1>
        </header>
        <pre className="launcher-error">{error}</pre>
      </main>
    );
  }

  if (!tiles) {
    return <main className="launcher" />;
  }

  if (screen === "settings") {
    return <SettingsScreen onBack={closeSettings} />;
  }

  return (
    <main className="launcher">
      <header className="launcher-header">
        <h1 className="launcher-title">Home</h1>
        <button
          type="button"
          ref={gearRef}
          className={headerFocused ? "icon-button is-focused" : "icon-button"}
          aria-label="Settings"
          onMouseMove={() => setHeaderFocused(true)}
          onClick={openSettings}
        >
          <GearIcon />
        </button>
      </header>
      <TileRows
        tiles={tiles}
        active={!headerFocused}
        onActivate={() => setHeaderFocused(false)}
        onExitUp={() => setHeaderFocused(true)}
        onSelect={handleSelect}
      />
      {launchError && <p className="launch-error">{launchError}</p>}
    </main>
  );
}

export default App;