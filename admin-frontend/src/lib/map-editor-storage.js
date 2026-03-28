import { createStarterDocument } from './map-schema';

const STORAGE_KEY = 'gorpliaj_map_editor_document_v1';
const STORAGE_PUBLISHED_KEY = 'gorpliaj_map_editor_document_published_v1';

export function loadDraftDocument() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createStarterDocument();
    return JSON.parse(raw);
  } catch (error) {
    return createStarterDocument();
  }
}

export function saveDraftDocument(document) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...document, status: 'draft' }));
}

export function publishDocument(document) {
  localStorage.setItem(
    STORAGE_PUBLISHED_KEY,
    JSON.stringify({ ...document, status: 'published', version: Number(document.version || 1) + 1 })
  );
}

export function loadPublishedDocument() {
  try {
    const raw = localStorage.getItem(STORAGE_PUBLISHED_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}
