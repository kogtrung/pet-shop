import apiClient from './apiClient';

/**
 * Order API client
 * Handles order creation, retrieval, and management
 */

// ========== Customer-facing Order APIs ==========

/**
 * Fetch current user's order history
 * @param {Object} [params] - Query parameters for filtering and pagination
 * @param {number} [params.page] - Page number
 * @param {number} [params.pageSize] - Items per page
 * @param {string} [params.status] - Filter by order status
 * @returns {Promise} API response with user's orders
 */
export const fetchMyOrderHistory = (params) => apiClient.get('/api/Order/my-history', { params });

/**
 * Fetch current user's order history (alias for compatibility)
 * @returns {Promise} API response with user's orders
 */
export const fetchMyOrders = () => apiClient.get('/api/Order/my-history');

/**
 * Fetch order by ID (for admin/staff)
 * @param {number} id - Order ID
 * @returns {Promise} API response with order details
 */
export const fetchOrderById = (id) => apiClient.get(`/api/Order/${id}`);

/**
 * Fetch current user's order by ID
 * @param {number} id - Order ID
 * @returns {Promise} API response with order details
 */
export const fetchMyOrderById = (id) => apiClient.get(`/api/Order/my/${id}`);

/**
 * Create a new order
 * @param {Object} data - Order data
 * @param {string} data.paymentMethod - Payment method (COD, BANK_TRANSFER, CREDIT_CARD, MOMO, VNPAY)
 * @param {string} [data.shippingAddress] - Shipping address
 * @param {Array} data.items - Order items (required, at least 1 item)
 * @param {number} data.items[].productId - Product ID (required)
 * @param {number} data.items[].quantity - Item quantity (required, min: 1)
 * @param {number} data.items[].unitPrice - Unit price (required)
 * @returns {Promise} API response
 */
export const createOrder = (data) => apiClient.post('/api/Order', data);

/**
 * Create a POS order (at store)
 * @param {Object} data - POS order data
 * @param {string} [data.customerId] - Customer ID (optional, null for walk-in customers)
 * @param {string} data.customerName - Customer name (required)
 * @param {string} [data.customerPhone] - Customer phone
 * @param {string} data.paymentMethod - Payment method (COD, BANK_TRANSFER, CREDIT_CARD)
 * @param {Array} data.items - Order items (required, at least 1 item)
 * @param {number} data.items[].productId - Product ID (required)
 * @param {number} data.items[].quantity - Item quantity (required, min: 1)
 * @param {number} data.items[].unitPrice - Unit price (required)
 * @returns {Promise} API response
 */
export const createPOSOrder = (data) => apiClient.post('/api/Order/pos', data);

// ========== Admin Order APIs ==========

/**
 * Fetch all orders (Admin only)
 * @param {Object} [params] - Query parameters
 * @param {string} [params.status] - Filter by status
 * @param {string} [params.paymentStatus] - Filter by payment status
 * @returns {Promise} API response with order list
 */
export const fetchAllOrders = (params) => apiClient.get('/api/Order', { params });

/**
 * Update order status (Admin only)
 * @param {number} id - Order ID
 * @param {Object} data - Update data
 * @param {string} [data.status] - New order status
 * @param {string} [data.paymentStatus] - New payment status
 * @param {string} [data.deliveryDate] - Updated delivery date
 * @returns {Promise} API response
 */
export const updateOrderStatus = (id, data) => {
    // If data is a string, assume it's the status and convert to object
    const updateData = typeof data === 'string' ? { status: data } : data;
    return apiClient.put(`/api/Order/${id}/status`, updateData);
};

/**
 * Delete/cancel an order (Admin only)
 * @param {number} id - Order ID
 * @returns {Promise} API response
 */
export const deleteOrder = (id) => apiClient.delete(`/api/Order/${id}`);

/**
 * Cancel an order (User or Admin)
 * @param {number} id - Order ID
 * @returns {Promise} API response
 */
export const cancelOrder = (id) => apiClient.put(`/api/Order/${id}/cancel`);

/**
 * Update order payment status (for payment gateway callbacks)
 * @param {number} id - Order ID
 * @param {Object} data - Payment status data
 * @param {string} data.paymentStatus - New payment status (Paid, Unpaid, etc.)
 * @param {string} [data.transactionId] - Transaction ID from payment gateway
 * @returns {Promise} API response
 */
export const updateOrderPaymentStatus = (id, data) => apiClient.put(`/api/Order/${id}/payment-status`, data);