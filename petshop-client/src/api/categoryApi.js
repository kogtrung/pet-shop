import apiClient from './apiClient';

/**
 * Category API client
 * Handles category CRUD operations and tree structure retrieval
 */

/**
 * Fetch all categories
 * @param {boolean} [includeInactive=false] - Include inactive categories
 * @returns {Promise} API response with category list
 */
export const fetchCategories = (includeInactive = false) => 
    apiClient.get('/api/Category', { params: { includeInactive } });

// Alias for consistency
export const getCategories = fetchCategories;

/**
 * Fetch category tree structure
 * @param {boolean} [includeInactive=false] - Include inactive categories
 * @returns {Promise} API response with hierarchical category tree
 */
export const fetchCategoryTree = (includeInactive = false) => 
    apiClient.get('/api/Category/tree', { params: { includeInactive } });

/**
 * Fetch single category by ID
 * @param {number} id - Category ID
 * @returns {Promise} API response with category details
 */
export const fetchCategoryById = (id) => apiClient.get(`/api/Category/${id}`);

/**
 * Create a new category
 * @param {Object} data - Category data
 * @param {string} data.name - Category name
 * @param {string} data.slug - URL-friendly slug
 * @param {boolean} [data.isActive=true] - Active status
 * @param {number|null} [data.parentId] - Parent category ID
 * @param {number} [data.menuOrder=0] - Menu display order
 * @param {boolean} [data.showInMenu=true] - Show in navigation menu
 * @param {string} [data.icon] - Icon identifier
 * @returns {Promise} API response
 */
export const createCategory = (data) => apiClient.post('/api/Category', data);

/**
 * Update an existing category
 * @param {number} id - Category ID
 * @param {Object} data - Updated category data
 * @returns {Promise} API response
 */
export const updateCategory = (id, data) => apiClient.put(`/api/Category/${id}`, data);

/**
 * Delete a category
 * @param {number} id - Category ID
 * @returns {Promise} API response
 */
export const deleteCategory = (id) => apiClient.delete(`/api/Category/${id}`);

