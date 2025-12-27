// API Utility Functions
// Ye file backend APIs ko call karne ke helper functions provide karti hai

import { API_ENDPOINTS } from './config';

/**
 * Login API call
 * @param {string} username - User ka username
 * @param {string} password - User ka password
 * @returns {Promise} Response data
 */
export const login = async (username, password) => {
  try {
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });

    const data = await response.json();
    
    if (response.status === 200) {
      return { success: true, data: data };
    } else {
      return { success: false, error: data.message || 'Login failed' };
    }
  } catch (error) {
    return { success: false, error: 'Connection failed. Please check if backend is running.' };
  }
};

/**
 * Generate 6-digit code for camera pairing
 * @returns {Promise} Response with code
 */
export const generateCode = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.GENERATE_CODE, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, code: data.code };
  } catch (error) {
    console.error('Generate code error:', error);
    return { success: false, error: 'Failed to generate code: ' + error.message };
  }
};

/**
 * Register a new camera
 * @param {string} name - Camera ka naam
 * @returns {Promise} Response data
 */
export const registerCamera = async (name) => {
  try {
    const response = await fetch(API_ENDPOINTS.REGISTER_CAMERA, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name }),
    });

    const data = await response.json();
    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: 'Failed to register camera' };
  }
};

/**
 * Get camera status
 * @returns {Promise} Response data
 */
export const getCameraStatus = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.CAMERA_STATUS, {
      method: 'GET',
    });

    const data = await response.json();
    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: 'Failed to get camera status' };
  }
};

/**
 * Health check - Check if backend is running
 * @returns {Promise} Response data
 */
export const healthCheck = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.HEALTH, {
      method: 'GET',
    });

    const text = await response.text();
    return { success: true, message: text };
  } catch (error) {
    return { success: false, error: 'Backend is not running' };
  }
};

