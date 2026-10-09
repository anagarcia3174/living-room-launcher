import { CONFIRM_CHOICES, ITEM_ACTIONS, type Menu } from "../settings/menu";
import { describeLaunch, LAUNCH_LABELS } from "../settings/tileEdits";
import type { SettingsTile } from "../types";

type Props = {
  tile: SettingsTile;
  isFocused: boolean;
  menu: Menu;
  itemRef: (el: HTMLLIElement | null) => void;
  onOpen: () => void;
  onAction: (index: number) => void;
  onConfirm: (index: number) => void;
};

export function SettingsItem({ tile, isFocused, menu, itemRef, onOpen, onAction, onConfirm }: Props) {
  const showActions = isFocused && menu.kind === "actions";
  const showConfirm = isFocused && menu.kind === "confirm-remove";

  return (
    <li
      ref={itemRef}
      className={isFocused ? "settings-item is-focused" : "settings-item"}
      onClick={onOpen}
    >
      <div className="settings-item-info">
        <span className="settings-item-name">{tile.name}</span>
        <span className="settings-item-detail">
          {LAUNCH_LABELS[tile.launch.type]} · {describeLaunch(tile.launch)}
        </span>
      </div>

      {showActions && (
        <div className="settings-actions">
          {ITEM_ACTIONS.map((label, i) => (
            <button
              key={label}
              type="button"
              tabIndex={-1}
              className={menu.index === i ? "pill is-focused" : "pill"}
              onClick={(e) => {
                e.stopPropagation();
                onAction(i);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {showConfirm && (
        <div className="settings-actions">
          <span className="settings-confirm-text">Remove "{tile.name}"?</span>
          {CONFIRM_CHOICES.map((label, i) => (
            <button
              key={label}
              type="button"
              tabIndex={-1}
              className={`pill${label === "Remove" ? " is-danger" : ""}${menu.index === i ? " is-focused" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onConfirm(i);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}