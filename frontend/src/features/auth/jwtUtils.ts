// Utility to decode JWT and get expiry
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload && payload.exp) {
      // exp is in seconds since epoch
      return payload.exp * 1000;
    }
    return null;
  } catch (e) {
    return null;
  }
}
