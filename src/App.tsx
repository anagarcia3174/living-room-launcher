import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { TileGrid } from "./components/TileGrid";
import type { TileData } from "./types";

function App() {
  const [tiles, setTiles] = useState<TileData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    invoke<TileData[]>("get_tiles")
      .then(setTiles)
      .catch((e) => setError(String(e)));
  }, []);

function handleSelect(id: string) {
  setLaunchError(null);
  invoke("launch_tile", { id }).catch((e) => setLaunchError(String(e)));
}

  if (error) {
    return (
      <main className="launcher">
        <h1 className="launcher-title">Couldn't load tiles</h1>
        <pre className="launcher-error">{error}</pre>
      </main>
    );
  }

  if (!tiles) {
    return <main className="launcher" />;
  }

  return (
    <main className="launcher">
      <h1 className="launcher-title">Home</h1>
      <TileGrid tiles={tiles} onSelect={handleSelect} />
{launchError && <p className="launch-error">{launchError}</p>}
    </main>
  );
}

export default App;