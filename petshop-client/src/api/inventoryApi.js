import apiClient from './apiClient';

/**
 * Inventory API client
 * Handles inventory management, stock adjustments, and low-stock alerts
 */

/**
 * Get inventory details for a specific product
 * @param {number} productId - Product ID
 * @returns {Promise} API response with inventory details
 * @returns {Object} response.data
 * @returns {number} response.data.productId
 * @returns {string} response.data.productName
 * @returns {string} response.data.productSku
 * @returns {number} response.data.quantity - Current stock quantity
 * @returns {number} response.data.reorderLevel - Minimum stock level before reorder
 * @returns {boolean} response.data.needsReorder - Whether stock is below reorder level
 */
export const getInventory = (productId) => apiClient.get(`/api/Inventory/${productId}`);

/**
 * Update inventory levels for a product
 * @param {number} productId - Product ID
 * @param {Object} data - Inventory update data
 * @param {number} data.quantity - New stock quantity
 * @param {number} data.reorderLevel - New reorder level threshold
 * @returns {Promise} API response
 */
export const updateInventory = (productId, data) => apiClient.put(`/api/Inventory/${productId}`, data);

/**
 * Adjust inventory quantity (add or subtract stock)
 * @param {number} productId - Product ID
 * @param {Object} data - Adjustment data
 * @param {number} data.adjustment - Quantity to adjust (positive to add, negative to subtract)
 * @param {string} data.reason - Reason for adjustment (e.g., 'Received shipment', 'Damaged goods', 'Inventory count')
 * @param {string} [data.note] - Additional notes
 * @returns {Promise} API response
 */
export const adjustInventory = (productId, data) => apiClient.post(`/api/Inventory/${productId}/adjust`, data);

/**
 * Get list of products with low stock
 * @returns {Promise} API response with low-stock products
 * @returns {Array} response.data - Array of low-stock products
 */
export const getLowStockProducts = () => apiClient.get('/api/Inventory/low-stock');
