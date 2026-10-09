import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";import type { TileData } from "../types";
import { actionFromKey } from "../input/actions";
import { moveInRows, type Position } from "../input/rowNavigation";
import { groupIntoRows } from "../rows";
import { Tile } from "./Tile";

type Props = {
  tiles: TileData[];
  active: boolean;          // false while the gear has the highlight
  onActivate: () => void;   // mouse moved onto a tile: take the highlight back
  onExitUp: () => void;     // Up pressed on the top row: hand the highlight to the gear
  onSelect: (id: string) => void;
};

export function TileRows({ tiles, active, onActivate, onExitUp, onSelect }: Props) {
  const rows = useMemo(() => groupIntoRows(tiles), [tiles]);
  const [focus, setFocus] = useState<Position>({ row: 0, col: 0 });
    const [pressedId, setPressedId] = useState<string | null>(null);
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());

  // Plays the press animation, then launches.
  function select(id: string) {
    setPressedId(id);
    onSelect(id);
    setTimeout(() => setPressedId(null), 250);
  }

  const focusedTile = rows[focus.row]?.tiles[focus.col];

  // Keep real focus on the highlighted tile and scroll it into view smoothly.
  useEffect(() => {
    if (!active || !focusedTile) return;
    const el = tileRefs.current.get(focusedTile.id);
    el?.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
    }, [focusedTile, active]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
           if (!active) return; // the gear is handling keys right now
      const action = actionFromKey(event.key);
      if (!action || !focusedTile) return;

      // Stops page scrolling and the button's built-in Enter click.
      event.preventDefault();

      if (action === "select") {
               if (!event.repeat) select(focusedTile.id);
        return;
      }

            if (action === "back") return; // nothing to go back to on Home

      if (action === "up" && focus.row === 0) {
        onExitUp();
        return;
      }

      const rowLengths = rows.map((r) => r.tiles.length);
      setFocus((pos) => moveInRows(pos, action, rowLengths));
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, rows, focus.row, focusedTile, onSelect, onExitUp]);
  return (
    <div className="rows">
      {rows.map((row, rowIndex) => (
                <section
          key={row.category}
          className="row"
          style={{ "--row-index": rowIndex } as CSSProperties}
        >
          <h2 className="row-title">{row.label}</h2>
          <div className="row-tiles">
            {row.tiles.map((tile, colIndex) => (
              <Tile
                key={tile.id}
                tile={tile}
                isFocused={active && rowIndex === focus.row && colIndex === focus.col}                isPressed={pressedId === tile.id}
                buttonRef={(el) => {
                  if (el) tileRefs.current.set(tile.id, el);
                  else tileRefs.current.delete(tile.id);
                }}
                                onHighlight={() => {
                  onActivate();
                  setFocus((prev) =>
                    prev.row === rowIndex && prev.col === colIndex
                      ? prev
                      : { row: rowIndex, col: colIndex }
                  );
                }}
                                onSelect={select}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}