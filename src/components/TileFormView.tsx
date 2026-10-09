import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/core";
import { actionFromKey } from "../input/actions";
import { LAUNCH_TYPES, type TileForm } from "../settings/form";
import { LAUNCH_LABELS } from "../settings/tileEdits";
import type { PickedExe } from "../types";

type FieldKey = "name" | "category" | "type" | "target" | "image" | "actions";
const FIELDS: FieldKey[] = ["name", "category", "type", "target", "image", "actions"];

type Props = {
  form: TileForm;
  setForm: Dispatch<SetStateAction<TileForm | null>>;
  categories: string[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
};

/** Picks the next or previous option, wrapping around at the ends. */
function cycle<T>(options: T[], current: T, direction: 1 | -1): T {
  const i = options.indexOf(current);
  return options[(i + direction + options.length) % options.length];
}

function label(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function TileFormView({ form, setForm, categories, saving, onSave, onCancel }: Props) {
  const [fieldIndex, setFieldIndex] = useState(0);
  const [actionIndex, setActionIndex] = useState(0); // 0 = Save, 1 = Cancel
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const inputRefs = useRef(new Map<FieldKey, HTMLInputElement>());

  const field = FIELDS[fieldIndex];
  const isTextField = (key: FieldKey) =>
    key === "name" || key === "image" || (key === "target" && form.launchType !== "exe");

  // Only the form is edited here; setForm is guaranteed non-null while this view is shown.
  const update = (changes: Partial<TileForm>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  // Typing goes into the highlighted text field. Other fields take focus away from inputs.
  useEffect(() => {
    const input = inputRefs.current.get(field);
    if (isTextField(field) && input) input.focus();
    else (document.activeElement as HTMLElement | null)?.blur();
  }, [field, form.launchType]);

  async function pickProgram() {
    setPicking(true);
    setPickError(null);
    try {
      const picked = await invoke<PickedExe | null>("pick_exe");
      if (picked) update({ exeToken: picked.token, exePath: picked.path });
    } catch (e) {
      setPickError(String(e));
    } finally {
      setPicking(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const action = actionFromKey(event.key);
      if (!action || saving || picking) return;

      if (action === "back") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (action === "up" || action === "down") {
        event.preventDefault();
        const step = action === "down" ? 1 : -1;
        setFieldIndex((i) => Math.max(0, Math.min(FIELDS.length - 1, i + step)));
        return;
      }

      if (action === "left" || action === "right") {
        if (isTextField(field)) return; // let the text cursor move
        event.preventDefault();
        const direction = action === "right" ? 1 : -1;
        if (field === "category") update({ category: cycle(categories, form.category, direction) });
        else if (field === "type") update({ launchType: cycle(LAUNCH_TYPES, form.launchType, direction) });
        else if (field === "actions") setActionIndex(direction === 1 ? 1 : 0);
        return;
      }

      if (action === "select") {
        event.preventDefault();
        if (event.repeat) return;
        if (field === "target" && form.launchType === "exe") {
          pickProgram();
        } else if (field === "actions") {
          if (actionIndex === 0) onSave();
          else onCancel();
        } else {
          setFieldIndex((i) => Math.min(FIELDS.length - 1, i + 1)); // Enter = next field
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const rowClass = (key: FieldKey) => (field === key ? "form-row is-focused" : "form-row");
  const focusField = (key: FieldKey) => setFieldIndex(FIELDS.indexOf(key));
  const setRef = (key: FieldKey) => (el: HTMLInputElement | null) => {
    if (el) inputRefs.current.set(key, el);
    else inputRefs.current.delete(key);
  };

  return (
    <div className="tile-form">
      <div className={rowClass("name")} onMouseDown={() => focusField("name")}>
        <span className="form-label">Name</span>
        <input
          ref={setRef("name")}
          className="form-input"
          value={form.name}
          placeholder="e.g. Hulu"
          onChange={(e) => update({ name: e.target.value })}
        />
      </div>

      <div className={rowClass("category")} onMouseDown={() => focusField("category")}>
        <span className="form-label">Category</span>
        <div className="form-field">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              tabIndex={-1}
              className={c === form.category ? "pill is-selected" : "pill"}
              onClick={() => update({ category: c })}
            >
              {label(c)}
            </button>
          ))}
        </div>
      </div>

      <div className={rowClass("type")} onMouseDown={() => focusField("type")}>
        <span className="form-label">Type</span>
        <div className="form-field">
          {LAUNCH_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              tabIndex={-1}
              className={t === form.launchType ? "pill is-selected" : "pill"}
              onClick={() => update({ launchType: t })}
            >
              {LAUNCH_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className={rowClass("target")} onMouseDown={() => focusField("target")}>
        <span className="form-label">
          {form.launchType === "exe" ? "Program" : form.launchType === "url-app" ? "Address" : "Link"}
        </span>
        {form.launchType === "exe" ? (
          <div className="form-field">
            <button type="button" tabIndex={-1} className="pill" onClick={pickProgram} disabled={picking}>
              {picking ? "Choosing…" : "Choose program…"}
            </button>
            <span className="form-note">{form.exePath ?? "No program chosen"}</span>
          </div>
        ) : (
          <input
            ref={setRef("target")}
            className="form-input"
            value={form.target}
            placeholder={form.launchType === "url-app" ? "https://www.example.com" : "steam://rungameid/12345"}
            onChange={(e) => update({ target: e.target.value })}
          />
        )}
      </div>

      <div className={rowClass("image")} onMouseDown={() => focusField("image")}>
        <span className="form-label">Image</span>
        <input
          ref={setRef("image")}
          className="form-input"
          value={form.image}
          placeholder="Optional: a file name in your images folder, e.g. hulu.jpg"
          onChange={(e) => update({ image: e.target.value })}
        />
      </div>

      <div className={rowClass("actions")} onMouseDown={() => focusField("actions")}>
        <span className="form-label" />
        <div className="form-field">
          {["Save", "Cancel"].map((text, i) => (
            <button
              key={text}
              type="button"
              tabIndex={-1}
              className={field === "actions" && actionIndex === i ? "pill is-focused" : "pill"}
              onClick={i === 0 ? onSave : onCancel}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {pickError && <p className="settings-error">{pickError}</p>}
    </div>
  );
}