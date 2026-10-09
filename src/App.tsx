import "./App.css";
import { TileGrid } from "./components/TileGrid";
import { tiles } from "./data/tiles";

function App() {
  function handleSelect(id: string) {
    // Launching comes in Phase 4. For now, just confirm selection works.
    console.log("Selected tile:", id);
  }

  return (
    <main className="launcher">
      <h1 className="launcher-title">Home</h1>
      <TileGrid tiles={tiles} onSelect={handleSelect} />
    </main>
  );
}

export default App;