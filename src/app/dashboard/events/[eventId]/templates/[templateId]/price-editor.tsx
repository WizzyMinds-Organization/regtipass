"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTemplatePrice } from "../actions";

export function PriceEditor({
  eventId,
  templateId,
  initialPrice,
  editable,
}: {
  eventId: string;
  templateId: string;
  initialPrice: number;
  editable: boolean;
}) {
  const router = useRouter();
  const [price, setPrice] = useState(initialPrice);
  const [saving, setSaving] = useState(false);
  const dirty = price !== initialPrice;

  async function save() {
    setSaving(true);
    try {
      await updateTemplatePrice(eventId, templateId, price);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!editable) {
    return <span className="text-sm text-zinc-500">Price: {initialPrice}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-zinc-600">Price</label>
      <input
        type="number"
        min={0}
        step="0.01"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
        className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm"
      />
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-orange-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}
