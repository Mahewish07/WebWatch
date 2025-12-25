// Backend API Configuration
// Ye file backend ke URLs aur endpoints define karti hai

const API_BASE_URL = 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  SIGNUP: `${API_BASE_URL}/api/auth/signup`, // Future use ke liye
  
  // Code generation
  GENERATE_CODE: `${API_BASE_URL}/api/code/generate`,
  
  // Camera endpoints
  REGISTER_CAMERA: `${API_BASE_URL}/api/camera/register`,
  CAMERA_STATUS: `${API_BASE_URL}/api/camera/status`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/`,
};

export { API_BASE_URL, SOCKET_URL };

