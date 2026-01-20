// src/config.js
// Dynamic IP configuration - automatically detects the current host

// Function to get the current host IP dynamically
const getCurrentHost = () => {
  // Always use the current window location host (works for both localhost and IP)
  const protocol = 'https:'; // Backend always runs on HTTPS
  const host = window.location.hostname;

  // If accessing via localhost, connect to localhost backend
  // If accessing via IP, connect to IP backend
  return `${protocol}//${host}:5000`;
};

const BACKEND_URL = getCurrentHost();

export const API_BASE_URL = BACKEND_URL;
export const SOCKET_URL = BACKEND_URL;

// Enhanced debugging
console.log('🌐 Current window location:', window.location.href);
console.log('🏠 Window hostname:', window.location.hostname);
console.log('🔗 Backend URL set to:', API_BASE_URL);
console.log('📡 Socket URL set to:', SOCKET_URL);

// Alternative method: Use environment variable for backend URL
const BACKEND_URL_ENV = process.env.REACT_APP_BACKEND_URL || getCurrentHost();

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  SIGNUP: `${API_BASE_URL}/api/auth/signup`,
  VERIFY_TOKEN: `${API_BASE_URL}/api/auth/verify`,
  GENERATE_CODE: `${API_BASE_URL}/api/code/generate`,
  GET_CAMERAS: `${API_BASE_URL}/api/cameras`,
  SAVE_CAMERA: `${API_BASE_URL}/api/cameras`,
  DELETE_CAMERA: `${API_BASE_URL}/api/cameras`,
  GET_RECORDINGS: `${API_BASE_URL}/api/recordings`,
  DELETE_RECORDING: `${API_BASE_URL}/api/recordings`,
  UPLOAD_RECORDING: `${API_BASE_URL}/api/upload`,
  UPDATE_PROFILE: `${API_BASE_URL}/api/profile/update`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/profile/change-password`,
  DELETE_ACCOUNT: `${API_BASE_URL}/api/profile`,
  REGISTER_CAMERA: `${API_BASE_URL}/api/camera/register`,
  CAMERA_STATUS: `${API_BASE_URL}/api/camera/status`,
  HEALTH: `${API_BASE_URL}/`,
};