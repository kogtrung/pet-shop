import apiClient from './apiClient';

/**
 * Page API client (Inferred structure based on common CMS patterns)
 * Handles static content pages (CMS)
 */

/**
 * Get all pages
 * @param {Object} [params] - Query parameters
 * @param {boolean} [params.isPublished] - Filter by published status
 * @returns {Promise} API response with page list
 */
export const getPages = (params) => apiClient.get('/api/Page', { params });

/**
 * Get page by ID
 * @param {number} id - Page ID
 * @returns {Promise} API response with page details
 */
export const getPageById = (id) => apiClient.get(`/api/Page/${id}`);

/**
 * Get page by slug
 * @param {string} slug - Page slug
 * @returns {Promise} API response with page details
 */
export const getPageBySlug = (slug) => apiClient.get(`/api/Page/slug/${slug}`);

/**
 * Create a new page (Admin only)
 * @param {Object} data - Page data
 * @param {string} data.title - Page title
 * @param {string} data.slug - URL-friendly slug
 * @param {string} data.content - Page content (HTML or markdown)
 * @param {string} [data.metaDescription] - SEO meta description
 * @param {string} [data.metaKeywords] - SEO meta keywords
 * @param {boolean} [data.isPublished=false] - Published status
 * @param {number} [data.sortOrder=0] - Display order
 * @returns {Promise} API response
 */
export const createPage = (data) => apiClient.post('/api/Page', data);

/**
 * Update an existing page (Admin only)
 * @param {number} id - Page ID
 * @param {Object} data - Updated page data
 * @returns {Promise} API response
 */
export const updatePage = (id, data) => apiClient.put(`/api/Page/${id}`, data);

/**
 * Delete a page (Admin only)
 * @param {number} id - Page ID
 * @returns {Promise} API response
 */
export const deletePage = (id) => apiClient.delete(`/api/Page/${id}`);

/**
 * Publish a page (Admin only)
 * @param {number} id - Page ID
 * @returns {Promise} API response
 */
export const publishPage = (id) => apiClient.put(`/api/Page/${id}/publish`);

/**
 * Unpublish a page (Admin only)
 * @param {number} id - Page ID
 * @returns {Promise} API response
 */
export const unpublishPage = (id) => apiClient.put(`/api/Page/${id}/unpublish`);
