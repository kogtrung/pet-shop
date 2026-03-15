import apiClient from './apiClient';

export const getBanners = async () => {
    try {
        const response = await apiClient.get('/api/Banner');
        return response.data;
    } catch (error) {
        console.error('Error fetching banners:', error);
        throw error;
    }
};

export const getBanner = async (id) => {
    try {
        const response = await apiClient.get(`/api/Banner/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching banner:', error);
        throw error;
    }
};

export const createBanner = async (bannerData) => {
    try {
        // Map UI fields to API DTO
        const payload = {
            title: bannerData.title,
            caption: bannerData.caption,
            buttonText: bannerData.buttonText,
            imageUrl: bannerData.image,
            linkUrl: bannerData.link,
            displayOrder: bannerData.order ?? 0,
            isActive: bannerData.isActive ?? true
        };
        const response = await apiClient.post('/api/Banner', payload);
        return response.data;
    } catch (error) {
        console.error('Error creating banner:', error);
        throw error;
    }
};

export const updateBanner = async (id, bannerData) => {
    try {
        const payload = {
            title: bannerData.title,
            caption: bannerData.caption,
            buttonText: bannerData.buttonText,
            imageUrl: bannerData.image,
            linkUrl: bannerData.link,
            displayOrder: bannerData.order ?? 0,
            isActive: bannerData.isActive
        };
        const response = await apiClient.put(`/api/Banner/${id}`, payload);
        return response.data;
    } catch (error) {
        console.error('Error updating banner:', error);
        throw error;
    }
};

export const deleteBanner = async (id) => {
    try {
        const response = await apiClient.delete(`/api/Banner/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting banner:', error);
        throw error;
    }
};

export const updateBannerOrder = async (bannerOrders) => {
    try {
        const payload = bannerOrders.map(b => ({
            id: b.id,
            displayOrder: b.order
        }));
        const response = await apiClient.put('/api/Banner/order', { bannerOrders: payload });
        return response.data;
    } catch (error) {
        console.error('Error updating banner order:', error);
        throw error;
    }
};

export const getActiveBanners = async () => {
    try {
        const response = await apiClient.get('/api/Banner/active');
        return response.data;
    } catch (error) {
        console.error('Error fetching active banners:', error);
        throw error;
    }
};
