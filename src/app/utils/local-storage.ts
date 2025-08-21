// utils/local-storage.ts

export const setToLocalStorage = (key: string, value: string): void => {
  if (typeof window === "undefined" || !key) return;
  localStorage.setItem(key, value);
};

export const getFromLocalStorage = (key: string): string | null => {
  if (typeof window === "undefined" || !key) return null;
  return localStorage.getItem(key);
};

export const removeFromLocalStorage = (key: string): void => {
  if (typeof window === "undefined" || !key) return;
  localStorage.removeItem(key);
};
