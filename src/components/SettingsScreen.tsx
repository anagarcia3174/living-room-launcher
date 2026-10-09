import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { actionFromKey } from "../input/actions";
import { groupIntoRows } from "../rows";
import { CLOSED, CONFIRM_CHOICES, ITEM_ACTIONS, type ItemAction, type Menu } from "../settings/menu";
import { moveWithinCategory, toEdits } from "../settings/tileEdits";
import type { SettingsTile } from "../types";
import { SettingsItem } from "./SettingsItem";
import { emptyForm, formFromTile, tileFromForm, type TileForm } from "../settings/form";
import { TileFormView } from "./TileFormView";

type Props = {
  onBack: () => void;
};

// A special id for the "Add tile" button, so it fits into the same up/down order as the tiles.
const ADD_ID = "__add__";
const DEFAULT_CATEGORIES = ["streaming", "games"];

export function SettingsScreen({ onBack }: Props) {
  const [tiles, setTiles] = useState<SettingsTile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu>(CLOSED);
  const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<TileForm | null>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());

  const rows = useMemo(() => (tiles ? groupIntoRows(tiles) : []), [tiles]);
  // Tile ids in the order they appear on screen (grouped by category).
  // On-screen order: the Add button first, then tiles grouped by category.
  const order = useMemo(
    () => [ADD_ID, ...rows.flatMap((row) => row.tiles.map((t) => t.id))],
    [rows]
  );
  // Existing categories in display order, plus the defaults if missing.
  const categories = useMemo(() => {
    const found = rows.map((row) => row.category);
    return [...found, ...DEFAULT_CATEGORIES.filter((c) => !found.includes(c))];
  }, [rows]);


  useEffect(() => {
    invoke<SettingsTile[]>("get_settings_tiles")
      .then((loaded) => {
        setTiles(loaded);
                setFocusId(groupIntoRows(loaded)[0]?.tiles[0]?.id ?? ADD_ID);
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
  /** Saves through Rust. The screen only updates if the save succeeds. */
  async function save(next: SettingsTile[], nextFocus: string | null): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      await invoke("save_tiles", { tiles: toEdits(next) });
      setTiles(next);
      setFocusId(nextFocus);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function runAction(action: ItemAction) {
    if (!tiles || !focusId) return;
        if (action === "Edit") {
      const tile = tiles.find((t) => t.id === focusId);
      if (tile) {
        setError(null);
        setMenu(CLOSED);
        setForm(formFromTile(tile));
      }
      return;
    }
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

    function openAddForm() {
    setError(null);
    setMenu(CLOSED);
    setFocusId(ADD_ID);
    setForm(emptyForm(categories[0]));
  }

  function cancelForm() {
    setError(null);
    setForm(null);
  }

  async function submitForm() {
    if (!tiles || !form) return;
    const otherIds = tiles.filter((t) => t.id !== form.originalId).map((t) => t.id);
    const result = tileFromForm(form, otherIds);
    if (typeof result === "string") {
      setError(result);
      return;
    }
    const next = form.originalId
      ? tiles.map((t) => (t.id === form.originalId ? result : t)) // edit in place
      : [...tiles, result]; // new tiles go to the end of their category
    if (await save(next, result.id)) setForm(null);
  }

  // No dependency list: the handler is re-attached after every render,
  // so it always sees the current state.
  useEffect(() => {
        if (form) return; // the form handles keys while it's open
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
          if (focusId === ADD_ID) openAddForm();
          else openMenu(focusId);
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
    : form
      ? "↑↓ move · ←→ change · Enter next · Esc cancel"
      : menu.kind === "closed"
        ? "↑↓ choose · Enter options · Esc back"
        : "←→ choose · Enter confirm · Esc close";

  return (
    <main className="launcher">
      <header className="launcher-header">
               <h1 className="launcher-title">
          {form ? (form.originalId ? "Edit tile" : "Add tile") : "Settings"}
        </h1>
        <p className="hint">{hint}</p>
      </header>

      <div className="settings-body">
        {error && <p className="settings-error">{error}</p>}

              {form ? (
          <TileFormView
            form={form}
            setForm={setForm}
            categories={categories}
            saving={saving}
            onSave={submitForm}
            onCancel={cancelForm}
          />
        ) : (
          <>
            <button
              type="button"
              ref={(el) => {
                if (el) itemRefs.current.set(ADD_ID, el);
                else itemRefs.current.delete(ADD_ID);
              }}
              className={focusId === ADD_ID ? "settings-add is-focused" : "settings-add"}
              onClick={openAddForm}
            >
              + Add tile
            </button>

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
          </>
        )}
      </div>
    </main>
  );
}