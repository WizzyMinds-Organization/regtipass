"use client";

import { useState } from "react";
import { GripVertical, Plus, Ticket, Trash2, X } from "lucide-react";
import type { FieldType, FormField } from "@/lib/supabase/types";
import { createFormField, deleteFormField, reorderFormFields, updateFormField } from "./actions";
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";

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
    show_on_ticket: false,
    sort_order: 0,
    created_at: new Date().toISOString(),
  };
}

function FieldCard({
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
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition-colors ${
        dragOver ? "border-orange-400" : "border-zinc-200"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          draggable={draggable}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="mt-1.5 shrink-0 cursor-grab text-zinc-300 hover:text-zinc-500 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <input
          autoFocus={autoFocus}
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Question"
          className="min-w-0 flex-1 border-b border-zinc-200 pb-1.5 text-base font-medium text-zinc-900 outline-none focus:border-orange-500"
        />
        <select
          value={field.field_type}
          onChange={(e) => {
            const field_type = e.target.value as FieldType;
            onChange({ ...field, field_type, options: field_type === "select" ? field.options ?? ["Option 1"] : null });
          }}
          className="shrink-0 rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-700"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
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
                  onChange={(e) => {
                    const options = [...(field.options ?? [])];
                    options[i] = e.target.value;
                    onChange({ ...field, options });
                  }}
                  className="flex-1 border-b border-zinc-100 py-1 text-sm text-zinc-700 outline-none focus:border-orange-500"
                />
                <button
                  onClick={() => {
                    const options = (field.options ?? []).filter((_, idx) => idx !== i);
                    onChange({ ...field, options });
                  }}
                  className="text-zinc-300 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const options = [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`];
                onChange({ ...field, options });
              }}
              className="ml-5 self-start text-sm text-zinc-400 hover:text-orange-600"
            >
              + Add option
            </button>
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

      <div className="mt-3 flex flex-wrap items-center justify-end gap-4 border-t border-zinc-100 pt-3">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <Ticket className="h-3.5 w-3.5 text-zinc-400" />
          Show on ticket
          <button
            type="button"
            role="switch"
            aria-checked={field.show_on_ticket}
            onClick={() => onChange({ ...field, show_on_ticket: !field.show_on_ticket })}
            className={`relative inline-block h-5 w-9 shrink-0 overflow-hidden rounded-full align-middle outline-none transition-colors ${
              field.show_on_ticket ? "bg-orange-600" : "bg-zinc-200"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                field.show_on_ticket ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          Required
          <button
            type="button"
            role="switch"
            aria-checked={field.required}
            onClick={() => onChange({ ...field, required: !field.required })}
            className={`relative inline-block h-5 w-9 shrink-0 overflow-hidden rounded-full align-middle outline-none transition-colors ${
              field.required ? "bg-orange-600" : "bg-zinc-200"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                field.required ? "translate-x-4" : "translate-x-0"
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
  const [savedFields, setSavedFields] = useState(initialFields);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const cancelDialog = useConfirmDialog();

  const dirty = JSON.stringify(fields) !== JSON.stringify(savedFields);

  function updateField(id: string, next: FormField) {
    setFields((prev) => prev.map((f) => (f.id === id ? next : f)));
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
    }
    setDraggedId(null);
    setDragOverId(null);
  }

  function handleCancel() {
    setFields(savedFields);
    setSaveError(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const currentIds = new Set(fields.map((f) => f.id));
      const deletions = savedFields.filter((f) => !currentIds.has(f.id));
      for (const f of deletions) {
        await deleteFormField(eventId, f.id);
      }

      const finalFields: FormField[] = [];
      for (const f of fields) {
        if (f.id.startsWith("draft-")) {
          if (!f.label.trim()) continue;
          const created = await createFormField(eventId, {
            label: f.label,
            field_type: f.field_type,
            required: f.required,
            options: f.options,
            show_on_ticket: f.show_on_ticket,
          });
          finalFields.push(created);
        } else {
          const original = savedFields.find((s) => s.id === f.id);
          if (original && JSON.stringify(original) !== JSON.stringify(f)) {
            const { error } = await updateFormField(eventId, f.id, {
              label: f.label,
              field_type: f.field_type,
              required: f.required,
              options: f.options,
              show_on_ticket: f.show_on_ticket,
            });
            if (error) throw new Error(error);
          }
          finalFields.push(f);
        }
      }

      const orderChanged = finalFields.map((f) => f.id).join(",") !== savedFields.map((f) => f.id).join(",");
      if (orderChanged) {
        await reorderFormFields(eventId, finalFields.map((f) => f.id));
      }

      setFields(finalFields);
      setSavedFields(finalFields);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    }
    setSaving(false);
  }

  if (!editable && fields.length === 0) {
    return <p className="text-sm text-zinc-400">No fields were configured for this form.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {editable && (
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm shadow-sm">
          <span className={dirty ? "text-amber-900" : "text-zinc-400"}>
            {dirty ? "Unsaved changes" : "No unsaved changes"}
          </span>
          <div className="flex items-center gap-2">
            {saveError && <span className="text-red-600">{saveError}</span>}
            <button
              onClick={cancelDialog.show}
              disabled={saving || !dirty}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {fields.map((f) => (
        <FieldCard
          key={f.id}
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
          onChange={(next) => updateField(f.id, next)}
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

      <UnsavedChangesGuard dirty={editable && dirty} />
      <ConfirmDialog
        open={cancelDialog.open}
        title="Discard changes?"
        message="You have unsaved changes to this form. Discard them?"
        confirmLabel="Discard"
        danger
        onConfirm={() => {
          handleCancel();
          cancelDialog.hide();
        }}
        onCancel={cancelDialog.hide}
      />
    </div>
  );
}
