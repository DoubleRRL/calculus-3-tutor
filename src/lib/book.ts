import { useEffect, useState } from "react";

export interface BookExercise {
  number: number;
  image: string;
  width: number;
  height: number;
  page: number;
  pageImage: string;
  answerImage: string | null;
}

export interface BookSection {
  bookStartPage: number;
  bookEndPage: number;
  exercisePages: number[];
  exercises: BookExercise[];
}

export interface BookIndex {
  source: string;
  generatedAt: string;
  sections: Record<string, BookSection>;
}

export function bookAsset(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.endsWith("/") ? base : `${base}/`}book/${path}`;
}

let cache: Promise<BookIndex | null> | null = null;

/** Loads the cropped exercise index. Missing file is a normal, empty state. */
export function loadBookIndex(): Promise<BookIndex | null> {
  if (!cache) {
    cache = fetch(bookAsset("index.json"))
      .then((res) => (res.ok ? (res.json() as Promise<BookIndex>) : null))
      .catch(() => null);
  }
  return cache;
}

export interface BookSectionState {
  index: BookIndex | null;
  section: BookSection | null;
  loading: boolean;
}

export function useBookSection(sectionId: string | undefined): BookSectionState {
  const [state, setState] = useState<BookSectionState>({
    index: null,
    section: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    loadBookIndex().then((index) => {
      if (!alive) return;
      setState({
        index,
        section: sectionId ? index?.sections[sectionId] ?? null : null,
        loading: false,
      });
    });
    return () => {
      alive = false;
    };
  }, [sectionId]);

  return state;
}
