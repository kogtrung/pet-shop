import apiClient from './apiClient';

/**
 * Order Return API client
 * Handles order return and exchange operations
 */

/**
 * Get all order returns
 * @param {string} [status] - Filter by status
 * @returns {Promise} API response with return list
 */
export const getAllOrderReturns = (status = null) => {
    const params = status ? { status } : {};
    return apiClient.get('/api/OrderReturn', { params });
};

/**
 * Get order return by ID
 * @param {number} id - Return ID
 * @returns {Promise} API response with return details
 */
export const getOrderReturnById = (id) => {
    return apiClient.get(`/api/OrderReturn/${id}`);
};

/**
 * Get returns for a specific order
 * @param {number} orderId - Order ID
 * @returns {Promise} API response with return list
 */
export const getOrderReturnsByOrderId = (orderId) => {
    return apiClient.get(`/api/OrderReturn/order/${orderId}`);
};

/**
 * Create a new order return
 * @param {Object} data - Return data
 * @returns {Promise} API response
 */
export const createOrderReturn = (data) => {
    return apiClient.post('/api/OrderReturn', data);
};

/**
 * Update order return status
 * @param {number} id - Return ID
 * @param {Object} data - Status update data
 * @returns {Promise} API response
 */
export const updateOrderReturnStatus = (id, data) => {
    return apiClient.put(`/api/OrderReturn/${id}/status`, data);
};

/**
 * Delete an order return (Admin only)
 * @param {number} id - Return ID
 * @returns {Promise} API response
 */
export const deleteOrderReturn = (id) => {
    return apiClient.delete(`/api/OrderReturn/${id}`);
};

