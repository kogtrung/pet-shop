import apiClient from './apiClient';

/**
 * Cart API client
 * Handles user cart operations
 */

/**
 * Fetch user's cart items
 * @returns {Promise} API response with cart items
 */
export const fetchCartItems = () => apiClient.get('/api/Cart');

/**
 * Add item to cart
 * @param {Object} data - Cart item data
 * @param {number} data.productId - Product ID
 * @param {number} data.quantity - Quantity to add
 * @returns {Promise} API response
 */
export const addToCart = (data) => apiClient.post('/api/Cart', data);

/**
 * Update cart item quantity
 * @param {number} id - Cart item ID
 * @param {Object} data - Update data
 * @param {number} data.quantity - New quantity
 * @returns {Promise} API response
 */
export const updateCartItem = (id, data) => apiClient.put(`/api/Cart/${id}`, data);

/**
 * Remove item from cart
 * @param {number} id - Cart item ID
 * @returns {Promise} API response
 */
export const removeFromCart = (id) => apiClient.delete(`/api/Cart/${id}`);

/**
 * Clear entire cart
 * @returns {Promise} API response
 */
export const clearCart = () => apiClient.delete('/api/Cart');

export default {
    fetchCartItems,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
};