// src/config.js
// Your Python backend is running on HTTPS, so we must match it here.

const BACKEND_URL = 'http://127.0.0.1:5001'; 

export const API_BASE_URL = BACKEND_URL;
export const SOCKET_URL = BACKEND_URL;

console.log('🔗 Backend URL set to:', API_BASE_URL);

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  SIGNUP: `${API_BASE_URL}/api/auth/signup`,
  GENERATE_CODE: `${API_BASE_URL}/api/code/generate`,
  REGISTER_CAMERA: `${API_BASE_URL}/api/camera/register`,
  CAMERA_STATUS: `${API_BASE_URL}/api/camera/status`,
  HEALTH: `${API_BASE_URL}/`,
};