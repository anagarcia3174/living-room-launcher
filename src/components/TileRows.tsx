import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";import type { TileData } from "../types";
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
    if (!focusedTile) return;
    const el = tileRefs.current.get(focusedTile.id);
    el?.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
    }, [focusedTile]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const action = actionFromKey(event.key);
      if (!action || !focusedTile) return;

      // Stops page scrolling and the button's built-in Enter click.
      event.preventDefault();

      if (action === "select") {
               if (!event.repeat) select(focusedTile.id);
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
                isFocused={rowIndex === focus.row && colIndex === focus.col}
                isPressed={pressedId === tile.id}
                buttonRef={(el) => {
                  if (el) tileRefs.current.set(tile.id, el);
                  else tileRefs.current.delete(tile.id);
                }}
                onHighlight={() =>
                  setFocus((prev) =>
                    prev.row === rowIndex && prev.col === colIndex
                      ? prev
                      : { row: rowIndex, col: colIndex }
                  )
                }
                                onSelect={select}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}