"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog";

/**
 * Mount this wherever a form/editor tracks unsaved local edits. It intercepts
 * in-app link clicks and the browser back/forward button and shows our own
 * confirm dialog instead of silently discarding changes. Tab close/refresh
 * still falls back to the browser's native prompt — there's no way to render
 * custom UI during unload.
 */
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  const router = useRouter();
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  const dialog = useConfirmDialog();
  const pendingAction = useRef<(() => void) | null>(null);
  const bypassPop = useRef(false);
  const sentinelPushed = useRef(false);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Intercept clicks on same-origin links (sidebar nav, "back" links, etc.).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!dirtyRef.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      pendingAction.current = () => router.push(url.pathname + url.search);
      dialog.show();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intercept the browser back/forward button via a sentinel history entry.
  useEffect(() => {
    if (dirty && !sentinelPushed.current) {
      sentinelPushed.current = true;
      history.pushState({ __unsavedGuard: true }, "", window.location.href);
    }
    if (!dirty) sentinelPushed.current = false;
  }, [dirty]);

  useEffect(() => {
    function onPopState() {
      if (bypassPop.current) {
        bypassPop.current = false;
        return;
      }
      if (!dirtyRef.current) return;
      history.pushState({ __unsavedGuard: true }, "", window.location.href);
      pendingAction.current = () => {
        bypassPop.current = true;
        history.go(-2);
      };
      dialog.show();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirmLeave() {
    dialog.hide();
    pendingAction.current?.();
    pendingAction.current = null;
  }

  function cancel() {
    dialog.hide();
    pendingAction.current = null;
  }

  return (
    <ConfirmDialog
      open={dialog.open}
      title="Discard changes?"
      message="You have unsaved changes. Leaving now will discard them."
      confirmLabel="Discard"
      danger
      onConfirm={confirmLeave}
      onCancel={cancel}
    />
  );
}
