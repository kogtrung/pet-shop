import apiClient from './apiClient';

/**
 * Product Image API client
 * Handles product image CRUD operations
 */

/**
 * Add a new image to a product
 * @param {number} productId - Product ID
 * @param {Object} data - Image data
 * @param {string} data.url - Image URL
 * @param {string} [data.mediaType='image'] - Media type (image/video)
 * @param {number} [data.sortOrder=0] - Sort order
 * @param {boolean} [data.isPrimary=false] - Is primary image
 * @returns {Promise} API response
 */
export const addProductImage = (productId, data) => 
    apiClient.post(`/api/Product/${productId}/images`, data);

/**
 * Upload an image file to a product
 * @param {number} productId - Product ID
 * @param {File} file - Image file to upload
 * @param {boolean} [isPrimary=false] - Is primary image
 * @param {number} [sortOrder=0] - Sort order
 * @returns {Promise} API response
 */
export const uploadProductImage = (productId, file, isPrimary = false, sortOrder = 0) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isPrimary', isPrimary);
    formData.append('sortOrder', sortOrder);

    return apiClient.post(`/api/Product/${productId}/images/upload`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

/**
 * Update an existing product image
 * @param {number} productId - Product ID
 * @param {number} imageId - Image ID
 * @param {Object} data - Updated image data
 * @returns {Promise} API response
 */
export const updateProductImage = (productId, imageId, data) => 
    apiClient.put(`/api/Product/${productId}/images/${imageId}`, data);

/**
 * Delete a product image
 * @param {number} productId - Product ID
 * @param {number} imageId - Image ID
 * @returns {Promise} API response
 */
export const deleteProductImage = (productId, imageId) => 
    apiClient.delete(`/api/Product/${productId}/images/${imageId}`);

/**
 * Set an image as the primary image for a product
 * @param {number} productId - Product ID
 * @param {number} imageId - Image ID
 * @returns {Promise} API response
 */
export const setPrimaryImage = (productId, imageId) => 
    apiClient.put(`/api/Product/${productId}/images/${imageId}/set-primary`);
