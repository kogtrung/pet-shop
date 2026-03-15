/**
 * Utility functions for handling product images
 */

/**
 * Get full image URL from relative path or absolute URL
 * @param {string} url - Image URL (can be relative or absolute)
 * @returns {string|null} Full image URL or null if url is empty
 */
export const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // If relative path, prepend API base URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5200';
    return `${apiBaseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

/**
 * Get primary image or first image from product images array
 * @param {Object} product - Product object
 * @returns {string} Image URL or placeholder
 */
export const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
        const primaryImage = product.images.find(img => img.isPrimary);
        const imageUrl = primaryImage ? primaryImage.url : product.images[0].url;
        return getImageUrl(imageUrl);
    }
    return getImageUrl(product.imageUrl) || `https://placehold.co/600x400/14b8a6/ffffff?text=${encodeURIComponent(product.name || 'Product')}`;
};

/**
 * Get all product images as full URLs
 * @param {Object} product - Product object
 * @returns {string[]} Array of image URLs
 */
export const getProductImages = (product) => {
    if (product.images && product.images.length > 0) {
        return product.images.map(img => getImageUrl(img.url)).filter(Boolean);
    }
    const fallback = getImageUrl(product.imageUrl);
    return fallback ? [fallback] : [`https://placehold.co/800x800/14b8a6/ffffff?text=${encodeURIComponent(product.name || 'Product')}`];
};

