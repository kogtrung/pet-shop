import apiClient from './apiClient';

/**
 * Profile API client (Inferred structure based on common REST patterns)
 * Handles user profile management
 */

/**
 * Get current user's profile
 * @returns {Promise} API response with user profile data
 * @returns {Object} response.data
 * @returns {string} response.data.id
 * @returns {string} response.data.username
 * @returns {string} response.data.email
 * @returns {string} [response.data.firstName]
 * @returns {string} [response.data.lastName]
 * @returns {string} [response.data.phoneNumber]
 * @returns {string} [response.data.address]
 * @returns {string} [response.data.avatarUrl]
 */
export const getProfile = () => apiClient.get('/api/Profile');

/**
 * Get profile by user ID (Admin, SaleStaff only)
 * @param {string} userId - User ID
 * @returns {Promise} API response with user profile data
 */
export const getProfileByUserId = (userId) => apiClient.get(`/api/Profile/${userId}`);

/**
 * Create user profile (for users who don't have one yet)
 * @param {Object} data - Profile creation data
 * @param {string} [data.fullName] - Full name
 * @param {string} [data.phone] - Phone number
 * @param {string} [data.address] - Address
 * @returns {Promise} API response
 */
export const createProfile = (data) => apiClient.post('/api/Profile', data);

/**
 * Update user profile
 * @param {Object} data - Profile update data
 * @param {string} [data.firstName] - First name
 * @param {string} [data.lastName] - Last name
 * @param {string} [data.phoneNumber] - Phone number
 * @param {string} [data.address] - Address
 * @param {string} [data.avatarUrl] - Avatar image URL
 * @returns {Promise} API response
 */
export const updateProfile = (data) => apiClient.put('/api/Profile', data);

/**
 * Change password
 * @param {Object} data - Password change data
 * @param {string} data.currentPassword - Current password
 * @param {string} data.newPassword - New password
 * @param {string} data.confirmPassword - Confirm new password
 * @returns {Promise} API response
 */
export const changePassword = (data) => apiClient.put('/api/Profile/change-password', data);

/**
 * Update email address
 * @param {Object} data - Email update data
 * @param {string} data.newEmail - New email address
 * @param {string} data.password - Current password for verification
 * @returns {Promise} API response
 */
export const updateEmail = (data) => apiClient.put('/api/Profile/email', data);

/**
 * Upload avatar image
 * @param {FormData} formData - Form data containing image file
 * @returns {Promise} API response with avatar URL
 */
export const uploadAvatar = (formData) => apiClient.post('/api/Profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

/**
 * Delete account
 * @param {Object} data - Account deletion data
 * @param {string} data.password - Current password for verification
 * @returns {Promise} API response
 */
export const deleteAccount = (data) => apiClient.delete('/api/Profile', { data });
