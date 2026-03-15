import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllUsers, updateUserRole, deleteUser } from '../../api/userApi';
import toast from 'react-hot-toast';
import { UserIcon, ShieldCheckIcon, UserCircleIcon, TrashIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

export default function ManageUsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'staff'

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await getAllUsers();
            setUsers(response.data || []);
        } catch (error) {
            console.error('Error loading users:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                toast.error('Bạn không có quyền xem danh sách người dùng');
            } else {
                toast.error('Không thể tải danh sách người dùng');
            }
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        const loadingToast = toast.loading('Đang cập nhật role...');
        try {
            await updateUserRole(userId, newRole);
            toast.success('Cập nhật role thành công!', { id: loadingToast });
            await loadUsers(); // Reload users to get updated roles
        } catch (error) {
            console.error('Error updating user role:', error);
            const errorMsg = error.response?.data?.error || 'Không thể cập nhật role';
            toast.error(errorMsg, { id: loadingToast });
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
        
        const loadingToast = toast.loading('Đang xóa người dùng...');
        try {
            await deleteUser(userId);
            toast.success('Xóa người dùng thành công!', { id: loadingToast });
            await loadUsers(); // Reload users
        } catch (error) {
            console.error('Error deleting user:', error);
            const errorMsg = error.response?.data?.error || 'Không thể xóa người dùng';
            toast.error(errorMsg, { id: loadingToast });
        }
    };

    const getRoleBadge = (role) => {
        const roleMap = {
            'Admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
            'ServiceStaff': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
            'SaleStaff': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
            'User': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        };
        return roleMap[role] || 'bg-gray-100 text-gray-800';
    };

    // Filter users based on active tab
    const filteredUsers = (users || []).filter(user => {
        if (!user) return false;
        
        // Filter by tab
        if (activeTab === 'users') {
            // Only show User role, exclude Admin
            if (user.role !== 'User' && user.role !== 'user') {
                return false;
            }
        } else if (activeTab === 'staff') {
            // Only show staff roles (ServiceStaff, SaleStaff), exclude Admin
            const staffRoles = ['ServiceStaff', 'SaleStaff', 'servicestaff', 'salestaff'];
            if (!staffRoles.includes(user.role)) {
                return false;
            }
        }
        
        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (!user.username?.toLowerCase().includes(query) && 
                !user.email?.toLowerCase().includes(query)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Count users by category
    const userCount = (users || []).filter(u => u.role === 'User' || u.role === 'user').length;
    const staffCount = (users || []).filter(u => {
        const staffRoles = ['ServiceStaff', 'SaleStaff', 'servicestaff', 'salestaff'];
        return staffRoles.includes(u.role);
    }).length;

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý người dùng</h1>
                    <p className="text-gray-600 dark:text-gray-400">Quản lý tài khoản và phân quyền người dùng</p>
                </div>
            </header>


            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'users'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            <UserIcon className="w-5 h-5" />
                            Người dùng
                            {userCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                    {userCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('staff')}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'staff'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            <BriefcaseIcon className="w-5 h-5" />
                            Nhân viên
                            {staffCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                    {staffCount}
                                </span>
                            )}
                        </button>
                    </nav>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm theo tên, email..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        {(users || []).length === 0 
                            ? 'Chưa có dữ liệu người dùng.'
                            : 'Không tìm thấy người dùng nào phù hợp.'
                        }
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Người dùng</th>
                                    <th className="px-4 py-3 text-left">Email</th>
                                    <th className="px-4 py-3 text-left">Role</th>
                                    <th className="px-4 py-3 text-left">Ngày tạo</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <UserCircleIcon className="w-5 h-5 text-gray-400" />
                                                <span className="font-medium">{user.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={user.role || 'User'}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className={`px-2 py-1 rounded text-xs font-medium border-0 ${getRoleBadge(user.role || 'User')}`}
                                            >
                                                {activeTab === 'users' ? (
                                                    <>
                                                        <option value="User">User</option>
                                                        <option value="SaleStaff">Sale Staff</option>
                                                        <option value="ServiceStaff">Service Staff</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="SaleStaff">Sale Staff</option>
                                                        <option value="ServiceStaff">Service Staff</option>
                                                        <option value="User">User</option>
                                                    </>
                                                )}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                {user.id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Xóa người dùng"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

