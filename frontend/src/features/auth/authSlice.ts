import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface UserData {
  user_id?: number; // Numeric users table id
  auth_id?: string; // Supabase Auth UUID
  email?: string;
  employee_number?: string;
  name?: string;
  role?: string;
  role_id?: number;
  resident_id?: number;
  first_name?: string;
  last_name?: string;
  assigned_barangay?: string; // Store assigned barangay name
  assigned_barangay_id?: number; // Store assigned barangay ID
  // Add other user properties you want to store
}

interface AuthState {
  user: UserData | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserData; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      // Clear all local storage
      localStorage.clear();
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectUserId = (state: { auth: AuthState }) => state.auth.user?.user_id;
export const selectAuthId = (state: { auth: AuthState }) => state.auth.user?.auth_id; // UUID selector
export const selectAssignedBarangay = (state: { auth: AuthState }) => state.auth.user?.assigned_barangay;
export const selectAssignedBarangayId = (state: { auth: AuthState }) => state.auth.user?.assigned_barangay_id;