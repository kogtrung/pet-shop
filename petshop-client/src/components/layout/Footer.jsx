import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    PaperAirplaneIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

const Footer = () => {
    const [email, setEmail] = useState('');

    const handleNewsletterSubmit = (e) => {
        e.preventDefault();
        // Handle newsletter subscription
        console.log('Newsletter subscription:', email);
        setEmail('');
    };

    return (
        <footer className="bg-white mt-auto">
            <div className="container mx-auto px-4 py-8">
                {/* Newsletter Section */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-8 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <EnvelopeIcon className="w-6 h-6 text-gray-400" strokeWidth={2} />
                        <span className="text-gray-400 text-sm">Đăng kí nhận tin</span>
                    </div>
                    <form onSubmit={handleNewsletterSubmit} className="flex items-center gap-2 flex-1 max-w-md">
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Nhập email của bạn" 
                            className="flex-1 px-4 py-2 border border-gray-300 rounded text-sm text-left focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                        <button 
                            type="submit" 
                            className="px-6 py-2 bg-gray-800 text-white text-sm font-semibold uppercase hover:bg-gray-900 transition-colors"
                        >
                            ĐĂNG KÍ
                        </button>
                    </form>
                    <div className="flex items-center gap-2">
                        <PhoneIcon className="w-5 h-5 text-black" strokeWidth={2} />
                        <span className="text-red-600 font-medium">Hotline: 0912 34 56 78</span>
                    </div>
                </div>

                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* GIỚI THIỆU */}
                    <div>
                        <h4 className="text-lg font-semibold  uppercase mb-4">GIỚI THIỆU</h4>
                        <p className="text-gray-400 text-sm leading-relaxed mb-4">
                            Petivo là cửa hàng chuyên cung cấp thức ăn và phụ kiện cho thú cưng. Đến với Petivo, khách yêu shopping tận lực, Petivo tư vấn tận tâm. 
                        </p>
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs">
                            <CheckCircleIcon className="w-4 h-4 text-blue-600" strokeWidth={2} />
                            <span className="text-blue-800 font-medium">ĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG</span>
                        </div>
                    </div>

                    {/* CHÍNH SÁCH */}
                    <div>
                        <h4 className="text-lg font-semibold uppercase mb-4">CHÍNH SÁCH</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/contact" className=" text-sm hover:underline flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                    Liên hệ
                                </Link>
                            </li>
                            <li>
                                <Link to="/payment-methods" className="text-sm hover:underline flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                    Hình thức thanh toán
                                </Link>
                            </li>
                            <li>
                                <Link to="/terms" className="text-sm hover:underline flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                    Điều khoản dịch vụ
                                </Link>
                            </li>
                            <li>
                                <Link to="/shipping" className="text-sm hover:underline flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                    Chính sách vận chuyển
                                </Link>
                            </li>
                            <li>
                                <Link to="/returns" className="text-sm hover:underline flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                    Chính sách đổi trả
                                </Link>
                            </li>
                            <li>
                                <Link to="/privacy" className="text-sm hover:underline flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                    Chính sách bảo mật thông tin
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* THÔNG TIN LIÊN HỆ */}
                    <div>
                        <h4 className="text-lg font-semibold uppercase mb-4">THÔNG TIN LIÊN HỆ</h4>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <MapPinIcon className="w-5 h-5 text-black mt-0.5 flex-shrink-0" strokeWidth={2} />
                                <span className="text-sm">111 Hiệp Bình, phường Hiệp Bình, Thành phố Thủ Đức, TP.HCM</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <PhoneIcon className="w-5 h-5 text-black flex-shrink-0" strokeWidth={2} />
                                <span className="text-sm">0912 345 678</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <PaperAirplaneIcon className="w-5 h-5 text-black flex-shrink-0" strokeWidth={2} />
                                <span className="text-sm">petivoshop2025@gmail.com</span>
                            </li>
                        </ul>
                    </div>

                    {/* FANPAGE */}
                    <div>
                        <h4 className="text-lg font-semibold  uppercase mb-4">FANPAGE</h4>
                        {/* Facebook page embed or placeholder */}
                        <div className="bg-gray-100 h-48 flex items-center justify-center rounded">
                            <span className="text-gray-400 text-sm">Facebook Page</span>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-6 border-t border-gray-200 text-center">
                    <p className="text-gray-400 text-sm">&copy; 2025 Petivo. Đã đăng ký bản quyền.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
