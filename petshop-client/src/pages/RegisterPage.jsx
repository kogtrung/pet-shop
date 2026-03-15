import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function RegisterPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await register(username, email, password, phone);
            // Show success message about email confirmation
            alert('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập.');
            navigate('/');
        } catch (err) {
            const errorMsg = err.response?.data?.message || 
                           err.response?.data?.map?.(e => e.description).join('\n') || 
                           'Đăng ký thất bại. Vui lòng thử lại.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 border border-gray-200 shadow-soft">
                <div className="text-center">
                    <div className="w-12 h-12 bg-black text-white flex items-center justify-center mx-auto mb-4 text-lg font-heading">
                        P
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-textDark">
                        Tạo tài khoản mới
                    </h2>
                </div>
                {error && (
                    <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 text-center text-sm" role="alert">
                        <strong className="font-bold">Lỗi!</strong>
                        <span className="block sm:inline"> {error}</span>
                    </div>
                )}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username-register" className="sr-only">Tên đăng nhập</label>
                            <input
                                id="username-register"
                                name="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                                placeholder="Tên đăng nhập"
                            />
                        </div>
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                                placeholder="Địa chỉ email"
                            />
                        </div>
                        <div>
                            <label htmlFor="phone-register" className="sr-only">Số điện thoại</label>
                            <input
                                id="phone-register"
                                name="phone"
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                                placeholder="Số điện thoại"
                            />
                        </div>
                        <div>
                            <label htmlFor="password-register" className="sr-only">Mật khẩu</label>
                            <input
                                id="password-register"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                                placeholder="Mật khẩu"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="sr-only">Xác nhận mật khẩu</label>
                            <input
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                                placeholder="Xác nhận mật khẩu"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 border border-black bg-black hover:bg-white hover:text-black text-white font-heading font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? 'Đang xử lý...' : 'Đăng Ký'}
                        </button>
                    </div>
                </form>
                <p className="mt-2 text-center text-sm text-textDark/70">
                    Sau khi xác nhận email, hãy quay lại trang chủ và đăng nhập ở biểu tượng tài khoản góc phải trên.
                </p>
            </div>
        </div>
    );
}

export default RegisterPage;