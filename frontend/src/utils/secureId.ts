// src/utils/secureId.ts
export const encodeId = (id: number): string => {
  return btoa(id.toString()); // Base64 encode
};

export const decodeId = (encoded: string): number => {
  try {
    return parseInt(atob(encoded));
  } catch {
    return NaN;
  }
};
