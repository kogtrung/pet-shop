import apiClient from './apiClient';

/**
 * Review Media API client
 * Handles media uploads for product reviews
 */

/**
 * Upload media for a review
 * @param {Object} data - Upload data
 * @param {number} data.reviewId - Review ID
 * @param {File} data.file - File to upload
 * @returns {Promise} API response with media details
 */
export const uploadReviewMedia = async (data) => {
    const formData = new FormData();
    formData.append('ReviewId', data.reviewId);
    formData.append('FileName', data.file.name);
    formData.append('ContentType', data.file.type);
    formData.append('FileSize', data.file.size);
    formData.append('file', data.file);

    return apiClient.post('/api/ReviewMedia/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

/**
 * Get media for a review
 * @param {number} reviewId - Review ID
 * @returns {Promise} API response with media list
 */
export const getReviewMedia = (reviewId) => apiClient.get(`/api/ReviewMedia/review/${reviewId}`);