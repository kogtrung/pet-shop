import apiClient from './apiClient';

/**
 * Request order cancellation (User only)
 * @param {Object} data - { orderId, reason }
 * @returns {Promise} API response
 */
export const requestOrderCancellation = (data) => 
    apiClient.post('/api/OrderCancellation', data);

/**
 * Get all cancellation requests (Admin/SaleStaff only)
 * @param {string} status - Optional status filter
 * @returns {Promise} API response with cancellation list
 */
export const getAllCancellationRequests = (status = null) => {
    const params = status ? { status } : {};
    return apiClient.get('/api/OrderCancellation', { params });
};

/**
 * Get user's own cancellation requests
 * @returns {Promise} API response with cancellation list
 */
export const getMyCancellationRequests = () => 
    apiClient.get('/api/OrderCancellation/my-requests');

/**
 * Get cancellation request by ID
 * @param {number} id - Cancellation request ID
 * @returns {Promise} API response
 */
export const getCancellationRequestById = (id) => 
    apiClient.get(`/api/OrderCancellation/${id}`);

/**
 * Process cancellation request (Admin/SaleStaff only)
 * @param {number} id - Cancellation request ID
 * @param {Object} data - { status: 'Approved' | 'Rejected', adminNote }
 * @returns {Promise} API response
 */
export const processCancellationRequest = (id, data) => 
    apiClient.put(`/api/OrderCancellation/${id}/process`, data);

/**
 * Delete cancellation request (Admin only)
 * @param {number} id - Cancellation request ID
 * @returns {Promise} API response
 */
export const deleteCancellationRequest = (id) => 
    apiClient.delete(`/api/OrderCancellation/${id}`);

