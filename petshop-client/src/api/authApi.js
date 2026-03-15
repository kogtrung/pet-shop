import apiClient from './apiClient';

/**
 * Authentication API client
 * Handles user registration, login, staff creation, and profile retrieval
 */

/**
 * Login user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise} API response with JWT token
 */
export const login = (username, password) => apiClient.post('/api/Auth/login', { username, password });

/**
 * Register a new user
 * @param {string} username - Username
 * @param {string} email - Email address
 * @param {string} password - Password
 * @param {string} [phone] - Phone number
 * @returns {Promise} API response
 */
export const register = (username, email, password, phone) => apiClient.post('/api/Auth/register', { username, email, password, phone });

/**
 * Create a staff account (Admin only)
 * @param {Object} data - Staff account data
 * @param {string} data.username - Username
 * @param {string} data.email - Email address
 * @param {string} data.password - Password
 * @returns {Promise} API response
 */
export const createStaff = (data) => apiClient.post('/api/Auth/create-staff', data);

/**
 * Get current user profile
 * @returns {Promise} API response with user data
 */
export const getMe = () => apiClient.get('/api/Auth/me');

/**
 * @deprecated Use getMe() instead
 */
export const me = getMe;


