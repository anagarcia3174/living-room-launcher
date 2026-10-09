import type { TileData } from "../types";

type Props = {
  tile: TileData;
  onSelect: (id: string) => void;
};

export function Tile({ tile, onSelect }: Props) {
  return (
    <button type="button" className="tile" onClick={() => onSelect(tile.id)}>
      <span className="tile-name">{tile.name}</span>
    </button>
  );
}