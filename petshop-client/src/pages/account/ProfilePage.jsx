import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProfile, updateProfile, changePassword, createProfile } from '../../api/profileApi';
import toast from 'react-hot-toast';
import {
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    PencilIcon,
    KeyIcon,
    CheckIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone: '',
        streetAddress: '',  // Số nhà, tên đường
        ward: '',           // Phường/Xã
        district: '',       // Quận/Huyện (không dùng nữa)
        city: '',           // Tỉnh/Thành phố
        fullName: '',
        setAsDefaultAddress: true  // Đặt làm địa chỉ mặc định
    });
    
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const response = await getProfile();
            setProfile(response.data);
            
            // Split address into parts (expects format: "street, ward, city")
            const addressParts = response.data.address ? response.data.address.split(',').map(s => s.trim()) : ['', '', ''];
            
            setFormData({
                username: response.data.username || '',
                email: response.data.email || '',
                phone: response.data.phone || '',
                streetAddress: addressParts[0] || '',
                ward: addressParts[1] || '',
                district: '', // Không dùng nữa
                city: addressParts[2] || '',
                fullName: response.data.fullName || '',
                setAsDefaultAddress: true  // Mặc định là true
            });
        } catch (error) {
            console.error('Error loading profile:', error);
            
            // Nếu profile không tồn tại (404), tạo profile mới
            if (error.response?.status === 404) {
                try {
                    await createProfile({
                        fullName: user?.username || '',
                        phone: '',
                        address: ''
                    });
                    toast.success('Đã tạo profile mới. Vui lòng tải lại trang.');
                    // Thử tải lại profile sau khi tạo
                    setTimeout(() => loadProfile(), 1000);
                } catch (createError) {
                    console.error('Error creating profile:', createError);
                    toast.error('Không thể tạo profile. Vui lòng liên hệ quản trị viên.');
                }
            } else {
                toast.error('Không thể tải thông tin tài khoản');
            }
        } finally {
            setLoading(false);
        }
    };

    const validateProfileForm = () => {
        const newErrors = {};
        
        if (!formData.email.trim()) {
            newErrors.email = 'Email là bắt buộc';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email không hợp lệ';
        }
        
        if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Số điện thoại không hợp lệ';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validatePasswordForm = () => {
        const newErrors = {};
        
        if (!passwordData.currentPassword) {
            newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
        }
        
        if (!passwordData.newPassword) {
            newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
        } else if (passwordData.newPassword.length < 6) {
            newErrors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự';
        }
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        
        if (!validateProfileForm()) {
            toast.error('Vui lòng kiểm tra lại thông tin');
            return;
        }

        const loadingToast = toast.loading('Đang cập nhật...');

        try {
            // Combine address parts into single address string (bỏ district)
            const combinedAddress = [
                formData.streetAddress,
                formData.ward,
                formData.city
            ].filter(part => part.trim()).join(', ');

            const updateData = {
                email: formData.email,
                // Gửi fullName và phone ngay cả khi rỗng để backend có thể xử lý
                fullName: formData.fullName?.trim() || '',
                phone: formData.phone?.trim() || '',
                address: combinedAddress || ''
            };

            await updateProfile(updateData);
            
            toast.success('Cập nhật thông tin thành công!', { id: loadingToast });
            setEditing(false);
            loadProfile();
            
            // Update auth context if needed
            if (updateUser) {
                updateUser({ ...user, ...updateData });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            
            if (error.response?.data?.errors) {
                const apiErrors = error.response.data.errors;
                const errorMessages = Object.entries(apiErrors)
                    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                    .join('\n');
                toast.error(`Lỗi: ${errorMessages}`, { id: loadingToast, duration: 5000 });
            } else {
                toast.error('Không thể cập nhật thông tin', { id: loadingToast });
            }
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        
        if (!validatePasswordForm()) {
            toast.error('Vui lòng kiểm tra lại thông tin');
            return;
        }

        const loadingToast = toast.loading('Đang đổi mật khẩu...');

        try {
            await changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            
            toast.success('Đổi mật khẩu thành công!', { id: loadingToast });
            setChangingPassword(false);
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setErrors({});
        } catch (error) {
            console.error('Error changing password:', error);
            
            if (error.response?.data?.errors) {
                const apiErrors = error.response.data.errors;
                const errorMessages = Object.entries(apiErrors)
                    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                    .join('\n');
                toast.error(`Lỗi: ${errorMessages}`, { id: loadingToast, duration: 5000 });
            } else {
                toast.error(
                    error.response?.data?.message || 'Không thể đổi mật khẩu',
                    { id: loadingToast }
                );
            }
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 animate-pulse">
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-6"></div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 py-8">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-black to-gray-800 rounded-none shadow-soft p-8 text-white">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="p-4 bg-white/10 rounded-full">
                            <UserIcon className="w-16 h-16" strokeWidth={2} />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-2">Hồ sơ cá nhân</p>
                            <h1 className="text-3xl font-heading font-bold mb-1">{profile?.fullName || profile?.username || user?.username || 'Người dùng'}</h1>
                            <p className="text-white/80">{profile?.email || user?.email}</p>
                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/70">
                                <span>Tên đăng nhập: {profile?.username || user?.username || '—'}</span>
                                {profile?.phone && <span>Số điện thoại: {profile.phone}</span>}
                            </div>
                        </div>
                    </div>
                    {!editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="inline-flex items-center gap-2 px-6 py-2 border border-white text-white font-medium tracking-wide hover:bg-white hover:text-black transition-colors"
                        >
                            <PencilIcon className="w-4 h-4" strokeWidth={2} />
                            Chỉnh sửa
                        </button>
                    )}
                </div>
            </div>

            {/* Profile Information */}
            <div className="bg-white border border-gray-200 rounded-none shadow-sm p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-heading font-semibold text-textDark">Thông tin cá nhân</h2>
                    <p className="text-sm text-gray-500 mt-1">Quản lý chi tiết liên hệ và địa chỉ giao hàng của bạn.</p>
                </div>

                {editing ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Cột trái */}
                            <div>
                                <label className="block text-sm font-heading font-medium text-textDark mb-2">
                                    Họ và tên
                                </label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-4 py-2 rounded-image border border-textDark/20 bg-white text-textDark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Nguyễn Văn A"
                                />
                            </div>

                            {/* Cột phải */}
                            <div>
                                <label className="block text-sm font-heading font-medium text-textDark mb-2">
                                    Tên đăng nhập
                                </label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-200 bg-gray-100 text-textDark/50 cursor-not-allowed"
                                />
                                <p className="mt-1 text-xs text-textDark/50">Tên đăng nhập không thể thay đổi</p>
                            </div>

                            {/* Cột trái */}
                            <div>
                                <label className="block text-sm font-heading font-medium text-textDark mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className={`w-full px-4 py-2 rounded-image border ${
                                        errors.email ? 'border-red-500' : 'border-textDark/20'
                                    } bg-white text-textDark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                                    placeholder="email@example.com"
                                />
                                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                            </div>

                            {/* Cột phải */}
                            <div>
                                <label className="block text-sm font-heading font-medium text-textDark mb-2">
                                    Số điện thoại
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className={`w-full px-4 py-2 rounded-image border ${
                                        errors.phone ? 'border-red-500' : 'border-textDark/20'
                                    } bg-white text-textDark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                                    placeholder="0123456789"
                                />
                                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                            </div>
                        </div>

                        {/* Address Fields - Similar to Checkout */}
                        <div>
                            <label className="block text-sm font-heading font-medium text-textDark mb-2">
                                Địa chỉ *
                            </label>
                            <input
                                type="text"
                                value={formData.streetAddress}
                                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                                className="w-full px-4 py-2 rounded-image border border-textDark/20 bg-white text-textDark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="Số nhà, tên đường"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-heading font-medium text-textDark mb-2">
                                    Phường/Xã
                                </label>
                                <input
                                    type="text"
                                    value={formData.ward}
                                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                    className="w-full px-4 py-2 rounded-image border border-textDark/20 bg-white text-textDark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Phường/Xã"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-heading font-medium text-textDark mb-2">
                                    Tỉnh/Thành phố *
                                </label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-4 py-2 rounded-image border border-textDark/20 bg-white text-textDark focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Tỉnh/Thành phố"
                                />
                            </div>
                        </div>

                        {/* Checkbox đặt làm địa chỉ mặc định */}
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="setAsDefaultAddress"
                                checked={formData.setAsDefaultAddress}
                                onChange={(e) => setFormData({ ...formData, setAsDefaultAddress: e.target.checked })}
                                className="w-4 h-4 text-primary border-textDark/20 rounded focus:ring-primary"
                            />
                            <label htmlFor="setAsDefaultAddress" className="text-sm text-textDark">
                                Sử dụng địa chỉ này làm địa chỉ mặc định khi thanh toán đơn hàng
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditing(false);
                                    // Re-split the address when canceling (bỏ district)
                                    const addressParts = profile.address ? profile.address.split(',').map(s => s.trim()) : ['', '', ''];
                                    setFormData({
                                        username: profile.username || '',
                                        email: profile.email || '',
                                        phone: profile.phone || '',
                                        streetAddress: addressParts[0] || '',
                                        ward: addressParts[1] || '',
                                        district: '', // Không dùng nữa
                                        city: addressParts[2] || '',
                                        fullName: profile.fullName || '',
                                        setAsDefaultAddress: true
                                    });
                                    setErrors({});
                                }}
                                className="flex items-center gap-2 px-6 py-2 border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors font-semibold"
                            >
                                <XMarkIcon className="w-4 h-4" strokeWidth={2} />
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-6 py-2 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors font-semibold"
                            >
                                <CheckIcon className="w-4 h-4" strokeWidth={2} />
                                Lưu thay đổi
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Hàng 1 - Cột trái: Họ và tên */}
                        <div className="flex items-start gap-3">
                            <UserIcon className="w-5 h-5 text-gray-400 mt-1" />
                            <div>
                                <p className="text-sm text-gray-500">Họ và tên</p>
                                <p className="font-medium text-black">
                                    {profile?.fullName || user?.username || '—'}
                                </p>
                            </div>
                        </div>

                        {/* Hàng 1 - Cột phải: Tên đăng nhập */}
                        <div className="flex items-start gap-3">
                            <UserIcon className="w-5 h-5 text-gray-400 mt-1" />
                            <div>
                                <p className="text-sm text-gray-500">Tên đăng nhập</p>
                                <p className="font-medium text-black">
                                    {profile?.username || user?.username || '—'}
                                </p>
                            </div>
                        </div>

                        {/* Hàng 2 - Cột trái: Email */}
                        <div className="flex items-start gap-3">
                            <EnvelopeIcon className="w-5 h-5 text-gray-400 mt-1" />
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium text-black">
                                    {profile?.email || '—'}
                                </p>
                            </div>
                        </div>

                        {/* Hàng 2 - Cột phải: Số điện thoại */}
                        <div className="flex items-start gap-3">
                            <PhoneIcon className="w-5 h-5 text-gray-400 mt-1" />
                            <div>
                                <p className="text-sm text-gray-500">Số điện thoại</p>
                                <p className="font-medium text-black">
                                    {profile?.phone || '—'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 md:col-span-2">
                            <MapPinIcon className="w-5 h-5 text-gray-400 mt-1" />
                            <div>
                                <p className="text-sm text-gray-500">Địa chỉ đầy đủ</p>
                                <p className="font-medium text-black">
                                    {profile?.address || '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Change Password */}
            <div className="bg-white border border-gray-200 rounded-none shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-textDark mb-1">Đổi mật khẩu</h2>
                        <p className="text-sm text-gray-500">Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</p>
                    </div>
                    {!changingPassword && (
                        <button
                            onClick={() => setChangingPassword(true)}
                            className="flex items-center gap-2 px-4 py-2 border border-black bg-white text-black hover:bg-black hover:text-white transition-colors"
                        >
                            <KeyIcon className="w-4 h-4" />
                            Đổi mật khẩu
                        </button>
                    )}
                </div>

                {changingPassword && (
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mật khẩu hiện tại *
                            </label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                className={`w-full px-4 py-2 border ${
                                    errors.currentPassword ? 'border-red-500' : 'border-gray-300'
                                } focus:ring-2 focus:ring-black`}
                                placeholder="••••••••"
                            />
                            {errors.currentPassword && <p className="mt-1 text-sm text-red-500">{errors.currentPassword}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mật khẩu mới *
                            </label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className={`w-full px-4 py-2 border ${
                                    errors.newPassword ? 'border-red-500' : 'border-gray-300'
                                } focus:ring-2 focus:ring-black`}
                                placeholder="••••••••"
                            />
                            {errors.newPassword && <p className="mt-1 text-sm text-red-500">{errors.newPassword}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Xác nhận mật khẩu mới *
                            </label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className={`w-full px-4 py-2 border ${
                                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                                } focus:ring-2 focus:ring-black`}
                                placeholder="••••••••"
                            />
                            {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setChangingPassword(false);
                                    setPasswordData({
                                        currentPassword: '',
                                        newPassword: '',
                                        confirmPassword: ''
                                    });
                                    setErrors({});
                                }}
                                className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-textDark hover:bg-gray-100 transition-colors"
                            >
                                <XMarkIcon className="w-4 h-4" />
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-6 py-2 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors"
                            >
                                <CheckIcon className="w-4 h-4" />
                                Đổi mật khẩu
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
