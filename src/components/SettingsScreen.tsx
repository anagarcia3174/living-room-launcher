import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { actionFromKey } from "../input/actions";
import { groupIntoRows } from "../rows";
import { CLOSED, CONFIRM_CHOICES, ITEM_ACTIONS, type ItemAction, type Menu } from "../settings/menu";
import { moveWithinCategory, toEdits } from "../settings/tileEdits";
import type { SettingsTile } from "../types";
import { SettingsItem } from "./SettingsItem";

type Props = {
  onBack: () => void;
};

export function SettingsScreen({ onBack }: Props) {
  const [tiles, setTiles] = useState<SettingsTile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu>(CLOSED);
  const [saving, setSaving] = useState(false);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  const rows = useMemo(() => (tiles ? groupIntoRows(tiles) : []), [tiles]);
  // Tile ids in the order they appear on screen (grouped by category).
  const order = useMemo(() => rows.flatMap((row) => row.tiles.map((t) => t.id)), [rows]);

  useEffect(() => {
    invoke<SettingsTile[]>("get_settings_tiles")
      .then((loaded) => {
        setTiles(loaded);
        setFocusId(groupIntoRows(loaded)[0]?.tiles[0]?.id ?? null);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // Keep the highlighted tile in view.
  useEffect(() => {
    if (!focusId) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    itemRefs.current
      .get(focusId)
      ?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [focusId]);

  /** Saves through Rust. The screen only updates if the save succeeds. */
  async function save(next: SettingsTile[], nextFocus: string | null) {
    setSaving(true);
    setError(null);
    try {
      await invoke("save_tiles", { tiles: toEdits(next) });
      setTiles(next);
      setFocusId(nextFocus);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function runAction(action: ItemAction) {
    if (!tiles || !focusId) return;
    if (action === "Remove") {
      setMenu({ kind: "confirm-remove", index: 0 }); // Cancel selected by default
      return;
    }
    const next = moveWithinCategory(tiles, focusId, action === "Move up" ? -1 : 1);
    if (next !== tiles) save(next, focusId);
  }

  function confirmRemove() {
    if (!tiles || !focusId) return;
    const position = order.indexOf(focusId);
    const remaining = order.filter((id) => id !== focusId);
    const nextFocus = remaining[Math.min(position, remaining.length - 1)] ?? null;
    setMenu(CLOSED);
    save(tiles.filter((t) => t.id !== focusId), nextFocus);
  }

  function chooseConfirm(index: number) {
    if (CONFIRM_CHOICES[index] === "Remove") confirmRemove();
    else setMenu({ kind: "actions", index: ITEM_ACTIONS.indexOf("Remove") });
  }

  function openMenu(id: string) {
    setFocusId(id);
    setMenu({ kind: "actions", index: 0 });
  }

  // No dependency list: the handler is re-attached after every render,
  // so it always sees the current state.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const action = actionFromKey(event.key);
      if (!action) return;
      event.preventDefault();
      if (saving || (event.repeat && action === "select")) return;

      if (menu.kind === "closed") {
        if (action === "back") {
          onBack();
        } else if (action === "up" || action === "down") {
          const current = focusId ? order.indexOf(focusId) : -1;
          const target = current + (action === "down" ? 1 : -1);
          if (target >= 0 && target < order.length) setFocusId(order[target]);
        } else if (action === "select" && focusId) {
          openMenu(focusId);
        }
        return;
      }

      // Options are open: Left/Right choose, Enter runs, Esc closes.
      const count = menu.kind === "actions" ? ITEM_ACTIONS.length : CONFIRM_CHOICES.length;
      if (action === "back") {
        setMenu(CLOSED);
      } else if (action === "left") {
        setMenu({ ...menu, index: Math.max(0, menu.index - 1) });
      } else if (action === "right") {
        setMenu({ ...menu, index: Math.min(count - 1, menu.index + 1) });
      } else if (action === "select") {
        if (menu.kind === "actions") runAction(ITEM_ACTIONS[menu.index]);
        else chooseConfirm(menu.index);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const hint = saving
    ? "Saving…"
    : menu.kind === "closed"
      ? "↑↓ choose · Enter options · Esc back"
      : "←→ choose · Enter confirm · Esc close";

  return (
    <main className="launcher">
      <header className="launcher-header">
        <h1 className="launcher-title">Settings</h1>
        <p className="hint">{hint}</p>
      </header>

      <div className="settings-body">
        {error && <p className="settings-error">{error}</p>}

        {rows.map((row) => (
          <section key={row.category} className="settings-group">
            <h2 className="settings-group-title">{row.label}</h2>
            <ul className="settings-list">
              {row.tiles.map((tile) => (
                <SettingsItem
                  key={tile.id}
                  tile={tile}
                  isFocused={tile.id === focusId}
                  menu={tile.id === focusId ? menu : CLOSED}
                  itemRef={(el) => {
                    if (el) itemRefs.current.set(tile.id, el);
                    else itemRefs.current.delete(tile.id);
                  }}
                  onOpen={() => openMenu(tile.id)}
                  onAction={(i) => runAction(ITEM_ACTIONS[i])}
                  onConfirm={chooseConfirm}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}