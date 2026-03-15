import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, isAdmin, isSaleStaff, isServiceStaff, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && (isAdmin || isSaleStaff || isServiceStaff)) {
            // Redirect based on role after auth state updates
            if (isAdmin) {
                navigate('/admin', { replace: true });
            } else if (isSaleStaff) {
                navigate('/staff', { replace: true });
            } else if (isServiceStaff) {
                navigate('/service-staff', { replace: true });
            }
        }
    }, [loading, isAdmin, isSaleStaff, isServiceStaff, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(username, password);
            // Wait for auth state to update, then redirect
            setTimeout(() => {
                const token = localStorage.getItem('jwtToken');
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const roles = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
                                     payload.role || 
                                     (payload.roles ? (Array.isArray(payload.roles) ? payload.roles : payload.roles.split(',')) : []);
                        const roleList = Array.isArray(roles) ? roles : [roles];
                        
                        if (roleList.includes('Admin')) {
                            navigate('/admin', { replace: true });
                        } else if (roleList.includes('SaleStaff')) {
                            navigate('/staff', { replace: true });
                        } else if (roleList.includes('ServiceStaff')) {
                            navigate('/service-staff', { replace: true });
                        } else {
                            navigate('/', { replace: true });
                        }
                    } catch (err) {
                        console.error('Error parsing token:', err);
                        navigate('/', { replace: true });
                    }
                } else {
                    navigate('/', { replace: true });
                }
            }, 200);
        } catch (err) {
            // Check if error is about email confirmation
            if (err.response?.data?.requiresEmailConfirmation || 
                err.response?.data?.message?.includes('xác nhận email')) {
                setError(err.response.data.message || 'Vui lòng xác nhận email trước khi đăng nhập. Kiểm tra hộp thư của bạn để tìm link xác nhận.');
            } else {
                setError(err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
            }
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-softBlue flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-card shadow-soft-lg">
                <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-heading font-bold text-primary">P</span>
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-textDark">
                        Đăng nhập tài khoản
                    </h2>
                </div>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-image text-center">{error}</p>}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="sr-only">Tên đăng nhập</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 border border-textDark/20 bg-white text-textDark rounded-image focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="Tên đăng nhập"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Mật khẩu</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-textDark/20 bg-white text-textDark rounded-image focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="Mật khẩu"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-primary hover:bg-primary-600 text-white font-heading font-semibold rounded-button shadow-soft hover:shadow-soft-lg transition-all"
                        >
                            Đăng Nhập
                        </button>
                    </div>
                </form>
                <p className="mt-2 text-center text-sm text-textDark/70">
                    Chưa có tài khoản?{' '}
                    <Link to="/register" className="font-medium text-primary hover:text-primary-600">
                        Đăng ký ngay
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
