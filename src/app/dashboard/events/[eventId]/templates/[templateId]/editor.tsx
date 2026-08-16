"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormField, Template, TemplateAnchor } from "@/lib/supabase/types";
import { addAnchor, deleteAnchor, updateAnchor } from "../actions";

const DISPLAY_WIDTH = 640;

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
  const router = useRouter();
  const [anchors, setAnchors] = useState(initialAnchors);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origin: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const scale = DISPLAY_WIDTH / template.image_width;
  const displayHeight = template.image_height * scale;

  const usedFieldKeys = new Set(anchors.filter((a) => a.kind === "field").map((a) => a.field_key));
  const hasQr = anchors.some((a) => a.kind === "qr");
  const hasTicketId = anchors.some((a) => a.kind === "ticket_id");
  const selected = anchors.find((a) => a.id === selectedId) ?? null;

  function refresh() {
    router.refresh();
  }

  async function handleAddAnchor(kind: "qr" | "ticket_id" | "field", fieldKey: string | null) {
    await addAnchor(eventId, template.id, kind, fieldKey);
    refresh();
    window.location.reload();
  }

  async function handleDelete(anchorId: string) {
    setAnchors((prev) => prev.filter((a) => a.id !== anchorId));
    setSelectedId(null);
    await deleteAnchor(eventId, template.id, anchorId);
    refresh();
  }

  function onPointerDown(
    e: React.PointerEvent,
    anchor: TemplateAnchor,
    mode: "move" | "resize"
  ) {
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

  async function onPointerUp() {
    const drag = dragState.current;
    dragState.current = null;
    if (!drag) return;
    const a = anchors.find((x) => x.id === drag.id);
    if (!a) return;
    await updateAnchor(eventId, template.id, a.id, {
      x: a.x,
      y: a.y,
      width: a.width,
      height: a.height,
    });
  }

  async function patchSelected(patch: Partial<TemplateAnchor>) {
    if (!selected) return;
    setAnchors((prev) => prev.map((a) => (a.id === selected.id ? { ...a, ...patch } : a)));
    await updateAnchor(eventId, template.id, selected.id, patch);
  }

  function anchorLabel(a: TemplateAnchor) {
    if (a.kind === "qr") return "QR code";
    if (a.kind === "ticket_id") return "Ticket ID";
    return fields.find((f) => f.key === a.field_key)?.label ?? a.field_key ?? "Field";
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
        style={{ width: DISPLAY_WIDTH, height: displayHeight }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
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
            className={`absolute flex items-center justify-center border-2 text-[10px] font-medium ${
              selectedId === a.id ? "border-blue-500 bg-blue-500/10" : "border-zinc-400/70 bg-white/40"
            } ${editable ? "cursor-move" : "cursor-default"}`}
            style={{
              left: a.x * scale,
              top: a.y * scale,
              width: a.width * scale,
              height: a.height * scale,
              color: a.color,
            }}
          >
            <span className="truncate px-1">{anchorLabel(a)}</span>
            {editable && selectedId === a.id && (
              <div
                onPointerDown={(e) => onPointerDown(e, a, "resize")}
                className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize bg-blue-500"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {editable && (
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
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
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-900">{anchorLabel(selected)}</h3>
              {editable && (
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
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
              Drag to move, drag the corner to resize.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
