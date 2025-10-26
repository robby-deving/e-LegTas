import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, logout, selectToken } from './authSlice';
import { getTokenExpiry } from './jwtUtils';
// No need for refreshTokenUtils, we use httpOnly cookie now

// Replace with your actual refresh endpoint
const REFRESH_ENDPOINT = '/api/v1/auth/refresh';

export function useAutoRefreshToken() {
  const dispatch = useDispatch();
  const token = useSelector(selectToken);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!token) return;
    const expiry = getTokenExpiry(token);
    if (!expiry) return;
    const now = Date.now();
    // Refresh 1 minute before expiry
    const msUntilRefresh = expiry - now - 60 * 1000;
    if (msUntilRefresh <= 0) {
      refreshToken();
      return;
    }
    timerRef.current = setTimeout(() => {
      refreshToken();
    }, msUntilRefresh);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line
  }, [token, dispatch]);

  async function refreshToken() {
    try {
      const response = await fetch(REFRESH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // send httpOnly cookie
      });

      // Check for 500 server error
      if (response.status === 500) {
        window.location.href = '/error/500';
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to refresh token');
      dispatch(setCredentials({ user: data.user, token: data.token }));
    } catch (err) {
      // Check if it's a network error (server down)
      if (err instanceof TypeError) {
        window.location.href = '/error/500';
      } else {
        dispatch(logout());
      }
    }
  }
}
