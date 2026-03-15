import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';

function useQuery() {
    const { search } = useLocation();
    return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default function PaymentCallbackPage() {
    const query = useQuery();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing | success | failed
    const [message, setMessage] = useState('');

    useEffect(() => {
        // MoMo trả về resultCode: 0 = thành công, khác 0 = lỗi/hủy
        const resultCode = query.get('resultCode');
        const momoMessage = query.get('message') || '';

        if (resultCode === '0') {
            setStatus('success');
            setMessage('Thanh toán MoMo thành công! Đơn hàng của bạn sẽ được xử lý trong thời gian sớm nhất.');
        } else {
            setStatus('failed');
            setMessage(momoMessage || 'Thanh toán MoMo không thành công hoặc đã bị hủy.');
        }
    }, [query]);

    const handleGoToOrders = () => {
        navigate('/account/orders');
    };

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="max-w-lg w-full bg-white shadow-xl rounded-2xl p-8 border border-gray-100 text-center">
                {status === 'processing' && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <h1 className="text-2xl font-bold mb-2">Đang xử lý thanh toán...</h1>
                        <p className="text-gray-600">Vui lòng chờ trong giây lát.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-3xl">✅</span>
                        </div>
                        <h1 className="text-2xl font-bold mb-2 text-green-600">Thanh toán thành công</h1>
                        <p className="text-gray-700 mb-6">{message}</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button variant="primary" onClick={handleGoToOrders}>
                                Xem lịch sử đơn hàng
                            </Button>
                            <Button variant="secondary" onClick={handleGoHome}>
                                Về trang chủ
                            </Button>
                        </div>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <h1 className="text-2xl font-bold mb-2 text-red-600">Thanh toán thất bại</h1>
                        <p className="text-gray-700 mb-6">{message}</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button variant="primary" onClick={handleGoHome}>
                                Quay lại trang chủ
                            </Button>
                            <Button variant="secondary" onClick={() => navigate('/checkout')}>
                                Thử thanh toán lại
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}


