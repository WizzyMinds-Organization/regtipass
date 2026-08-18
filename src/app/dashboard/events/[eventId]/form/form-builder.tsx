"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import type { FieldType, FormField } from "@/lib/supabase/types";
import { createFormField, deleteFormField, reorderFormFields, updateFormField } from "./actions";

const TYPE_LABELS: Record<FieldType, string> = {
  text: "Short answer",
  email: "Email",
  phone: "Phone",
  number: "Number",
  select: "Single select",
};

function newDraft(): FormField {
  return {
    id: `draft-${crypto.randomUUID()}`,
    event_id: "",
    key: "",
    label: "",
    field_type: "text",
    options: null,
    required: false,
    sort_order: 0,
    created_at: new Date().toISOString(),
  };
}

function FieldCard({
  eventId,
  field,
  onChange,
  onRemove,
  autoFocus,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragOver,
}: {
  eventId: string;
  field: FormField;
  onChange: (next: FormField) => void;
  onRemove: () => void;
  autoFocus?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  dragOver?: boolean;
}) {
  const isDraft = field.id.startsWith("draft-");
  const [saving, setSaving] = useState(false);

  async function persistLabel(label: string) {
    if (!label.trim()) return;
    if (isDraft) {
      setSaving(true);
      const created = await createFormField(eventId, {
        label,
        field_type: field.field_type,
        required: field.required,
        options: field.options,
      });
      setSaving(false);
      onChange(created);
    } else {
      await updateFormField(eventId, field.id, { label });
    }
  }

  async function persist(patch: Partial<FormField>) {
    if (isDraft) return; // structural fields (type/required/options) wait until label is saved first
    await updateFormField(eventId, field.id, patch);
  }

  async function handleRemove() {
    if (!isDraft) await deleteFormField(eventId, field.id);
    onRemove();
  }

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition-colors ${
        dragOver ? "border-orange-400" : "border-zinc-200"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        {!isDraft && (
          <span
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="mt-1.5 shrink-0 cursor-grab text-zinc-300 hover:text-zinc-500 active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        )}
        <input
          autoFocus={autoFocus}
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          onBlur={(e) => persistLabel(e.target.value)}
          placeholder="Question"
          className="min-w-0 flex-1 border-b border-zinc-200 pb-1.5 text-base font-medium text-zinc-900 outline-none focus:border-orange-500"
        />
        <select
          value={field.field_type}
          disabled={isDraft}
          onChange={(e) => {
            const field_type = e.target.value as FieldType;
            const next = { ...field, field_type, options: field_type === "select" ? field.options ?? ["Option 1"] : null };
            onChange(next);
            persist({ field_type: next.field_type, options: next.options });
          }}
          className="shrink-0 rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-700 disabled:opacity-50"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={handleRemove}
          className="shrink-0 text-zinc-400 hover:text-red-600"
          title="Remove question"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3">
        {field.field_type === "select" ? (
          <div className="flex flex-col gap-1.5">
            {(field.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full border border-zinc-300" />
                <input
                  value={opt}
                  disabled={isDraft}
                  onChange={(e) => {
                    const options = [...(field.options ?? [])];
                    options[i] = e.target.value;
                    onChange({ ...field, options });
                  }}
                  onBlur={() => persist({ options: field.options })}
                  className="flex-1 border-b border-zinc-100 py-1 text-sm text-zinc-700 outline-none focus:border-orange-500 disabled:opacity-50"
                />
                {!isDraft && (
                  <button
                    onClick={() => {
                      const options = (field.options ?? []).filter((_, idx) => idx !== i);
                      onChange({ ...field, options });
                      persist({ options });
                    }}
                    className="text-zinc-300 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {!isDraft && (
              <button
                onClick={() => {
                  const options = [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`];
                  onChange({ ...field, options });
                  persist({ options });
                }}
                className="ml-5 self-start text-sm text-zinc-400 hover:text-orange-600"
              >
                + Add option
              </button>
            )}
          </div>
        ) : (
          <input
            disabled
            placeholder={
              field.field_type === "email"
                ? "name@example.com"
                : field.field_type === "phone"
                ? "+1 555 0100"
                : field.field_type === "number"
                ? "0"
                : "Short-answer text"
            }
            className="w-full max-w-xs border-b border-dotted border-zinc-300 pb-1 text-sm text-zinc-400 outline-none"
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
        {saving && <span className="text-xs text-zinc-400">Saving...</span>}
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          Required
          <button
            type="button"
            role="switch"
            aria-checked={field.required}
            disabled={isDraft}
            onClick={() => {
              const required = !field.required;
              onChange({ ...field, required });
              persist({ required });
            }}
            className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${
              field.required ? "bg-orange-600" : "bg-zinc-200"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                field.required ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
}

export function FormBuilder({
  eventId,
  initialFields,
  editable,
}: {
  eventId: string;
  initialFields: FormField[];
  editable: boolean;
}) {
  const [fields, setFields] = useState(initialFields);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function updateField(id: string, next: FormField) {
    setFields((prev) => prev.map((f) => (f.id === id ? next : f)));
  }

  function replaceDraft(draftId: string, created: FormField) {
    setFields((prev) => prev.map((f) => (f.id === draftId ? created : f)));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function addField() {
    const draft = newDraft();
    setFields((prev) => [...prev, draft]);
    setFocusId(draft.id);
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const from = fields.findIndex((f) => f.id === draggedId);
    const to = fields.findIndex((f) => f.id === targetId);
    if (from !== -1 && to !== -1) {
      const next = [...fields];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setFields(next);
      reorderFormFields(
        eventId,
        next.map((f) => f.id)
      ).catch(() => {});
    }
    setDraggedId(null);
    setDragOverId(null);
  }

  if (!editable && fields.length === 0) {
    return <p className="text-sm text-zinc-400">No fields were configured for this form.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.map((f) => (
        <FieldCard
          key={f.id}
          eventId={eventId}
          field={f}
          autoFocus={f.id === focusId}
          draggable={editable}
          dragOver={dragOverId === f.id}
          onDragStart={() => setDraggedId(f.id)}
          onDragOver={(e) => {
            e.preventDefault();
            if (draggedId && draggedId !== f.id) setDragOverId(f.id);
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(f.id);
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setDragOverId(null);
          }}
          onChange={(next) => {
            if (f.id.startsWith("draft-") && !next.id.startsWith("draft-")) {
              replaceDraft(f.id, next);
            } else {
              updateField(f.id, next);
            }
          }}
          onRemove={() => removeField(f.id)}
        />
      ))}

      {fields.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-400">
          No fields yet — add &quot;Name&quot; to get started.
        </div>
      )}

      {editable && (
        <button
          onClick={addField}
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      )}
    </div>
  );
}
