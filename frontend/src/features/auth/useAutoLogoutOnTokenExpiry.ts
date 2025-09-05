import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectToken } from './authSlice';
import { getTokenExpiry } from './jwtUtils';

// This hook will auto-logout the user when the JWT expires
export function useAutoLogoutOnTokenExpiry() {
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
    const msUntilExpiry = expiry - now;
    if (msUntilExpiry <= 0) {
      dispatch(logout());
      return;
    }
    timerRef.current = setTimeout(() => {
      dispatch(logout());
    }, msUntilExpiry);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [token, dispatch]);
}
