import { Doc } from "@/lib/doc/doc";

const STORAGE_KEY = "loft-visualizer-docs";
const CURRENT_DOC_KEY = "loft-visualizer-current-doc";

export interface SavedDoc {
  id: string;
  name: string;
  data: Doc;
  savedAt: number;
}

export function saveDocToStorage(doc: Doc): void {
  if (typeof window === "undefined") return;

  const savedDoc: SavedDoc = {
    id: doc.id,
    name: doc.name,
    data: doc,
    savedAt: Date.now(),
  };

  const allDocs = getAllDocsFromStorage();
  const existingIndex = allDocs.findIndex((d) => d.id === doc.id);

  if (existingIndex >= 0) {
    allDocs[existingIndex] = savedDoc;
  } else {
    allDocs.push(savedDoc);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(allDocs));
  localStorage.setItem(CURRENT_DOC_KEY, doc.id);
}

export function loadDocFromStorage(docId: string): Doc | null {
  if (typeof window === "undefined") return null;

  const allDocs = getAllDocsFromStorage();
  const savedDoc = allDocs.find((d) => d.id === docId);

  if (savedDoc) {
    localStorage.setItem(CURRENT_DOC_KEY, docId);
    return savedDoc.data;
  }

  return null;
}

export function getAllDocsFromStorage(): SavedDoc[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function getCurrentDocId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CURRENT_DOC_KEY);
}

export function deleteDocFromStorage(docId: string): void {
  if (typeof window === "undefined") return;

  const allDocs = getAllDocsFromStorage();
  const filtered = allDocs.filter((d) => d.id !== docId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  if (getCurrentDocId() === docId) {
    localStorage.removeItem(CURRENT_DOC_KEY);
  }
}
