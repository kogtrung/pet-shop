import apiClient from './apiClient';

/**
 * User Management API client
 * Handles user listing, role updates, and user deletion (Admin only)
 */

/**
 * Get all users (Admin only)
 * @returns {Promise} API response with list of users
 */
export const getAllUsers = () => apiClient.get('/api/User');

/**
 * Update user role (Admin only)
 * @param {string} userId - User ID
 * @param {string} role - New role (Admin, ServiceStaff, Staff, User)
 * @returns {Promise} API response
 */
export const updateUserRole = (userId, role) => 
    apiClient.put(`/api/User/${userId}/role`, { role });

/**
 * Delete user (Admin only)
 * @param {string} userId - User ID
 * @returns {Promise} API response
 */
export const deleteUser = (userId) => 
    apiClient.delete(`/api/User/${userId}`);

/**
 * Search customers (Admin, Staff only)
 * @param {string} query - Search query (email, phone, name)
 * @returns {Promise} API response with list of customers
 */
export const searchCustomers = (query) => 
    apiClient.get('/api/User/search', { params: { query } });

