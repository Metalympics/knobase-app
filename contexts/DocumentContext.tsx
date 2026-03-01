"use client";

import { createContext, useContext } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface DocumentContextValue {
  documentId: string;
  workspaceId: string;
  documentTitle: string;
  userId: string;
}

/* ------------------------------------------------------------------ */
/* Context                                                              */
/* ------------------------------------------------------------------ */

const DocumentContext = createContext<DocumentContextValue>({
  documentId: "",
  workspaceId: "",
  documentTitle: "",
  userId: "",
});

/* ------------------------------------------------------------------ */
/* Provider                                                             */
/* ------------------------------------------------------------------ */

export function DocumentContextProvider({
  documentId,
  workspaceId,
  documentTitle,
  userId,
  children,
}: DocumentContextValue & { children: React.ReactNode }) {
  return (
    <DocumentContext.Provider
      value={{ documentId, workspaceId, documentTitle, userId }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Hook                                                                 */
/* ------------------------------------------------------------------ */

export function useDocumentContext(): DocumentContextValue {
  return useContext(DocumentContext);
}
