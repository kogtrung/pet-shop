import apiClient from './apiClient';

/**
 * Newsletter API client
 * Handles newsletter subscriptions and subscriber management
 */

// ========== Public Newsletter APIs ==========

/**
 * Subscribe to newsletter
 * @param {Object} data - Subscription data
 * @param {string} data.email - Email address to subscribe
 * @returns {Promise} API response
 */
export const subscribe = (data) => apiClient.post('/api/Newsletter/subscribe', data);

/**
 * Confirm newsletter subscription
 * @param {number} id - Subscription ID
 * @param {string} token - Confirmation token
 * @returns {Promise} API response
 */
export const confirmSubscription = (id, token) => apiClient.put(`/api/Newsletter/confirm/${id}`, null, { params: { token } });

/**
 * Unsubscribe from newsletter
 * @param {string} email - Email address to unsubscribe
 * @returns {Promise} API response
 */
export const unsubscribe = (email) => apiClient.delete('/api/Newsletter/unsubscribe', { params: { email } });

// ========== Admin Newsletter APIs ==========

/**
 * Get all newsletter subscribers (Admin only)
 * @param {boolean} [isConfirmed] - Filter by confirmation status
 * @returns {Promise} API response with subscriber list
 * @returns {Array} response.data - Array of subscribers
 * @returns {number} response.data[].id
 * @returns {string} response.data[].email
 * @returns {boolean} response.data[].isConfirmed
 * @returns {string} response.data[].createdAt - ISO date string
 */
export const getSubscribers = (isConfirmed) => apiClient.get('/api/Newsletter/subscribers', { params: { isConfirmed } });
