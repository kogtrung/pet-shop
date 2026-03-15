import apiClient from './apiClient';

/**
 * Review API client (Inferred structure based on common REST patterns)
 * Handles product reviews and ratings
 */

/**
 * Get reviews for a specific product
 * @param {number} productId - Product ID
 * @param {Object} [params] - Query parameters
 * @param {number} [params.page] - Page number
 * @param {number} [params.pageSize] - Items per page
 * @param {string} [params.sortBy] - Sort by ('rating', 'date')
 * @returns {Promise} API response with review list
 */
export const getProductReviews = (productId, params) => apiClient.get(`/api/Review/product/${productId}`, { params });

/**
 * Get review by ID
 * @param {number} id - Review ID
 * @returns {Promise} API response with review details
 */
export const getReviewById = (id) => apiClient.get(`/api/Review/${id}`);

/**
 * Create a new review
 * @param {Object} data - Review data
 * @param {number} data.productId - Product ID
 * @param {number} data.rating - Rating (1-5)
 * @param {string} [data.title] - Review title
 * @param {string} [data.comment] - Review comment
 * @param {string} [data.customerName] - Customer name
 * @returns {Promise} API response
 */
export const createReview = (data) => apiClient.post('/api/Review', data);

/**
 * Update an existing review
 * @param {number} id - Review ID
 * @param {Object} data - Updated review data
 * @returns {Promise} API response
 */
export const updateReview = (id, data) => apiClient.put(`/api/Review/${id}`, data);

/**
 * Delete a review
 * @param {number} id - Review ID
 * @returns {Promise} API response
 */
export const deleteReview = (id) => apiClient.delete(`/api/Review/${id}`);

/**
 * Get current user's reviews
 * @returns {Promise} API response with review list
 */
export const getMyReviews = () => apiClient.get('/api/Review/my-reviews');

// ========== Admin Review APIs ==========

/**
 * Get all reviews (Admin only)
 * @param {Object} [params] - Query parameters
 * @param {string} [params.status] - Filter by status ('pending', 'approved', 'rejected')
 * @param {number} [params.productId] - Filter by product
 * @returns {Promise} API response with review list
 */
export const getAllReviews = (params) => apiClient.get('/api/Review', { params });

/**
 * Approve a review (Admin only)
 * @param {number} id - Review ID
 * @returns {Promise} API response
 */
export const approveReview = (id) => apiClient.put(`/api/Review/${id}/approve`);

/**
 * Reject a review (Admin only)
 * @param {number} id - Review ID
 * @returns {Promise} API response
 */
export const rejectReview = (id) => apiClient.put(`/api/Review/${id}/reject`);
