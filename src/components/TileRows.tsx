import { useEffect, useMemo, useRef, useState } from "react";
import type { TileData } from "../types";
import { actionFromKey } from "../input/actions";
import { moveInRows, type Position } from "../input/rowNavigation";
import { groupIntoRows } from "../rows";
import { Tile } from "./Tile";

type Props = {
  tiles: TileData[];
  onSelect: (id: string) => void;
};

export function TileRows({ tiles, onSelect }: Props) {
  const rows = useMemo(() => groupIntoRows(tiles), [tiles]);
  const [focus, setFocus] = useState<Position>({ row: 0, col: 0 });
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());

  const focusedTile = rows[focus.row]?.tiles[focus.col];

  // Keep real focus on the highlighted tile and scroll it into view smoothly.
  useEffect(() => {
    if (!focusedTile) return;
    const el = tileRefs.current.get(focusedTile.id);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [focusedTile]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const action = actionFromKey(event.key);
      if (!action || !focusedTile) return;

      // Stops page scrolling and the button's built-in Enter click.
      event.preventDefault();

      if (action === "select") {
        if (!event.repeat) onSelect(focusedTile.id);
        return;
      }

      const rowLengths = rows.map((r) => r.tiles.length);
      setFocus((pos) => moveInRows(pos, action, rowLengths));
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, focusedTile, onSelect]);

  return (
    <div className="rows">
      {rows.map((row, rowIndex) => (
        <section key={row.category} className="row">
          <h2 className="row-title">{row.label}</h2>
          <div className="row-tiles">
            {row.tiles.map((tile, colIndex) => (
              <Tile
                key={tile.id}
                tile={tile}
                isFocused={rowIndex === focus.row && colIndex === focus.col}
                buttonRef={(el) => {
                  if (el) tileRefs.current.set(tile.id, el);
                  else tileRefs.current.delete(tile.id);
                }}
                onHighlight={() => setFocus({ row: rowIndex, col: colIndex })}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}