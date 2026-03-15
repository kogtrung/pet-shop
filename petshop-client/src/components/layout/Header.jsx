import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getCategories } from '../../api/categoryApi';
import { getImageUrl } from '../../utils/imageUtils';
import { 
    MagnifyingGlassIcon,
    ShoppingCartIcon,
    UserIcon,
    ChevronDownIcon,
    Bars3Icon,
    XMarkIcon,
    HeartIcon,
    ShoppingBagIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    UserCircleIcon,
    CalendarDaysIcon,
    WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

const Header = () => {
    const { user, isAdmin, isServiceStaff, isSaleStaff, logout, login } = useAuth();
    const { items, clearCart, removeItem } = useCart();
    const navigate = useNavigate();
    
    // States
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState([]);
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMiniCart, setShowMiniCart] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    // Refs
    const categoryMenuRef = useRef(null);
    const userMenuRef = useRef(null);
    const cartMenuRef = useRef(null);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await getCategories();
                setCategories(response.data);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
                setShowCategoryMenu(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
            if (cartMenuRef.current && !cartMenuRef.current.contains(event.target)) {
                setShowMiniCart(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle scroll for transparent header and hide/show on scroll
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // Check if scrolled past a threshold (e.g., 50px)
            setIsScrolled(currentScrollY > 50);
            
            // Hide header when scrolling down, show when scrolling up
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    // Get cart items count
    const cartItemsCount = items.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = items.reduce((total, item) => {
        const price = item.productPrice || item.product?.price || 0;
        return total + (price * (item.quantity || 0));
    }, 0);

    // Organize categories into parent-child structure
    const organizeCategories = () => {
        const parentCategories = categories.filter(cat => !cat.parentId);
        return parentCategories.map(parent => ({
            ...parent,
            children: categories.filter(cat => cat.parentId === parent.id)
        }));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
        }
    };

    const handleLogout = () => {
        clearCart(); // Xóa toàn bộ giỏ hàng
        logout();
        setShowUserMenu(false);
        navigate('/');
    };

    const handleMiniLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginError('');
        setIsLoggingIn(true);
        try {
            await login(loginForm.username, loginForm.password);
            // Similar role-based redirect logic as LoginPage
            setTimeout(() => {
                const token = localStorage.getItem('jwtToken');
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const roles =
                            payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                            payload.role ||
                            (payload.roles
                                ? Array.isArray(payload.roles)
                                    ? payload.roles
                                    : payload.roles.split(',')
                                : []);
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
                    } catch {
                        navigate('/', { replace: true });
                    }
                } else {
                    navigate('/', { replace: true });
                }
                setShowUserMenu(false);
            }, 200);
        } catch (err) {
            if (
                err.response?.data?.requiresEmailConfirmation ||
                err.response?.data?.message?.includes('xác nhận email')
            ) {
                setLoginError(
                    err.response.data.message ||
                        'Vui lòng xác nhận email trước khi đăng nhập. Kiểm tra hộp thư của bạn để tìm link xác nhận.'
                );
            } else {
                setLoginError(err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <header 
            className={`${
                isScrolled 
                    ? 'bg-white/80 backdrop-blur-md shadow-soft' 
                    : 'bg-transparent'
            } sticky top-0 z-50 transition-all duration-300 ${
                isVisible ? 'translate-y-0' : '-translate-y-full'
            }`}
        >
            <div className="container mx-auto px-4">
                {/* Top Bar */}
                <div className="flex items-center justify-between py-4">
                    {/* Logo Petivo */}
                    <Link to="/" className="flex items-center space-x-2">
                        <div>
                            <h1 className="text-3xl font-bold text-black dark:text-white" style={{ fontFamily: 'serif', fontStyle: 'italic' }}>Petivo</h1>
                            <p className="text-xs text-textDark/70">Chăm sóc thú cưng</p>
                        </div>
                    </Link>
{/* Navigation Bar with Category Mega Menu - Ẩn khi là Admin, SaleStaff, ServiceStaff */}
                    {!isAdmin && !isSaleStaff && !isServiceStaff && (
                        <>
                            <div className="hidden md:flex items-center space-x-6 py-3">
                                {/* Category Mega Menu */}
                                <div className="relative" ref={categoryMenuRef}>
                                    <button
                                        onMouseEnter={() => setShowCategoryMenu(true)}
                                        onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                                        className="flex items-center space-x-2 px-3 py-2 text-textDark hover:text-primary font-medium transition-colors"
                                    >
                                        <Bars3Icon className="w-5 h-5" strokeWidth={2} />
                                        <span>Danh mục</span>
                                        <ChevronDownIcon className="w-4 h-4" strokeWidth={2} />
                                    </button>

                                    {/* Mega Menu */}
                                    {showCategoryMenu && (
                                        <div
                                            onMouseLeave={() => setShowCategoryMenu(false)}
                                            className="absolute left-0 top-full mt-2 w-screen max-w-2xl bg-white rounded-card shadow-soft-lg border border-softGray p-4 z-50"
                                        >
                                            <div className="grid grid-cols-3 gap-4">
                                                {organizeCategories().map((parent) => (
                                                    <div key={parent.id} className="space-y-3">
                                                        <Link
                                                            to={`/products?categoryId=${parent.id}`}
                                                            onClick={() => setShowCategoryMenu(false)}
                                                            className="block text-lg font-heading font-bold text-primary hover:text-primary-600 transition-colors"
                                                        >
                                                            {parent.name}
                                                        </Link>
                                                        {parent.children && parent.children.length > 0 && (
                                                            <ul className="space-y-2 ml-3">
                                                                {parent.children.map((child) => (
                                                                    <li key={child.id}>
                                                                        <Link
                                                                            to={`/products?categoryId=${child.id}`}
                                                                            onClick={() => setShowCategoryMenu(false)}
                                                                            className="text-sm text-textDark/70 hover:text-primary transition-colors"
                                                                        >
                                                                            {child.name}
                                                                        </Link>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}

                                                    </div>
                                                ))}
                                            </div>
                                            {organizeCategories().length === 0 && (
                                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">Chưa có danh mục nào</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Link
                                    to="/products"
                                    className="text-sm font-medium text-textDark hover:text-primary transition-colors"
                                >
                                    Sản phẩm
                                </Link>
                                <Link
                                    to="/services"
                                    className="text-sm font-medium text-textDark hover:text-primary transition-colors"
                                >
                                    Dịch vụ
                                </Link>
                                <Link
                                    to="/about"
                                    className="text-sm font-medium text-textDark hover:text-primary transition-colors"
                                >
                                    Giới thiệu
                                </Link>
                            </div>
                            {/* Search Bar - Desktop - Ẩn khi là Admin, SaleStaff, ServiceStaff */}
                            <form onSubmit={handleSearch} className="hidden md:flex max-w-xs mx-4">
                                <div className="relative w-full">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Tìm kiếm sản phẩm..."
                                        className="w-full px-3 py-2 pr-10 rounded-lg border border-textDark/20 bg-white text-textDark focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                    />
                                    <button
                                        type="submit"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-primary-600 transition-colors"
                                    >
                                        <MagnifyingGlassIcon className="w-4 h-4" strokeWidth={2} />
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {/* Right Actions */}
                    <div className="flex items-center space-x-4">
                        {/* Wishlist Icon - Ẩn khi là Admin, SaleStaff, ServiceStaff */}
                        {!isAdmin && !isSaleStaff && !isServiceStaff && (
                            <Link
                                to="/account/wishlist"
                                className="relative p-2 rounded-full text-textDark hover:bg-white/50 transition-colors"
                            >
                                <HeartIcon className="w-6 h-6" strokeWidth={2} />
                            </Link>
                        )}

                        {/* Cart Icon + Mini Cart - Ẩn khi là Admin, SaleStaff, ServiceStaff */}
                        {!isAdmin && !isSaleStaff && !isServiceStaff && (
                            <div className="relative" ref={cartMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowMiniCart(prev => !prev)}
                                className="relative p-2 rounded-full text-textDark hover:bg-white/50 transition-colors"
                            >
                                <ShoppingCartIcon className="w-6 h-6" strokeWidth={2} />
                                {cartItemsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-textDark text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-soft">
                                        {cartItemsCount > 99 ? '99+' : cartItemsCount}
                                    </span>
                                )}
                                </button>
                                {showMiniCart && (
                                    <div className="absolute right-0 mt-2 w-[500px] bg-white border border-gray-200 shadow-lg z-40">
                                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                            <span className="text-sm font-semibold text-black">Giỏ hàng ({cartItemsCount})</span>
                                            <button
                                                type="button"
                                                className="text-xl leading-none text-gray-500 hover:text-black"
                                                onClick={() => setShowMiniCart(false)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {items.length === 0 ? (
                                                <div className="px-4 py-6 text-sm text-gray-600">
                                                    Chưa có sản phẩm nào trong giỏ hàng.
                                                </div>
                                            ) : (
                                                items.map(item => {
                                                    // Get image URL properly
                                                    let imageUrl = null;
                                                    if (item.product?.images && item.product.images.length > 0) {
                                                        const primaryImage = item.product.images.find(img => img.isPrimary);
                                                        imageUrl = getImageUrl(primaryImage ? primaryImage.url : item.product.images[0].url);
                                                    } else if (item.product?.imageUrl) {
                                                        imageUrl = getImageUrl(item.product.imageUrl);
                                                    } else if (item.productImageUrl) {
                                                        imageUrl = getImageUrl(item.productImageUrl);
                                                    }
                                                    
                                                    if (!imageUrl) {
                                                        imageUrl = `https://placehold.co/100x100/E5E7EB/111827?text=${encodeURIComponent((item.productName || item.product?.name || 'P')[0])}`;
                                                    }
                                                    
                                                    const productKey = item.productId || item.product?.id;
                                                    return (
                                                        <div
                                                            key={item.id || productKey}
                                                            className="relative px-4 py-3 flex items-center gap-3 border-b last:border-none border-gray-200"
                                                        >
                                                            <img
                                                                src={imageUrl}
                                                                alt={item.productName || item.product?.name}
                                                                className="w-16 h-16 object-cover bg-gray-100 flex-shrink-0"
                                                                onError={(e) => {
                                                                    e.target.src = `https://placehold.co/100x100/E5E7EB/111827?text=${encodeURIComponent((item.productName || item.product?.name || 'P')[0])}`;
                                                                }}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm text-black font-medium truncate mb-1">
                                                                    {item.productName || item.product?.name}
                                                                </p>
                                                                <p className="text-xs text-gray-600">
                                                                    SL: {item.quantity} × {(item.productPrice || item.product?.price || 0).toLocaleString('vi-VN')} ₫
                                                                </p>
                                                            </div>
                                                            <span className="text-sm font-semibold text-black whitespace-nowrap">
                                                                {((item.productPrice || item.product?.price || 0) * (item.quantity || 0)).toLocaleString('vi-VN')} ₫
                                                            </span>
                                                            {productKey && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeItem(productKey)}
                                                                    className="absolute top-2 right-2 text-sm text-gray-400 hover:text-black"
                                                                    aria-label="Xóa sản phẩm khỏi giỏ"
                                                                >
                                                                    ×
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        {items.length > 0 && (
                                            <div className="px-4 py-4 border-t border-gray-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-base font-semibold text-black">Tổng tiền:</span>
                                                    <span className="text-xl font-bold text-black">{cartTotal.toLocaleString('vi-VN')} ₫</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowMiniCart(false);
                                                            navigate('/cart');
                                                        }}
                                                        className="flex-1 py-2.5 border border-black bg-black text-white text-sm font-medium transition-all duration-300 hover:bg-white hover:text-black"
                                                    >
                                                        Xem giỏ hàng
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowMiniCart(false);
                                                            navigate('/checkout');
                                                        }}
                                                        className="flex-1 py-2.5 border border-black bg-black text-white text-sm font-medium transition-all duration-300 hover:bg-white hover:text-black"
                                                    >
                                                        Thanh toán
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* User Icon + Mini Login/Menu */}
                            <div className="relative" ref={userMenuRef}>
                                <button
                                onClick={() => setShowUserMenu(prev => !prev)}
                                className="p-2 rounded-full text-textDark hover:bg-white/50 transition-colors"
                                aria-label="Tài khoản"
                            >
                                <UserCircleIcon className="w-6 h-6" strokeWidth={2} />
                                </button>

                                {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 shadow-soft-lg rounded-none py-3 z-50">
                                    {!user ? (
                                        <form onSubmit={handleMiniLoginSubmit} className="px-4 space-y-3">
                                            <h3 className="text-sm font-semibold text-black mb-1">Đăng nhập</h3>
                                            {loginError && (
                                                <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-1">
                                                    {loginError}
                                                </p>
                                            )}
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    required
                                                    value={loginForm.username}
                                                    onChange={(e) =>
                                                        setLoginForm(prev => ({ ...prev, username: e.target.value }))
                                                    }
                                                    placeholder="Tên đăng nhập"
                                                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                                />
                                                <input
                                                    type="password"
                                                    required
                                                    value={loginForm.password}
                                                    onChange={(e) =>
                                                        setLoginForm(prev => ({ ...prev, password: e.target.value }))
                                                    }
                                                    placeholder="Mật khẩu"
                                                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isLoggingIn}
                                                className="w-full py-2.5 border border-black bg-black text-white text-sm font-medium transition-all duration-300 hover:bg-white hover:text-black disabled:opacity-60"
                                            >
                                                {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
                                            </button>
                                            <p className="text-xs text-gray-600 text-center">
                                                Chưa có tài khoản?{' '}
                                                <Link
                                                    to="/register"
                                                    onClick={() => setShowUserMenu(false)}
                                                    className="underline"
                                                >
                                                    Đăng ký ngay
                                                </Link>
                                            </p>
                                        </form>
                                    ) : (
                                        <div>
                                            <div className="px-4 pb-2 border-b border-gray-200 mb-1">
                                                <p className="text-sm font-semibold text-black">
                                                    {user.profile?.fullName || user.username}
                                                </p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                            <div className="py-1">
                                        <Link
                                            to="/account/profile"
                                            onClick={() => setShowUserMenu(false)}
                                                    className="flex items-center space-x-3 px-4 py-2 hover:bg-softGray transition-colors"
                                        >
                                            <UserIcon className="w-5 h-5 text-textDark" strokeWidth={2} />
                                            <span className="text-sm text-textDark">Hồ sơ cá nhân</span>
                                        </Link>

                                        {!isAdmin && !isSaleStaff && !isServiceStaff && (
                                            <>
                                                <Link
                                                    to="/account/orders"
                                                    onClick={() => setShowUserMenu(false)}
                                                            className="flex items-center space-x-3 px-4 py-2 hover:bg-softGray transition-colors"
                                                >
                                                            <ShoppingBagIcon
                                                                className="w-5 h-5 text-textDark"
                                                                strokeWidth={2}
                                                            />
                                                            <span className="text-sm text-textDark">
                                                                Đơn hàng của tôi
                                                            </span>
                                                </Link>
                                                <Link
                                                    to="/account/wishlist"
                                                    onClick={() => setShowUserMenu(false)}
                                                            className="flex items-center space-x-3 px-4 py-2 hover:bg-softGray transition-colors"
                                                >
                                                            <HeartIcon
                                                                className="w-5 h-5 text-textDark"
                                                                strokeWidth={2}
                                                            />
                                                            <span className="text-sm text-textDark">
                                                                Sản phẩm yêu thích
                                                            </span>
                                                </Link>
                                                <Link
                                                    to="/account/bookings"
                                                    onClick={() => setShowUserMenu(false)}
                                                            className="flex items-center space-x-3 px-4 py-2 hover:bg-softGray transition-colors"
                                                >
                                                            <CalendarDaysIcon
                                                                className="w-5 h-5 text-textDark"
                                                                strokeWidth={2}
                                                            />
                                                            <span className="text-sm text-textDark">
                                                                Lịch đặt dịch vụ
                                                            </span>
                                                </Link>
                                            </>
                                        )}

                                        {isAdmin && (
                                            <Link
                                                to="/admin"
                                                onClick={() => setShowUserMenu(false)}
                                                        className="flex items-center space-x-3 px-4 py-2 hover:bg-softGray transition-colors"
                                            >
                                                <Cog6ToothIcon className="w-5 h-5 text-textDark" strokeWidth={2} />
                                                <span className="text-sm text-textDark">Trang quản trị</span>
                                            </Link>
                                        )}

                                        {(isServiceStaff || isAdmin) && (
                                            <Link
                                                to="/service-staff"
                                                onClick={() => setShowUserMenu(false)}
                                                        className="flex items-center space-x-3 px-4 py-2 hover:bg-softGray transition-colors"
                                            >
                                                        <WrenchScrewdriverIcon
                                                            className="w-5 h-5 text-textDark"
                                                            strokeWidth={2}
                                                        />
                                                <span className="text-sm text-textDark">Quản lý dịch vụ</span>
                                            </Link>
                                        )}

                                        {(isSaleStaff || isAdmin) && (
                                            <Link
                                                to="/staff"
                                                onClick={() => setShowUserMenu(false)}
                                                        className="flex items-center space-x-3 px-4 py-2 hover:bg-softGray transition-colors"
                                            >
                                                        <ShoppingCartIcon
                                                            className="w-5 h-5 text-textDark"
                                                            strokeWidth={2}
                                                        />
                                                <span className="text-sm text-textDark">Bán hàng</span>
                                            </Link>
                                        )}

                                        <div className="border-t border-softGray mt-2 pt-2">
                                            <button
                                                onClick={handleLogout}
                                                        className="flex items-center space-x-3 px-4 py-2 w-full hover:bg-red-50 transition-colors"
                                            >
                                                        <ArrowRightOnRectangleIcon
                                                            className="w-5 h-5 text-red-600"
                                                            strokeWidth={2}
                                                        />
                                                <span className="text-sm text-red-600 font-medium">Đăng xuất</span>
                                            </button>
                                                </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            )}
                            </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="md:hidden p-2 rounded-image text-textDark hover:bg-white/50"
                        >
                            {showMobileMenu ? <XMarkIcon className="w-6 h-6" strokeWidth={2} /> : <Bars3Icon className="w-6 h-6" strokeWidth={2} />}
                        </button>
                    </div>
                </div>

                

                {/* Mobile Menu - Ẩn khi là Admin, SaleStaff, ServiceStaff */}
                {showMobileMenu && !isAdmin && !isSaleStaff && !isServiceStaff && (
                    <div className="md:hidden border-t border-textDark/10 py-4 space-y-3">
                        {/* Mobile Search */}
                        <form onSubmit={handleSearch} className="px-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm sản phẩm..."
                                    className="w-full px-4 py-2 pr-10 rounded-image border border-textDark/20 bg-white text-textDark"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary"
                                >
                                    <MagnifyingGlassIcon className="w-5 h-5" strokeWidth={2} />
                                </button>
                            </div>
                        </form>

                        {/* Mobile Navigation Links */}
                        <div className="space-y-1 px-4">
                            <Link to="/products" className="block py-2 text-textDark hover:text-primary transition-colors">Sản phẩm</Link>
                            <Link to="/services" className="block py-2 text-textDark hover:text-primary transition-colors">Dịch vụ</Link>
                            <Link to="/about" className="block py-2 text-textDark hover:text-primary transition-colors">Giới thiệu</Link>
                            <Link to="/contact" className="block py-2 text-textDark hover:text-primary transition-colors">Liên hệ</Link>
                        </div>

                        {!user && (
                            <div className="px-4 pt-4 border-t border-textDark/10 text-xs text-gray-600">
                                Chưa có tài khoản?{' '}
                                <Link to="/register" className="underline">
                                    Đăng ký ngay
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;