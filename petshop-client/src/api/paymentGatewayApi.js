import apiClient from './apiClient';

// Tạo yêu cầu thanh toán MoMo cho một đơn hàng đã tạo
export const createMoMoPayment = async (orderId) => {
    // Backend route: [Route("api/[controller]")] => /api/payment/momo/create
    const response = await apiClient.post('/api/payment/momo/create', { orderId });
    return response.data; // { paymentUrl, transactionId }
};


