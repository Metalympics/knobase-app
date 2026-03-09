"use client";

import { createContext, useContext } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface DocumentContextValue {
  documentId: string;
  schoolId: string;
  documentTitle: string;
  userId: string;
}

/* ------------------------------------------------------------------ */
/* Context                                                              */
/* ------------------------------------------------------------------ */

const DocumentContext = createContext<DocumentContextValue>({
  documentId: "",
  schoolId: "",
  documentTitle: "",
  userId: "",
});

/* ------------------------------------------------------------------ */
/* Provider                                                             */
/* ------------------------------------------------------------------ */

export function DocumentContextProvider({
  documentId,
  schoolId,
  documentTitle,
  userId,
  children,
}: DocumentContextValue & { children: React.ReactNode }) {
  return (
    <DocumentContext.Provider
      value={{ documentId, schoolId, documentTitle, userId }}
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
