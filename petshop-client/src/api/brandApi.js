import apiClient from './apiClient';

export const fetchBrands = () => apiClient.get('/api/Brand');
export const getBrands = fetchBrands; // Alias for consistency
export const fetchBrandById = (id) => apiClient.get(`/api/Brand/${id}`);
export const createBrand = (data) => apiClient.post('/api/Brand', data);
export const updateBrand = (id, data) => apiClient.put(`/api/Brand/${id}`, data);
export const deleteBrand = (id) => apiClient.delete(`/api/Brand/${id}`);

