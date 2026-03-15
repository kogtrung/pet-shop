import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [errorMessage, setErrorMessage] = useState('');
    const hasVerifiedRef = React.useRef(false);

    useEffect(() => {
        // Prevent multiple calls (React StrictMode runs useEffect twice)
        if (hasVerifiedRef.current || status !== 'verifying') {
            return;
        }

        const email = searchParams.get('email');
        const token = searchParams.get('token');

        if (!email || !token) {
            setStatus('error');
            setErrorMessage('Thiếu thông tin xác nhận email');
            return;
        }

        verifyEmail(email, token);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const verifyEmail = async (email, token) => {
        // Prevent multiple calls
        if (hasVerifiedRef.current) {
            return;
        }

        try {
            hasVerifiedRef.current = true;
            const response = await apiClient.post('/api/auth/verify-email', {
                email,
                token
            });

            if (response.status === 200) {
                setStatus('success');
                const message = response.data?.message || 'Email đã được xác nhận thành công!';
                toast.success(message);
                // Redirect to home after 3 seconds
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            }
        } catch (error) {
            // Check if email is already verified
            if (error.response?.status === 200 || 
                error.response?.data?.message?.includes('already verified') ||
                error.response?.data?.message?.includes('đã được xác nhận')) {
                setStatus('success');
                toast.success('Email đã được xác nhận trước đó!');
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            } else {
                setStatus('error');
                const message = error.response?.data?.message || 
                              (Array.isArray(error.response?.data?.errors) 
                                ? error.response.data.errors.join(', ') 
                                : error.message) || 
                              'Không thể xác nhận email';
                setErrorMessage(message);
                toast.error(message);
                // Reset hasVerifiedRef on error so user can retry
                hasVerifiedRef.current = false;
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                {status === 'verifying' && (
                    <>
                        <div className="inline-block w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Đang xác nhận email...
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Vui lòng đợi trong giây lát
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                            <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Xác nhận email thành công!
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Email của bạn đã được xác nhận. Hãy quay lại trang chủ và đăng nhập bằng biểu tượng tài khoản ở góc phải trên.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                            Tự động chuyển về trang chủ sau 3 giây...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                            <XCircleIcon className="h-10 w-10 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Xác nhận email thất bại
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {errorMessage || 'Link xác nhận không hợp lệ hoặc đã hết hạn.'}
                        </p>
                        <div className="space-y-3">
                            <Link
                                to="/register"
                                className="inline-block w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Đăng ký lại
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

