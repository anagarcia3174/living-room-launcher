import type { TileData } from "../types";
import { Tile } from "./Tile";

type Props = {
  tiles: TileData[];
  onSelect: (id: string) => void;
};

export function TileGrid({ tiles, onSelect }: Props) {
  return (
    <div className="tile-grid">
      {tiles.map((tile) => (
        <Tile key={tile.id} tile={tile} onSelect={onSelect} />
      ))}
    </div>
  );
}