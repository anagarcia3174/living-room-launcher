import type { TileData } from "../types";
import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

type Props = {
  tile: TileData;
  isFocused: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onHighlight: () => void;
  onSelect: (id: string) => void;
};

export function Tile({ tile, isFocused, buttonRef, onHighlight, onSelect }: Props) {
   const [imageFailed, setImageFailed] = useState(false);
  const showImage = tile.image !== null && !imageFailed;
  return (
    <button
      ref={buttonRef}
      type="button"
      className={isFocused ? "tile is-focused" : "tile"}
      onFocus={onHighlight}
      onMouseEnter={onHighlight}
      onClick={() => onSelect(tile.id)}
    >
      {showImage ? (
        <img
          className="tile-image"
          src={convertFileSrc(tile.image!)}
          alt={tile.name}
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="tile-name">{tile.name}</span>
      )}    </button>
  );
}