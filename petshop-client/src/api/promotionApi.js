import apiClient from './apiClient';

/**
 * Promotion API client
 * Handles promotion/coupon code operations
 */

/**
 * Validate a promotion code
 * @param {string} code - Promotion code
 * @param {number} orderAmount - Order total amount
 * @param {string} [userId] - User ID (optional)
 * @param {number[]} [productIds] - Product IDs in order (optional)
 * @returns {Promise} API response with validation result
 */
export const validatePromotion = (code, orderAmount, userId = null, productIds = null) => {
    return apiClient.post('/api/Promotion/validate', {
        code,
        orderAmount,
        userId,
        productIds
    });
};

/**
 * Get all promotions (Admin only)
 * @returns {Promise} API response with promotion list
 */
export const getAllPromotions = () => {
    return apiClient.get('/api/Promotion');
};

/**
 * Get promotion by ID (Admin only)
 * @param {number} id - Promotion ID
 * @returns {Promise} API response with promotion details
 */
export const getPromotionById = (id) => {
    return apiClient.get(`/api/Promotion/${id}`);
};

/**
 * Create a new promotion (Admin only)
 * @param {Object} data - Promotion data
 * @returns {Promise} API response
 */
export const createPromotion = (data) => {
    return apiClient.post('/api/Promotion', data);
};

/**
 * Update a promotion (Admin only)
 * @param {number} id - Promotion ID
 * @param {Object} data - Updated promotion data
 * @returns {Promise} API response
 */
export const updatePromotion = (id, data) => {
    return apiClient.put(`/api/Promotion/${id}`, data);
};

/**
 * Delete a promotion (Admin only)
 * @param {number} id - Promotion ID
 * @returns {Promise} API response
 */
export const deletePromotion = (id) => {
    return apiClient.delete(`/api/Promotion/${id}`);
};

