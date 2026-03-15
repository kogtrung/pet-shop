import apiClient from './apiClient';

/**
 * Wishlist API client (Inferred structure based on common REST patterns)
 * Handles user wishlist operations
 */

/**
 * Get current user's wishlist
 * @returns {Promise} API response with wishlist items
 * @returns {Array} response.data - Array of wishlist items
 */
export const getWishlist = () => apiClient.get('/api/Wishlist');

// Alias for backward compatibility
export const fetchWishlist = getWishlist;

/**
 * Add product to wishlist
 * @param {Object} data - Wishlist item data
 * @param {number} data.productId - Product ID to add
 * @returns {Promise} API response
 */
export const addToWishlist = (data) => apiClient.post('/api/Wishlist', data);

/**
 * Remove product from wishlist
 * @param {number} productId - Product ID to remove
 * @returns {Promise} API response
 */
export const removeFromWishlist = (productId) => apiClient.delete(`/api/Wishlist/${productId}`);

/**
 * Check if product is in wishlist
 * @param {number} productId - Product ID
 * @returns {Promise} API response
 * @returns {boolean} response.data.isInWishlist
 */
export const isInWishlist = (productId) => apiClient.get(`/api/Wishlist/check/${productId}`);

/**
 * Clear entire wishlist
 * @returns {Promise} API response
 */
export const clearWishlist = () => apiClient.delete('/api/Wishlist/clear');

/**
 * Move wishlist item to cart
 * @param {number} productId - Product ID
 * @returns {Promise} API response
 */
export const moveToCart = (productId) => apiClient.post(`/api/Wishlist/${productId}/move-to-cart`);