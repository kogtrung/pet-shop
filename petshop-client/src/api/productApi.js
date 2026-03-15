import apiClient from './apiClient';

/**
 * Product API client
 * Handles product CRUD operations, search, filtering, and pagination
 */

/**
 * Fetch products with optional filtering, search, and pagination
 * @param {Object} [params] - Query parameters
 * @param {string} [params.search] - Search term
 * @param {number} [params.categoryId] - Filter by category
 * @param {number} [params.brandId] - Filter by brand
 * @param {number} [params.minPrice] - Minimum price filter
 * @param {number} [params.maxPrice] - Maximum price filter
 * @param {boolean} [params.isFeatured] - Filter featured products
 * @param {boolean} [params.isService] - Filter service products
 * @param {boolean} [params.isActive] - Filter by active status (true = active only, false = inactive only, null/undefined = all)
 * @param {string} [params.sortBy] - Sort field (e.g., 'price', 'name', 'createdAt')
 * @param {string} [params.sortOrder] - Sort order ('asc' or 'desc')
 * @param {number} [params.page] - Page number
 * @param {number} [params.pageSize] - Items per page
 * @returns {Promise} API response with product list
 */
export const fetchProducts = (params) => apiClient.get('/api/Product', { params });

/**
 * Fetch all products for admin (including inactive products)
 * @param {Object} [params] - Query parameters (same as fetchProducts)
 * @returns {Promise} API response with product list
 */
export const fetchAllProductsForAdmin = (params) => apiClient.get('/api/Product/admin/all', { params });

// Alias for consistency
export const getProducts = fetchProducts;

/**
 * Fetch services (products with IsService = true)
 * @param {Object} [params] - Query parameters
 * @returns {Promise} API response with service list
 */
export const getServices = (params) => apiClient.get('/api/Product', { params: { ...params, isService: true } });

/**
 * Fetch single product by ID
 * @param {number} id - Product ID
 * @returns {Promise} API response with product details
 */
export const fetchProductById = (id) => apiClient.get(`/api/Product/${id}`);

/**
 * Fetch single product by slug
 * @param {string} slug - Product slug
 * @returns {Promise} API response with product details
 */
export const fetchProductBySlug = (slug) => apiClient.get(`/api/Product/slug/${slug}`);

/**
 * Fetch featured products
 * @param {number} [limit=10] - Number of products to return
 * @returns {Promise} API response with featured products
 */
export const fetchFeaturedProducts = (limit = 10) => 
    apiClient.get('/api/Product', { params: { isFeatured: true, pageSize: limit } });

/**
 * Search products
 * @param {string} query - Search query
 * @param {Object} [filters] - Additional filters
 * @returns {Promise} API response with search results
 */
export const searchProducts = (query, filters = {}) => 
    apiClient.get('/api/Product', { params: { search: query, ...filters } });

/**
 * Create a new product
 * @param {Object} data - Product data
 * @param {string} data.name - Product name
 * @param {string} data.slug - URL-friendly slug
 * @param {number} data.price - Product price
 * @param {boolean} [data.isFeatured=false] - Featured status
 * @param {string} [data.description] - Product description
 * @param {string} data.brandName - Brand name
 * @param {number} data.quantity - Stock quantity
 * @param {number} data.brandId - Brand ID
 * @param {number} data.categoryId - Category ID
 * @param {string} [data.sku] - Stock Keeping Unit
 * @param {Array<{url: string, mediaType: string, sortOrder: number, isPrimary: boolean}>} [data.images] - Product images
 * @returns {Promise} API response
 */
export const createProduct = (data) => apiClient.post('/api/Product', data);

/**
 * Update an existing product
 * @param {number} id - Product ID
 * @param {Object} data - Updated product data
 * @returns {Promise} API response
 */
export const updateProduct = (id, data) => apiClient.put(`/api/Product/${id}`, data);

/**
 * Delete a product
 * @param {number} id - Product ID
 * @returns {Promise} API response
 */
export const deleteProduct = (id) => apiClient.delete(`/api/Product/${id}`);

/**
 * Toggle product active status (hide/show)
 * @param {number} id - Product ID
 * @returns {Promise} API response
 */
export const toggleProductActive = (id) => apiClient.put(`/api/Product/${id}/toggle-active`);

/**
 * Fetch product recommendations
 * @param {string} [sessionId] - Chat session ID for personalized recommendations
 * @returns {Promise} API response with recommended products
 */
export const fetchProductRecommendations = (sessionId) => {
    let url = '/api/Product/recommendations';
    
    if (sessionId) {
        url += `?sessionId=${sessionId}`;
    }
    
    return apiClient.get(url);
};

// Alias for consistency
export const getProductRecommendations = fetchProductRecommendations;
