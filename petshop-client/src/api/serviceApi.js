import apiClient from './apiClient';

// Service APIs
export const getServices = (params) => apiClient.get('/api/Service', { params });
export const fetchServices = getServices;
export const getServiceById = (id) => apiClient.get(`/api/Service/${id}`);

export const createService = ({ name, description, priceType, isActive }) =>
    apiClient.post('/api/Service', {
        name,
        description,
        priceType,
        isActive
    });

export const updateService = (id, { name, description, priceType, isActive }) =>
    apiClient.put(`/api/Service/${id}`, {
        name,
        description,
        priceType,
        isActive
    });

export const deleteService = (id) => apiClient.delete(`/api/Service/${id}`);

// Service package APIs
export const createServicePackage = (serviceId, data) =>
    apiClient.post(`/api/Service/${serviceId}/packages`, data);

export const updateServicePackage = (packageId, data) =>
    apiClient.put(`/api/Service/packages/${packageId}`, data);

export const deleteServicePackage = (packageId) =>
    apiClient.delete(`/api/Service/packages/${packageId}`);

// Service Staff Assignment APIs
export const getServiceStaff = (serviceId) =>
    apiClient.get(`/api/Service/${serviceId}/staff`);

export const getStaffServices = (staffId) =>
    apiClient.get(`/api/Service/staff/${staffId}/services`);

export const assignStaffToService = (serviceId, data) =>
    apiClient.post(`/api/Service/${serviceId}/staff`, data);

export const updateStaffAssignment = (assignmentId, data) =>
    apiClient.put(`/api/Service/staff-assignments/${assignmentId}`, data);

export const removeStaffAssignment = (assignmentId) =>
    apiClient.delete(`/api/Service/staff-assignments/${assignmentId}`);
