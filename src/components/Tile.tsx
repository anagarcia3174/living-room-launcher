import type { TileData } from "../types";

type Props = {
  tile: TileData;
  isFocused: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onHighlight: () => void;
  onSelect: (id: string) => void;
};

export function Tile({ tile, isFocused, buttonRef, onHighlight, onSelect }: Props) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={isFocused ? "tile is-focused" : "tile"}
      onFocus={onHighlight}
      onMouseEnter={onHighlight}
      onClick={() => onSelect(tile.id)}
    >
      <span className="tile-name">{tile.name}</span>
    </button>
  );
}