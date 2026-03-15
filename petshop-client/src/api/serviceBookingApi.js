import apiClient from './apiClient';

/**
 * Service Booking API client (Inferred structure based on common REST patterns)
 * Handles service booking and appointment management
 */

// Create a new service booking
export const createServiceBooking = async (bookingData) => {
    try {
        console.log('Sending booking data to API:', bookingData);
        const response = await apiClient.post('/api/ServiceBooking', bookingData);
        return response;
    } catch (error) {
        console.error('Error creating service booking:', error);
        console.error('Error response data:', error.response?.data);
        throw error;
    }
};

// Get user's service bookings
export const getUserServiceBookings = async () => {
    try {
        const response = await apiClient.get('/api/ServiceBooking/my-bookings');
        return response;
    } catch (error) {
        console.error('Error fetching user service bookings:', error);
        throw error;
    }
};

// Get service booking by ID
export const getServiceBookingById = async (id) => {
    try {
        const response = await apiClient.get(`/api/ServiceBooking/${id}`);
        return response;
    } catch (error) {
        console.error('Error fetching service booking:', error);
        throw error;
    }
};

// Update service booking status (admin only)
export const updateServiceBookingStatus = async (id, statusData) => {
    try {
        const response = await apiClient.put(`/api/ServiceBooking/${id}/status`, statusData);
        return response;
    } catch (error) {
        console.error('Error updating service booking status:', error);
        throw error;
    }
};

// Get all service bookings (admin only)
export const getAllServiceBookings = async (params = {}) => {
    try {
        const response = await apiClient.get('/api/ServiceBooking', { params });
        return response;
    } catch (error) {
        console.error('Error fetching all service bookings:', error);
        throw error;
    }
};

// Get available customer slots based on current bookings
export const getAvailableServiceSlots = async (params = {}) => {
    try {
        const response = await apiClient.get('/api/ServiceBooking/available-slots', { params });
        return response;
    } catch (error) {
        console.error('Error fetching available service slots:', error);
        throw error;
    }
};

// Cancel service booking (user cancels own booking)
export const cancelServiceBooking = async (id, data) => {
    try {
        const response = await apiClient.put(`/api/ServiceBooking/${id}/cancel`, data);
        return response;
    } catch (error) {
        console.error('Error cancelling service booking:', error);
        throw error;
    }
};

// Delete service booking (admin only)
export const deleteServiceBooking = async (id) => {
    try {
        const response = await apiClient.delete(`/api/ServiceBooking/${id}`);
        return response;
    } catch (error) {
        console.error('Error deleting service booking:', error);
        throw error;
    }
};

// Update booking item status (admin/service staff)
export const updateBookingItemStatus = async (itemId, statusData) => {
    try {
        const response = await apiClient.put(`/api/ServiceBooking/items/${itemId}/status`, statusData);
        return response;
    } catch (error) {
        console.error('Error updating booking item status:', error);
        throw error;
    }
};

// Get availability for service staff within a time range (admin)
export const getStaffAvailability = async (params = {}) => {
    try {
        const response = await apiClient.get('/api/ServiceBooking/staff-availability', { params });
        return response;
    } catch (error) {
        console.error('Error fetching staff availability:', error);
        throw error;
    }
};

export const updateServiceStaffDutyStatus = async (staffId, payload) => {
    try {
        const response = await apiClient.put(`/api/ServiceBooking/service-staff/${staffId}/on-duty`, payload);
        return response;
    } catch (error) {
        console.error('Error updating staff duty status:', error);
        throw error;
    }
};

// Get availability specific to a booking
export const getBookingStaffAvailability = async (bookingId) => {
    try {
        const response = await apiClient.get(`/api/ServiceBooking/${bookingId}/available-staff`);
        return response;
    } catch (error) {
        console.error('Error fetching booking staff availability:', error);
        throw error;
    }
};

// Assign staff for entire booking (admin)
export const assignServiceBookingStaff = async (bookingId, payload) => {
    try {
        const response = await apiClient.put(`/api/ServiceBooking/${bookingId}/assign-staff`, payload);
        return response;
    } catch (error) {
        console.error('Error assigning staff to booking:', error);
        throw error;
    }
};

// Mark booking as paid (SaleStaff)
export const markBookingAsPaid = async (bookingId) => {
    try {
        const response = await apiClient.put(`/api/ServiceBooking/${bookingId}/mark-paid`);
        return response;
    } catch (error) {
        console.error('Error marking booking as paid:', error);
        throw error;
    }
};

// Create walk-in booking (SaleStaff)
export const createWalkInBooking = async (bookingData) => {
    try {
        console.log('Creating walk-in booking:', bookingData);
        const response = await apiClient.post('/api/ServiceBooking/walk-in', bookingData);
        return response;
    } catch (error) {
        console.error('Error creating walk-in booking:', error);
        console.error('Error response data:', error.response?.data);
        throw error;
    }
};