import axios from "axios";

// Use the live backend for authentication; allow an explicit hosting override.
const API = (process.env.REACT_APP_AUTH_API_URL || "").trim().replace(/\/+$/, "")
  || "https://bharatspecialsteels.bharatspecialsteels.com/api/auth";

export const loginUser = async (data) => {
  return await axios.post(`${API}/login`, data);
};

// Google's callback returns an ID token; the backend verifies it and returns
// the same RMS session shape as password login. No signup endpoint is called.
export const loginWithGoogle = credential => axios.post(`${API}/google`, { credential });

export const linkGoogleAccount = (credential, token) => axios.post(`${API}/google/link`, { credential }, {
  headers: { Authorization: `Bearer ${token}` },
});
