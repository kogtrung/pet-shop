import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyOrderById, updateOrderPaymentStatus, createOrder } from '../api/orderApi';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import { CheckCircleIcon, XCircleIcon, CreditCardIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function PaymentDemoPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const orderId = searchParams.get('orderId');
    const paymentMethod = searchParams.get('method');
    const amount = searchParams.get('amount');
    
    const [order, setOrder] = useState(null);
    const [pendingOrderData, setPendingOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, success, failed

    useEffect(() => {
        // If orderId exists, load existing order (for viewing)
        if (orderId) {
            const loadOrder = async () => {
                try {
                    const response = await fetchMyOrderById(orderId);
                    setOrder(response.data);
                } catch (error) {
                    console.error('Error loading order:', error);
                    toast.error('Không thể tải thông tin đơn hàng');
                    navigate('/account/orders');
                } finally {
                    setLoading(false);
                }
            };
            loadOrder();
        } else {
            // No orderId - this is a new payment, load pending order data from sessionStorage
            const pendingData = sessionStorage.getItem('pendingOrder');
            if (pendingData) {
                try {
                    const data = JSON.parse(pendingData);
                    setPendingOrderData(data);
                    // Create a mock order object for display
                    setOrder({
                        id: null,
                        orderCode: 'Chưa tạo',
                        paymentMethod: data.paymentMethod,
                        total: data.total,
                        shippingFee: data.shippingFee,
                        items: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            lineTotal: item.unitPrice * item.quantity
                        }))
                    });
                } catch (error) {
                    console.error('Error parsing pending order data:', error);
                    toast.error('Không thể tải thông tin đơn hàng');
                    navigate('/checkout');
                }
            } else {
                toast.error('Không tìm thấy thông tin đơn hàng');
                navigate('/checkout');
            }
            setLoading(false);
        }
    }, [orderId, navigate]);

    const handlePayment = async (success = true) => {
        setProcessing(true);
        
        // Simulate payment processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            if (success) {
                // If order doesn't exist yet (pendingOrderData), create it first
                if (!order.id && pendingOrderData) {
                    // Create order after payment success
                    const orderResponse = await createOrder(pendingOrderData);
                    const createdOrderId = orderResponse.data?.orderId || orderResponse.data?.id;
                    
                    // Update payment status to Paid
                    await updateOrderPaymentStatus(createdOrderId, { 
                        paymentStatus: 'Paid',
                        transactionId: `DEMO-${Date.now()}`
                    });
                    
                    // Clear pending order data
                    sessionStorage.removeItem('pendingOrder');
                    
                    setPaymentStatus('success');
                    toast.success('Thanh toán thành công! Đơn hàng đã được tạo.');
                    
                    // Redirect to order history after 2 seconds
                    setTimeout(() => {
                        navigate('/account/orders');
                    }, 2000);
                } else if (order.id) {
                    // Order already exists, just update payment status
                    await updateOrderPaymentStatus(order.id, { 
                        paymentStatus: 'Paid',
                        transactionId: `DEMO-${Date.now()}`
                    });
                    
                    setPaymentStatus('success');
                    toast.success('Thanh toán thành công!');
                    
                    // Redirect to order history after 2 seconds
                    setTimeout(() => {
                        navigate('/account/orders');
                    }, 2000);
                } else {
                    throw new Error('Không tìm thấy thông tin đơn hàng');
                }
            } else {
                setPaymentStatus('failed');
                toast.error('Thanh toán thất bại. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            setPaymentStatus('failed');
            toast.error('Có lỗi xảy ra khi xử lý thanh toán');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return null;
    }

    const getPaymentMethodName = (method) => {
        const methods = {
            'VNPAY': 'VNPay',
            'MOMO': 'Ví MoMo',
            'CREDIT_CARD': 'Thẻ tín dụng/Ghi nợ',
            'BANK_TRANSFER': 'Chuyển khoản ngân hàng'
        };
        return methods[method] || method;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
                            <CreditCardIcon className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {paymentStatus === 'pending' && 'Thanh toán đơn hàng'}
                            {paymentStatus === 'success' && 'Thanh toán thành công'}
                            {paymentStatus === 'failed' && 'Thanh toán thất bại'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {paymentStatus === 'pending' && 'Vui lòng hoàn tất thanh toán để xác nhận đơn hàng'}
                            {paymentStatus === 'success' && 'Đơn hàng của bạn đã được xác nhận'}
                            {paymentStatus === 'failed' && 'Thanh toán không thành công, vui lòng thử lại'}
                        </p>
                    </div>

                    {/* Order Info */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Thông tin đơn hàng
                        </h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Mã đơn hàng:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {order.orderCode || `#${order.id}`}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Phương thức thanh toán:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {getPaymentMethodName(paymentMethod || order.paymentMethod)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Tổng tiền:</span>
                                <span className="font-bold text-xl text-indigo-600 dark:text-indigo-400">
                                    {(amount ? parseFloat(amount) : order.total).toLocaleString('vi-VN')} ₫
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Status */}
                    {paymentStatus === 'pending' && (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <ClockIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                            <strong>Trang demo thanh toán</strong>
                                        </p>
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                            Đây là trang demo để test quy trình thanh toán. 
                                            Sau khi tích hợp gateway thật, bạn sẽ được chuyển đến cổng thanh toán thực tế.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Demo Payment Buttons */}
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    onClick={() => handlePayment(true)}
                                    disabled={processing}
                                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
                                >
                                    {processing ? (
                                        <span className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Đang xử lý...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <CheckCircleIcon className="w-5 h-5" />
                                            Thanh toán thành công (Demo)
                                        </span>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => handlePayment(false)}
                                    disabled={processing}
                                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
                                >
                                    {processing ? (
                                        <span className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Đang xử lý...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <XCircleIcon className="w-5 h-5" />
                                            Thanh toán thất bại (Demo)
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {paymentStatus === 'success' && (
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
                                <CheckCircleIcon className="w-12 h-12 text-green-600" />
                            </div>
                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                                Đơn hàng của bạn đã được xác nhận và đang được xử lý.
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Bạn sẽ được chuyển đến trang lịch sử đơn hàng...
                            </p>
                        </div>
                    )}

                    {paymentStatus === 'failed' && (
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30">
                                <XCircleIcon className="w-12 h-12 text-red-600" />
                            </div>
                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                                Thanh toán không thành công
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
                            </p>
                            <div className="flex gap-4 justify-center">
                                <Button
                                    onClick={() => setPaymentStatus('pending')}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    Thử lại
                                </Button>
                                <Button
                                    onClick={() => navigate('/account/orders')}
                                    variant="secondary"
                                    className="px-6 py-2"
                                >
                                    Về trang đơn hàng
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Cancel Button */}
                    {paymentStatus === 'pending' && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => navigate('/account/orders')}
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            >
                                Hủy và quay lại
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

