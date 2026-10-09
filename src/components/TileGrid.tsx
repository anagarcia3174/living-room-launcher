import { useEffect, useRef, useState } from "react";
import type { TileData } from "../types";
import { actionFromKey } from "../input/actions";
import { moveInGrid } from "../input/gridNavigation";
import { Tile } from "./Tile";

type Props = {
  tiles: TileData[];
  onSelect: (id: string) => void;
};

export function TileGrid({ tiles, onSelect }: Props) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep the browser's real focus on the highlighted tile.
  useEffect(() => {
    tileRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const action = actionFromKey(event.key);
      if (!action || tiles.length === 0) return;

      // Stops page scrolling and the button's built-in Enter click,
      // so Enter launches exactly once.
      event.preventDefault();

      if (action === "select") {
        if (!event.repeat) onSelect(tiles[focusedIndex].id);
        return;
      }

      const columns = getColumnCount(gridRef.current);
      setFocusedIndex((index) => moveInGrid(index, action, tiles.length, columns));
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tiles, focusedIndex, onSelect]);

  return (
    <div className="tile-grid" ref={gridRef}>
      {tiles.map((tile, index) => (
        <Tile
          key={tile.id}
          tile={tile}
          isFocused={index === focusedIndex}
          buttonRef={(el) => {
            tileRefs.current[index] = el;
          }}
          onHighlight={() => setFocusedIndex(index)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/** Reads the column count from the grid's CSS, so CSS stays the single source of truth. */
function getColumnCount(grid: HTMLElement | null): number {
  if (!grid) return 1;
  return getComputedStyle(grid).gridTemplateColumns.split(" ").length;
}