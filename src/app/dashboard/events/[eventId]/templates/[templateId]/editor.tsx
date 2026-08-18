"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { GripVertical, Minus, Plus, QrCode, RotateCcw, Ticket, Trash2 } from "lucide-react";
import type { FormField, Template, TemplateAnchor } from "@/lib/supabase/types";
import { addAnchor, deleteAnchor, saveAnchors } from "../actions";
import { PriceEditor } from "./price-editor";
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

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

function touchDistance(touches: React.TouchList | TouchList) {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

// Fields toggled "show on ticket" from the Form page auto-get a placeholder
// anchor here on first load, so there's nothing left to add manually.
// Sized and stacked relative to the artwork (like the QR/ticket-ID
// defaults below) instead of a fixed 200x24 at (20,20) — on a large
// template that read as a cramped stack of tiny labels in one corner.
function withAutoAddedFields(
  anchors: TemplateAnchor[],
  fields: FormField[],
  templateId: string,
  imageWidth: number,
  imageHeight: number
): TemplateAnchor[] {
  const missing = fields.filter(
    (f) => f.show_on_ticket && !anchors.some((a) => a.kind === "field" && a.field_key === f.key)
  );
  if (missing.length === 0) return anchors;

  const margin = Math.round(imageWidth * 0.05);
  const fontSize = Math.min(32, Math.max(14, Math.round(imageHeight * 0.05)));
  const rowHeight = Math.round(fontSize * 1.9);
  const width = Math.round(Math.min(imageWidth * 0.45, imageWidth - margin * 2));
  const existingFieldCount = anchors.filter((a) => a.kind === "field").length;

  const additions: TemplateAnchor[] = missing.map((f, i) => ({
    id: `draft-${crypto.randomUUID()}`,
    template_id: templateId,
    kind: "field",
    field_key: f.key,
    x: margin,
    y: margin + (existingFieldCount + i) * rowHeight,
    width,
    height: rowHeight - Math.round(rowHeight * 0.2),
    font: "",
    font_size: fontSize,
    align: "left",
    color: "#000000",
    visible: true,
    created_at: new Date().toISOString(),
  }));
  return [...anchors, ...additions];
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
  const [anchors, setAnchors] = useState<TemplateAnchor[]>(() =>
    withAutoAddedFields(initialAnchors, fields, template.id, template.image_width, template.image_height)
  );
  const [savedAnchors, setSavedAnchors] = useState(initialAnchors);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [wrapperWidth, setWrapperWidth] = useState(640);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const cancelDialog = useConfirmDialog();
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const spacePressedRef = useRef(false);
  const dragState = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origin: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const pinchState = useRef<{ startDist: number; startZoom: number } | null>(null);
  const panState = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [panelPos, setPanelPos] = useState({ x: 24, y: 88 });
  const panelDrag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Hold Space for a Figma-style hand tool: click-drag pans the canvas instead of moving anchors.
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || isTypingTarget(e.target)) return;
      // preventDefault on every repeat too, or the browser's page-scroll-on-space kicks in.
      e.preventDefault();
      if (spacePressedRef.current) return;
      spacePressedRef.current = true;
      setSpacePressed(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      spacePressedRef.current = false;
      setSpacePressed(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

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
      if (width) setWrapperWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pinch-to-zoom (touch). Attached via a native, non-passive listener so
  // preventDefault actually stops the browser's own pinch/scroll gesture.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        pinchState.current = { startDist: touchDistance(e.touches), startZoom: zoomRef.current };
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && pinchState.current) {
        e.preventDefault();
        const dist = touchDistance(e.touches);
        const ratio = dist / pinchState.current.startDist;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchState.current.startZoom * ratio));
        setZoom(Math.round(next * 100) / 100);
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinchState.current = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    // Trackpad pinch surfaces as a wheel event with ctrlKey set (Safari/Chrome/Firefox all do this).
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current - e.deltaY * 0.01));
      setZoom(Math.round(next * 100) / 100);
    }
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const baseScale = wrapperWidth / template.image_width;
  const scale = baseScale * zoom;
  const displayWidth = template.image_width * scale;
  const displayHeight = template.image_height * scale;

  const dirty = JSON.stringify(anchors) !== JSON.stringify(savedAnchors);

  const hasQr = anchors.some((a) => a.kind === "qr");
  const hasTicketId = anchors.some((a) => a.kind === "ticket_id");
  const selected = anchors.find((a) => a.id === selectedId) ?? null;

  function handleAddAnchor(kind: "qr" | "ticket_id") {
    // Sized relative to the artwork (not a fixed pixel value) so the QR
    // reads at a scannable size on both small and large templates, and
    // placed away from the top-left corner so it doesn't land on top of
    // whatever's already there — typically a title or the first field.
    const qrSize = Math.round(Math.min(template.image_width, template.image_height) * 0.28);
    const margin = Math.round(template.image_width * 0.05);
    const defaults: Record<typeof kind, { width: number; height: number; font_size: number; x: number; y: number }> = {
      qr: {
        width: qrSize,
        height: qrSize,
        font_size: 16,
        x: Math.max(margin, template.image_width - qrSize - margin),
        y: Math.max(margin, Math.round((template.image_height - qrSize) / 2)),
      },
      ticket_id: {
        width: 200,
        height: 24,
        font_size: 14,
        x: margin,
        y: Math.max(margin, template.image_height - 44),
      },
    };
    const id = `draft-${crypto.randomUUID()}`;
    const draft: TemplateAnchor = {
      id,
      template_id: template.id,
      kind,
      field_key: null,
      ...defaults[kind],
      font: "",
      align: "left",
      color: "#000000",
      visible: true,
      created_at: new Date().toISOString(),
    };
    setAnchors((prev) => [...prev, draft]);
    setSelectedId(id);
  }

  function onPanelPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    panelDrag.current = { startX: e.clientX, startY: e.clientY, origX: panelPos.x, origY: panelPos.y };
  }

  function onPanelPointerMove(e: React.PointerEvent) {
    const d = panelDrag.current;
    if (!d) return;
    setPanelPos({
      x: Math.max(8, Math.min(window.innerWidth - 48, d.origX + (e.clientX - d.startX))),
      y: Math.max(8, Math.min(window.innerHeight - 48, d.origY + (e.clientY - d.startY))),
    });
  }

  function onPanelPointerUp() {
    panelDrag.current = null;
  }

  function handleDelete(anchorId: string) {
    setAnchors((prev) => prev.filter((a) => a.id !== anchorId));
    setSelectedId(null);
  }

  function onPointerDown(e: React.PointerEvent, anchor: TemplateAnchor, mode: "move" | "resize") {
    if (!editable || spacePressedRef.current) return;
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

  function onViewportPointerDown(e: React.PointerEvent) {
    if (!spacePressedRef.current) return;
    const el = viewportRef.current;
    if (!el) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    panState.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    setIsPanning(true);
  }

  function onViewportPointerMove(e: React.PointerEvent) {
    const pan = panState.current;
    const el = viewportRef.current;
    if (!pan || !el) return;
    el.scrollLeft = pan.scrollLeft - (e.clientX - pan.startX);
    el.scrollTop = pan.scrollTop - (e.clientY - pan.startY);
  }

  function onViewportPointerUp() {
    panState.current = null;
    setIsPanning(false);
  }

  function patchSelected(patch: Partial<TemplateAnchor>) {
    if (!selected) return;
    setAnchors((prev) => prev.map((a) => (a.id === selected.id ? { ...a, ...patch } : a)));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const currentIds = new Set(anchors.map((a) => a.id));
      const deletions = savedAnchors.filter((a) => !currentIds.has(a.id));
      for (const a of deletions) {
        await deleteAnchor(eventId, template.id, a.id);
      }

      const patches: { id: string; patch: Partial<TemplateAnchor> }[] = [];
      const finalAnchors: TemplateAnchor[] = [];
      let newSelectedId = selectedId;

      for (const a of anchors) {
        if (a.id.startsWith("draft-")) {
          const created = await addAnchor(eventId, template.id, a.kind, a.field_key);
          const patch = {
            x: a.x,
            y: a.y,
            width: a.width,
            height: a.height,
            font_size: a.font_size,
            align: a.align,
            color: a.color,
          };
          patches.push({ id: created.id, patch });
          finalAnchors.push({ ...created, ...patch });
          if (selectedId === a.id) newSelectedId = created.id;
        } else {
          const original = savedAnchors.find((s) => s.id === a.id);
          if (original && JSON.stringify(original) !== JSON.stringify(a)) {
            patches.push({
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
            });
          }
          finalAnchors.push(a);
        }
      }

      if (patches.length > 0) {
        await saveAnchors(eventId, template.id, patches);
      }

      setAnchors(finalAnchors);
      setSavedAnchors(finalAnchors);
      setSelectedId(newSelectedId);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">{template.name}</h2>
          <PriceEditor
            eventId={eventId}
            templateId={template.id}
            initialPrice={template.price}
            editable={editable}
          />
        </div>

        {editable && (
          <div className="flex items-center gap-2 text-sm">
            {saveError && <span className="text-red-600">{saveError}</span>}
            <span className={dirty ? "text-amber-900" : "text-zinc-400"}>
              {dirty ? "Unsaved changes" : "No unsaved changes"}
            </span>
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
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
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

          {editable && !hasQr && (
            <button
              onClick={() => handleAddAnchor("qr")}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <QrCode className="h-3.5 w-3.5" />
              Add QR code
            </button>
          )}
          {editable && !hasTicketId && (
            <button
              onClick={() => handleAddAnchor("ticket_id")}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <Ticket className="h-3.5 w-3.5" />
              Add Ticket ID
            </button>
          )}

          <span className="ml-auto hidden text-xs text-zinc-400 sm:inline">
            Hold Space to pan &middot; Pinch to zoom on touch
          </span>
        </div>

        <div ref={wrapperRef} className="min-w-0 w-full">
            <div
              ref={viewportRef}
              onPointerDown={onViewportPointerDown}
              onPointerMove={onViewportPointerMove}
              onPointerUp={onViewportPointerUp}
              onPointerLeave={onViewportPointerUp}
              className={`h-[75vh] min-h-[480px] w-full overflow-auto overscroll-contain rounded-lg border border-zinc-200 bg-zinc-100 ${
                spacePressed ? (isPanning ? "cursor-grabbing" : "cursor-grab") : ""
              }`}
            >
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
                        if (spacePressedRef.current) return;
                        e.stopPropagation();
                        setSelectedId(a.id);
                      }}
                      className={`absolute flex items-start overflow-hidden border-2 ${
                        a.align === "center" ? "justify-center" : a.align === "right" ? "justify-end" : "justify-start"
                      } ${
                        selectedId === a.id ? "border-blue-500 bg-blue-500/10" : "border-zinc-400/60 bg-white/30 hover:border-zinc-500"
                      } ${spacePressed ? "cursor-grab" : editable ? "cursor-move" : "cursor-default"}`}
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
      {selected && (
        <div
          style={{ left: panelPos.x, top: panelPos.y }}
          className="fixed z-30 w-64 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl"
        >
          <div
            onPointerDown={onPanelPointerDown}
            onPointerMove={onPanelPointerMove}
            onPointerUp={onPanelPointerUp}
            onPointerLeave={onPanelPointerUp}
            className="mb-2 flex cursor-grab items-center justify-between active:cursor-grabbing"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              {anchorLabel(selected)}
            </span>
            {editable && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => handleDelete(selected.id)}
                className="rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {editable && selected.kind !== "qr" && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={selected.font_size}
                onChange={(e) => patchSelected({ font_size: Number(e.target.value) })}
                title="Font size"
                className="w-14 min-w-0 rounded-md border border-zinc-300 px-1.5 py-1 text-xs"
              />
              <select
                value={selected.align}
                onChange={(e) => patchSelected({ align: e.target.value as "left" | "center" | "right" })}
                title="Align"
                className="min-w-0 flex-1 rounded-md border border-zinc-300 px-1 py-1 text-xs"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
              <input
                type="color"
                value={selected.color}
                onChange={(e) => patchSelected({ color: e.target.value })}
                title="Color"
                className="h-7 w-8 shrink-0 rounded-md border border-zinc-300"
              />
            </div>
          )}

          {editable && (
            <p className="mt-2 text-[10px] text-zinc-400">Drag to move · drag the corner to resize.</p>
          )}
        </div>
      )}

      <UnsavedChangesGuard dirty={editable && dirty} />
      <ConfirmDialog
        open={cancelDialog.open}
        title="Discard changes?"
        message="You have unsaved changes to this ticket template. Discard them?"
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
