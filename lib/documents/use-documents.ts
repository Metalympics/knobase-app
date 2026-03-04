"use client";

import { useState, useCallback, useEffect } from "react";
import type { DocumentMeta, Document } from "./types";
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} from "./store";
import { canCreateDocument } from "@/lib/subscription/store";
import { getActiveWorkspaceId } from "@/lib/workspaces/store";

function initDocuments(): {
  docs: DocumentMeta[];
  activeId: string;
  activeDoc: Document;
} {
  let all = listDocuments();
  if (all.length === 0) {
    const doc = createDocument("Untitled");
    all = [
      {
        id: doc.id,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    ];
    return { docs: all, activeId: doc.id, activeDoc: doc };
  }
  const doc = getDocument(all[0].id)!;
  return { docs: all, activeId: all[0].id, activeDoc: doc };
}

export function useDocuments() {
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);

  useEffect(() => {
    const initial = initDocuments();
    setDocs(initial.docs);
    setActiveId(initial.activeId);
    setActiveDoc(initial.activeDoc);
  }, []);

  const refresh = useCallback(() => {
    const all = listDocuments();
    setDocs(all);
    return all;
  }, []);

  const selectDocument = useCallback((id: string) => {
    setActiveId(id);
    const doc = getDocument(id);
    if (doc) setActiveDoc(doc);
  }, []);

  const addDocument = useCallback(
    (title = "Untitled", skipLimitCheck = false, parentId?: string) => {
      if (!skipLimitCheck) {
        const wsId = getActiveWorkspaceId();
        if (wsId && !canCreateDocument(wsId)) {
          return null;
        }
      }
      const doc = createDocument(title, parentId);
      refresh();
      setActiveId(doc.id);
      setActiveDoc(doc);
      return doc;
    },
    [refresh],
  );

  const saveContent = useCallback((id: string, content: string) => {
    updateDocument(id, { content });
  }, []);

  const renameDocument = useCallback(
    (id: string, title: string) => {
      updateDocument(id, { title });
      refresh();
    },
    [refresh],
  );

  const removeDocument = useCallback(
    (id: string) => {
      deleteDocument(id);
      const all = refresh();
      if (activeId === id) {
        if (all.length > 0) {
          setActiveId(all[0].id);
          const doc = getDocument(all[0].id);
          if (doc) setActiveDoc(doc);
        } else {
          const doc = createDocument("Untitled");
          refresh();
          setActiveId(doc.id);
          setActiveDoc(doc);
        }
      }
    },
    [activeId, refresh],
  );

  return {
    documents: docs,
    activeId,
    activeDoc,
    selectDocument,
    addDocument,
    saveContent,
    renameDocument,
    removeDocument,
  };
}
