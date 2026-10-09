import type { TileData } from "../types";
import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

type Props = {
  tile: TileData;
  isFocused: boolean;
  isPressed: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onHighlight: () => void;
  onSelect: (id: string) => void;
};

export function Tile({ tile, isFocused, isPressed, buttonRef, onHighlight, onSelect }: Props) {
   const [imageFailed, setImageFailed] = useState(false);
  const showImage = tile.image !== null && !imageFailed;

    const className = ["tile", isFocused && "is-focused", isPressed && "is-pressed"]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={buttonRef}
      type="button"
           className={className}
      onFocus={onHighlight}
      onMouseMove={onHighlight}
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