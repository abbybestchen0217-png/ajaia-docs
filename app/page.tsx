"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const USER_STORAGE_KEY = "ajaia-docs-user-id";

type User = { id: string; email: string; name: string };

type DocListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  isOwner: boolean;
};

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [documents, setDocuments] = useState<DocListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error("Failed to load users");
        const data: User[] = await res.json();
        if (cancelled) return;
        setUsers(data);
        const stored = typeof window !== "undefined" ? localStorage.getItem(USER_STORAGE_KEY) : null;
        const initial =
          stored && data.some((u) => u.id === stored) ? stored : data[0]?.id ?? "";
        setUserId(initial);
        if (initial) localStorage.setItem(USER_STORAGE_KEY, initial);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setDocuments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingDocs(true);
      try {
        const res = await fetch(`/api/docs?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("Failed to load documents");
        const data: DocListItem[] = await res.json();
        if (!cancelled) setDocuments(data);
      } catch {
        if (!cancelled) setDocuments([]);
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const onUserChange = useCallback((id: string) => {
    setUserId(id);
    localStorage.setItem(USER_STORAGE_KEY, id);
  }, []);

  const myDocs = documents.filter((d) => d.isOwner);
  const sharedDocs = documents.filter((d) => !d.isOwner);

  const newDocument = async () => {
    if (!userId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document", ownerId: userId }),
      });
      if (!res.ok) throw new Error("Create failed");
      const doc = await res.json();
      router.push(`/doc/${doc.id}`);
    } finally {
      setCreating(false);
    }
  };

  const onImportPick = () => fileInputRef.current?.click();

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("file", file);
      const res = await fetch("/api/docs/import", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(typeof err.error === "string" ? err.error : "Import failed");
        return;
      }
      const doc = await res.json();
      router.push(`/doc/${doc.id}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight">Ajaia Docs</h1>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <span className="hidden sm:inline">User</span>
          <select
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
            value={userId}
            disabled={loadingUsers || users.length === 0}
            onChange={(e) => onUserChange(e.target.value)}
          >
            {users.map((u: User) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="flex flex-1 gap-0">
        <aside className="w-72 shrink-0 border-r border-zinc-200 bg-white p-4">
          <div className="mb-4 flex flex-col gap-2">
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              disabled={!userId || creating}
              onClick={newDocument}
            >
              {creating ? "Creating…" : "New Document"}
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              disabled={!userId || importing}
              onClick={onImportPick}
            >
              {importing ? "Importing…" : "Import File"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="hidden"
              onChange={onFileSelected}
            />
          </div>

          {loadingDocs ? (
            <p className="text-sm text-zinc-500">Loading documents…</p>
          ) : (
            <div className="space-y-6">
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  My Documents
                </h2>
                <ul className="space-y-1">
                  {myDocs.length === 0 ? (
                    <li className="text-sm text-zinc-400">None yet</li>
                  ) : (
                    myDocs.map((d: DocListItem) => (
                      <li key={d.id}>
                        <Link
                          href={`/doc/${d.id}`}
                          className="block truncate rounded px-2 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100"
                        >
                          {d.title}
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </section>
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Shared with me
                </h2>
                <ul className="space-y-1">
                  {sharedDocs.length === 0 ? (
                    <li className="text-sm text-zinc-400">None</li>
                  ) : (
                    sharedDocs.map((d: DocListItem) => (
                      <li key={d.id}>
                        <Link
                          href={`/doc/${d.id}`}
                          className="block truncate rounded px-2 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100"
                        >
                          {d.title}
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </div>
          )}
        </aside>

        <main className="flex flex-1 items-center justify-center p-8 text-center text-zinc-500">
          <p className="max-w-sm text-sm">
            Select a document from the sidebar or create a new one to start editing.
          </p>
        </main>
      </div>
    </div>
  );
}
