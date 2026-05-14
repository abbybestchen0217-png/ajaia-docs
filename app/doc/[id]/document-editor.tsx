"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const USER_STORAGE_KEY = "ajaia-docs-user-id";

type DocPayload = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  isOwner?: boolean;
};

function parseInitialContent(raw: string): JSONContent | string {
  if (!raw) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  try {
    const j = JSON.parse(raw) as JSONContent;
    if (j && typeof j === "object" && j.type === "doc") return j;
  } catch {
    /* not JSON */
  }
  const t = raw.trimStart();
  if (t.startsWith("<")) return raw;
  const lines = raw.split(/\n/);
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: line.length ? [{ type: "text", text: line }] : [],
    })),
  };
}

export function DocumentEditor() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const [userId, setUserId] = useState<string | null>(null);
  const [document, setDocument] = useState<DocPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canAutosaveRef = useRef(false);
  const hydratedDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    hydratedDocIdRef.current = null;
  }, [documentId]);

  useEffect(() => {
    const id =
      typeof window !== "undefined" ? localStorage.getItem(USER_STORAGE_KEY) : null;
    if (!id) {
      router.replace("/");
      return;
    }
    setUserId(id);
  }, [router]);

  useEffect(() => {
    if (!userId || !documentId) return;
    let cancelled = false;
    setDocument(null);
    (async () => {
      setLoadError(null);
      canAutosaveRef.current = false;
      const res = await fetch(`/api/docs/${documentId}?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        if (!cancelled) setLoadError("Could not load this document.");
        return;
      }
      const data: DocPayload = await res.json();
      if (!cancelled) {
        setDocument(data);
        setTitle(data.title);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, documentId]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Underline,
    ],
    [],
  );

  const editor = useEditor(
    {
      extensions,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "tiptap min-h-[320px] px-3 py-2 text-sm text-zinc-900 outline-none focus:outline-none",
        },
      },
    },
    [documentId],
  );

  useEffect(() => {
    if (!editor || !document) return;
    if (hydratedDocIdRef.current === document.id) return;
    editor.commands.setContent(parseInitialContent(document.content), { emitUpdate: false });
    hydratedDocIdRef.current = document.id;
    canAutosaveRef.current = false;
    const t = requestAnimationFrame(() => {
      canAutosaveRef.current = true;
    });
    return () => cancelAnimationFrame(t);
  }, [editor, document]);

  useEffect(() => {
    if (!editor || !userId) return;
    const save = () => {
      if (!canAutosaveRef.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const content = JSON.stringify(editor.getJSON());
        try {
          const res = await fetch(`/api/docs/${documentId}?userId=${encodeURIComponent(userId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });
          if (res.ok) {
            const next: DocPayload = await res.json();
            setDocument((prev) => (prev ? { ...prev, ...next } : next));
          }
        } catch {
          /* ignore */
        }
      }, 1000);
    };
    editor.on("update", save);
    return () => {
      editor.off("update", save);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editor, userId, documentId]);

  const commitTitle = useCallback(async () => {
    if (!userId || !document) return;
    const next = title.trim() || "Untitled Document";
    setTitle(next);
    setEditingTitle(false);
    if (next === document.title) return;
    try {
      const res = await fetch(`/api/docs/${documentId}?userId=${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (res.ok) {
        const updated: DocPayload = await res.json();
        setDocument((prev) => (prev ? { ...prev, ...updated } : updated));
      }
    } catch {
      setTitle(document.title);
    }
  }, [userId, document, documentId, title]);

  const handleDelete = useCallback(async () => {
    if (!userId || !document?.isOwner) return;
    const confirmed = window.confirm("Are you sure you want to delete this document?");
    if (!confirmed) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/docs/${documentId}?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(typeof data.error === "string" ? data.error : "Delete failed");
        return;
      }
      router.push("/");
    } finally {
      setDeleteBusy(false);
    }
  }, [userId, document?.isOwner, documentId, router]);

  const share = async () => {
    if (!userId || !document?.isOwner) return;
    setShareError(null);
    setShareBusy(true);
    try {
      const res = await fetch(`/api/docs/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerUserId: userId, shareWithEmail: shareEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setShareError(typeof data.error === "string" ? data.error : "Share failed");
        return;
      }
      setShareOpen(false);
      setShareEmail("");
    } finally {
      setShareBusy(false);
    }
  };

  if (!userId) {
    return null;
  }

  if (loadError) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-zinc-50 p-8 text-zinc-700">
        <p>{loadError}</p>
        <Link href="/" className="text-sm font-medium text-zinc-900 underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (!document || !editor) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  const tb = "rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-40";

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <Link
          href="/"
          className="rounded px-2 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          ← Back
        </Link>
        <div className="mx-1 h-6 w-px bg-zinc-200" />
        {editingTitle ? (
          <input
            className="min-w-0 flex-1 rounded border border-zinc-200 px-2 py-1 text-base font-semibold outline-none ring-zinc-400 focus:ring-2"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-base font-semibold hover:text-zinc-600"
            onClick={() => setEditingTitle(true)}
          >
            {title}
          </button>
        )}
        {document.isOwner ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
              onClick={() => {
                setShareError(null);
                setShareOpen(true);
              }}
            >
              Share
            </button>
            <button
              type="button"
              className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              disabled={deleteBusy}
              onClick={handleDelete}
            >
              {deleteBusy ? "Deleting…" : "Delete"}
            </button>
          </div>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-100 px-2 py-1.5">
        <button type="button" className={tb} onClick={() => editor.chain().focus().toggleBold().run()}>
          Bold
        </button>
        <button type="button" className={tb} onClick={() => editor.chain().focus().toggleItalic().run()}>
          Italic
        </button>
        <button type="button" className={tb} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          Underline
        </button>
        <span className="mx-1 w-px self-stretch bg-zinc-300" />
        <button
          type="button"
          className={tb}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </button>
        <button
          type="button"
          className={tb}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <span className="mx-1 w-px self-stretch bg-zinc-300" />
        <button type="button" className={tb} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          Bullets
        </button>
        <button type="button" className={tb} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          Numbers
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white p-4">
        <EditorContent editor={editor} />
      </div>

      {shareOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">Share document</h2>
            <p className="mt-1 text-sm text-zinc-500">Enter the email of an existing user.</p>
            <input
              type="email"
              className="mt-3 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
              placeholder="colleague@test.com"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
            />
            {shareError ? <p className="mt-2 text-sm text-red-600">{shareError}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
                onClick={() => setShareOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                disabled={shareBusy || !shareEmail.trim()}
                onClick={share}
              >
                {shareBusy ? "Sharing…" : "Share"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
