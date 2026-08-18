"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { FormField, Template, TemplateAnchor } from "@/lib/supabase/types";
import { addAnchor, deleteAnchor, saveAnchors } from "../actions";

const BASE_DISPLAY_WIDTH = 640;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

function dummyValueFor(field: FormField | undefined): string {
  if (!field) return "Sample text";
  switch (field.field_type) {
    case "email":
      return "name@example.com";
    case "phone":
      return "+1 555 0100";
    case "number":
      return "42";
    case "select":
      return field.options?.[0] ?? "Option";
    default:
      return "Sample text";
  }
}

export function TemplateEditor({
  eventId,
  template,
  imageUrl,
  initialAnchors,
  fields,
  editable,
}: {
  eventId: string;
  template: Template;
  imageUrl: string;
  initialAnchors: TemplateAnchor[];
  fields: FormField[];
  editable: boolean;
}) {
  const [anchors, setAnchors] = useState(initialAnchors);
  const [savedAnchors, setSavedAnchors] = useState(initialAnchors);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [wrapperWidth, setWrapperWidth] = useState(BASE_DISPLAY_WIDTH);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origin: { x: number; y: number; width: number; height: number };
  } | null>(null);

  useEffect(() => {
    QRCode.toDataURL("PREVIEW-TICKET-ID", { margin: 1, width: 300 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setWrapperWidth(Math.min(BASE_DISPLAY_WIDTH, width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const baseScale = wrapperWidth / template.image_width;
  const scale = baseScale * zoom;
  const displayWidth = template.image_width * scale;
  const displayHeight = template.image_height * scale;

  const dirty = JSON.stringify(anchors) !== JSON.stringify(savedAnchors);

  const usedFieldKeys = new Set(anchors.filter((a) => a.kind === "field").map((a) => a.field_key));
  const hasQr = anchors.some((a) => a.kind === "qr");
  const hasTicketId = anchors.some((a) => a.kind === "ticket_id");
  const selected = anchors.find((a) => a.id === selectedId) ?? null;

  async function handleAddAnchor(kind: "qr" | "ticket_id" | "field", fieldKey: string | null) {
    const created = await addAnchor(eventId, template.id, kind, fieldKey);
    setAnchors((prev) => [...prev, created]);
    setSavedAnchors((prev) => [...prev, created]);
    setSelectedId(created.id);
  }

  async function handleDelete(anchorId: string) {
    setAnchors((prev) => prev.filter((a) => a.id !== anchorId));
    setSavedAnchors((prev) => prev.filter((a) => a.id !== anchorId));
    setSelectedId(null);
    await deleteAnchor(eventId, template.id, anchorId);
  }

  function onPointerDown(e: React.PointerEvent, anchor: TemplateAnchor, mode: "move" | "resize") {
    if (!editable) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedId(anchor.id);
    dragState.current = {
      id: anchor.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: { x: anchor.x, y: anchor.y, width: anchor.width, height: anchor.height },
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / scale;
    const dy = (e.clientY - drag.startY) / scale;

    setAnchors((prev) =>
      prev.map((a) => {
        if (a.id !== drag.id) return a;
        if (drag.mode === "move") {
          return {
            ...a,
            x: Math.max(0, Math.round(drag.origin.x + dx)),
            y: Math.max(0, Math.round(drag.origin.y + dy)),
          };
        }
        return {
          ...a,
          width: Math.max(10, Math.round(drag.origin.width + dx)),
          height: Math.max(10, Math.round(drag.origin.height + dy)),
        };
      })
    );
  }

  function onPointerUp() {
    dragState.current = null;
  }

  function patchSelected(patch: Partial<TemplateAnchor>) {
    if (!selected) return;
    setAnchors((prev) => prev.map((a) => (a.id === selected.id ? { ...a, ...patch } : a)));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const updates = anchors
      .filter((a) => JSON.stringify(a) !== JSON.stringify(savedAnchors.find((s) => s.id === a.id)))
      .map((a) => ({
        id: a.id,
        patch: {
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
          font_size: a.font_size,
          align: a.align,
          color: a.color,
        },
      }));
    try {
      await saveAnchors(eventId, template.id, updates);
      setSavedAnchors(anchors);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    }
    setSaving(false);
  }

  function handleCancel() {
    setAnchors(savedAnchors);
    setSelectedId(null);
    setSaveError(null);
  }

  function anchorLabel(a: TemplateAnchor) {
    if (a.kind === "qr") return "QR code";
    if (a.kind === "ticket_id") return "Ticket ID";
    return fields.find((f) => f.key === a.field_key)?.label ?? a.field_key ?? "Field";
  }

  function anchorPreview(a: TemplateAnchor) {
    if (a.kind === "qr") {
      return qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="QR preview" className="h-full w-full object-contain" />
      ) : null;
    }
    const text = a.kind === "ticket_id" ? "TCKT-A1B2C3D4" : dummyValueFor(fields.find((f) => f.key === a.field_key));
    const textAlign = a.align === "center" ? "center" : a.align === "right" ? "right" : "left";
    return (
      <span
        className="w-full truncate font-sans leading-none"
        style={{ fontSize: a.font_size * scale, color: a.color, textAlign }}
      >
        {text}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {editable && dirty && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <span>You have unsaved changes.</span>
          <div className="flex items-center gap-2">
            {saveError && <span className="text-red-600">{saveError}</span>}
            <button
              onClick={handleCancel}
              disabled={saving}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - 0.25) * 100) / 100))}
              className="rounded-md border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50"
              title="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-xs text-zinc-500">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + 0.25) * 100) / 100))}
              className="rounded-md border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50"
              title="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="rounded-md border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50"
              title="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div ref={wrapperRef} className="w-full">
            <div className="h-[60vh] min-h-[420px] w-full overflow-auto rounded-lg border border-zinc-200 bg-zinc-100">
              <div
                className="flex min-h-full items-center justify-center p-6"
                style={{ width: Math.max(displayWidth + 48, wrapperWidth) }}
              >
                <div
                  className="relative select-none touch-none overflow-hidden rounded-lg bg-white shadow-sm"
                  style={{ width: displayWidth, height: displayHeight }}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onClick={() => setSelectedId(null)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={template.name}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  />
                  {anchors.map((a) => (
                    <div
                      key={a.id}
                      onPointerDown={(e) => onPointerDown(e, a, "move")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(a.id);
                      }}
                      className={`absolute flex items-center overflow-hidden border-2 ${
                        a.align === "center" ? "justify-center" : a.align === "right" ? "justify-end" : "justify-start"
                      } ${
                        selectedId === a.id ? "border-blue-500 bg-blue-500/10" : "border-zinc-400/60 bg-white/30 hover:border-zinc-500"
                      } ${editable ? "cursor-move" : "cursor-default"}`}
                      style={{
                        left: a.x * scale,
                        top: a.y * scale,
                        width: a.width * scale,
                        height: a.height * scale,
                      }}
                    >
                      {selectedId === a.id && (
                        <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {anchorLabel(a)}
                        </span>
                      )}
                      {anchorPreview(a)}
                      {editable && selectedId === a.id && (
                        <div
                          onPointerDown={(e) => onPointerDown(e, a, "resize")}
                          className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize bg-blue-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {editable && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-3">
              <h3 className="text-xs font-semibold text-zinc-900">Add to ticket</h3>
              <div className="mt-2 flex flex-col gap-1.5">
                {!hasQr && (
                  <button
                    onClick={() => handleAddAnchor("qr", null)}
                    className="rounded-md border border-zinc-200 px-2 py-1.5 text-left text-xs hover:bg-zinc-50"
                  >
                    + QR code
                  </button>
                )}
                {!hasTicketId && (
                  <button
                    onClick={() => handleAddAnchor("ticket_id", null)}
                    className="rounded-md border border-zinc-200 px-2 py-1.5 text-left text-xs hover:bg-zinc-50"
                  >
                    + Ticket ID (printed text)
                  </button>
                )}
                {fields
                  .filter((f) => !usedFieldKeys.has(f.key))
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleAddAnchor("field", f.key)}
                      className="rounded-md border border-zinc-200 px-2 py-1.5 text-left text-xs hover:bg-zinc-50"
                    >
                      + {f.label}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {selected && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-900">{anchorLabel(selected)}</h3>
                {editable && (
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="text-zinc-400 hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {editable && selected.kind !== "qr" && (
                <div className="mt-3 flex flex-col gap-2">
                  <label className="text-xs text-zinc-600">
                    Font size
                    <input
                      type="number"
                      value={selected.font_size}
                      onChange={(e) => patchSelected({ font_size: Number(e.target.value) })}
                      className="mt-0.5 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs text-zinc-600">
                    Align
                    <select
                      value={selected.align}
                      onChange={(e) =>
                        patchSelected({ align: e.target.value as "left" | "center" | "right" })
                      }
                      className="mt-0.5 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                  <label className="text-xs text-zinc-600">
                    Color
                    <input
                      type="color"
                      value={selected.color}
                      onChange={(e) => patchSelected({ color: e.target.value })}
                      className="mt-0.5 h-8 w-full rounded-md border border-zinc-300"
                    />
                  </label>
                </div>
              )}

              <p className="mt-3 text-[11px] text-zinc-400">
                Drag to move, drag the corner to resize. Changes save when you click Save above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
