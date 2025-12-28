// Backend API Configuration
// Ye file backend ke URLs aur endpoints define karti hai

// Auto-detect backend URL based on current host
const getBackendURL = () => {
  const protocol = window.location.protocol; // http: or https:
  const hostname = window.location.hostname;
  
  // If running on localhost, use localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//localhost:5000`;
  }
  // Otherwise use the same IP as frontend but port 5000
  return `${protocol}//${hostname}:5000`;
};

const API_BASE_URL = getBackendURL();
const SOCKET_URL = getBackendURL();

console.log('🔗 Backend URL:', API_BASE_URL);
console.log('🔒 Protocol:', window.location.protocol);

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

