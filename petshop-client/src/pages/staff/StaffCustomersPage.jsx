import React, { useEffect, useState } from 'react';
import { fetchAllOrders, fetchOrderById } from '../../api/orderApi';
import { getAllServiceBookings } from '../../api/serviceBookingApi';
import { getAllUsers } from '../../api/userApi';
import { getProfileByUserId } from '../../api/profileApi';
import toast from 'react-hot-toast';
import { UserIcon, ShoppingBagIcon, EyeIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';

export default function StaffCustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [serviceCustomers, setServiceCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'high', 'low'
    const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'services'
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [customerOrders, setCustomerOrders] = useState([]);
    const [customerBookings, setCustomerBookings] = useState([]);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const [ordersRes, bookingsRes, usersRes] = await Promise.all([
                fetchAllOrders().catch(() => ({ data: { items: [] } })),
                getAllServiceBookings({ pageSize: 200 }).catch(() => ({ data: [] })),
                getAllUsers().catch(() => ({ data: [] }))
            ]);
            
            const orders = ordersRes.data?.items || ordersRes.data || [];
            const bookingsPayload = bookingsRes.data?.items || bookingsRes.data?.data || bookingsRes.data || [];
            const bookings = Array.isArray(bookingsPayload?.items)
                ? bookingsPayload.items
                : Array.isArray(bookingsPayload)
                    ? bookingsPayload
                    : [];
            const users = usersRes.data || [];
            
            // Process sales customers (from orders)
            const salesCustomerMap = new Map();
            const salesCustomerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];
            
            const salesProfilePromises = salesCustomerIds.map(async (customerId) => {
                try {
                    const profileRes = await getProfileByUserId(customerId);
                    return { customerId, profile: profileRes.data };
                } catch (error) {
                    console.error(`Error loading profile for ${customerId}:`, error);
                    return { customerId, profile: null };
                }
            });
            
            const salesProfiles = await Promise.all(salesProfilePromises);
            const salesProfileMap = new Map(salesProfiles.map(p => [p.customerId, p.profile]));
            
            orders.forEach(order => {
                const customerId = order.customerId;
                if (!customerId) return;
                
                if (!salesCustomerMap.has(customerId)) {
                    const user = users.find(u => u.id === customerId);
                    const profile = salesProfileMap.get(customerId);
                    
                    salesCustomerMap.set(customerId, {
                        id: customerId,
                        username: user?.username || profile?.username || 'Khách hàng',
                        email: user?.email || profile?.email || '—',
                        fullName: profile?.fullName || user?.username || 'Khách hàng',
                        phone: profile?.phone || '—',
                        orderCount: 0,
                        totalSpent: 0,
                        lastOrderDate: null,
                        orders: []
                    });
                }
                const customer = salesCustomerMap.get(customerId);
                customer.orderCount += 1;
                customer.totalSpent += order.total || 0;
                customer.orders.push(order);
                const orderDate = new Date(order.createdAt);
                if (!customer.lastOrderDate || orderDate > customer.lastOrderDate) {
                    customer.lastOrderDate = orderDate;
                }
            });
            
            // Process service customers (from bookings)
            const serviceCustomerMap = new Map();
            const serviceCustomerIds = [...new Set(bookings.map(b => b.customerId).filter(Boolean))];
            
            const serviceProfilePromises = serviceCustomerIds.map(async (customerId) => {
                try {
                    const profileRes = await getProfileByUserId(customerId);
                    return { customerId, profile: profileRes.data };
                } catch (error) {
                    console.error(`Error loading profile for ${customerId}:`, error);
                    return { customerId, profile: null };
                }
            });
            
            const serviceProfiles = await Promise.all(serviceProfilePromises);
            const serviceProfileMap = new Map(serviceProfiles.map(p => [p.customerId, p.profile]));
            
            bookings.forEach(booking => {
                const customerId = booking.customerId;
                if (!customerId) return;
                
                if (!serviceCustomerMap.has(customerId)) {
                    const user = users.find(u => u.id === customerId);
                    const profile = serviceProfileMap.get(customerId);
                    
                    serviceCustomerMap.set(customerId, {
                        id: customerId,
                        username: user?.username || profile?.username || 'Khách hàng',
                        email: user?.email || profile?.email || '—',
                        fullName: profile?.fullName || user?.username || booking.customerName || 'Khách hàng',
                        phone: profile?.phone || booking.customerPhone || '—',
                        bookingCount: 0,
                        totalSpent: 0,
                        lastBookingDate: null,
                        bookings: []
                    });
                }
                const customer = serviceCustomerMap.get(customerId);
                customer.bookingCount += 1;
                customer.totalSpent += booking.totalPrice || 0;
                customer.bookings.push(booking);
                const bookingDate = new Date(booking.startTime || booking.bookingDateTime || booking.createdAt);
                if (!customer.lastBookingDate || bookingDate > customer.lastBookingDate) {
                    customer.lastBookingDate = bookingDate;
                }
            });
            
            setCustomers(Array.from(salesCustomerMap.values()));
            setServiceCustomers(Array.from(serviceCustomerMap.values()));
        } catch (error) {
            console.error('Error loading customers:', error);
            toast.error('Không thể tải thông tin khách hàng');
        } finally {
            setLoading(false);
        }
    };

    const viewCustomerDetails = async (customer) => {
        setSelectedCustomer(customer);
        if (activeTab === 'sales') {
        setCustomerOrders(customer.orders || []);
            setCustomerBookings([]);
        } else {
            setCustomerBookings(customer.bookings || []);
            setCustomerOrders([]);
        }
        setShowDetailsModal(true);
    };

    const currentCustomers = activeTab === 'sales' ? customers : serviceCustomers;

    const filteredCustomers = currentCustomers.filter(customer => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch = (
                customer.fullName?.toLowerCase().includes(query) ||
                customer.username?.toLowerCase().includes(query) ||
                customer.email?.toLowerCase().includes(query) ||
                customer.phone?.toLowerCase().includes(query) ||
                customer.id?.toLowerCase().includes(query)
            );
            if (!matchesSearch) return false;
        }
        
        // Order/Booking count filter
        const count = activeTab === 'sales' ? customer.orderCount : customer.bookingCount;
        if (orderFilter === 'high') {
            if (count < 5) return false;
        } else if (orderFilter === 'low') {
            if (count >= 5) return false;
        }
        
        return true;
    });

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Khách hàng</h1>
                    <p className="text-gray-600 dark:text-gray-400">Xem thông tin khách hàng thân thiết</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm khách hàng..."
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <select
                        value={orderFilter}
                        onChange={(e) => setOrderFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tất cả</option>
                        <option value="high">Khách hàng thân thiết (≥5 {activeTab === 'sales' ? 'đơn' : 'lịch'})</option>
                        <option value="low">Khách hàng mới (&lt;5 {activeTab === 'sales' ? 'đơn' : 'lịch'})</option>
                    </select>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setOrderFilter('all');
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                    >
                        Đặt lại
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('sales')}
                            className={`px-6 py-3 text-sm font-medium transition-colors ${
                                activeTab === 'sales'
                                    ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <ShoppingBagIcon className="w-5 h-5 inline mr-2" />
                            Bán hàng
                        </button>
                        <button
                            onClick={() => setActiveTab('services')}
                            className={`px-6 py-3 text-sm font-medium transition-colors ${
                                activeTab === 'services'
                                    ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <CalendarDaysIcon className="w-5 h-5 inline mr-2" />
                            Dịch vụ
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Không tìm thấy khách hàng nào.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Khách hàng</th>
                                    <th className="px-4 py-3 text-left">Email</th>
                                    <th className="px-4 py-3 text-left">{activeTab === 'sales' ? 'Số đơn hàng' : 'Số lịch hẹn'}</th>
                                    <th className="px-4 py-3 text-left">Tổng chi tiêu</th>
                                    <th className="px-4 py-3 text-left">{activeTab === 'sales' ? 'Đơn hàng gần nhất' : 'Lịch hẹn gần nhất'}</th>
                                    <th className="px-4 py-3 text-left">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="w-5 h-5 text-gray-400" />
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {customer.fullName || customer.username || 'Khách hàng'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {customer.email && customer.email !== 'N/A' ? customer.email : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {activeTab === 'sales' ? (
                                                <ShoppingBagIcon className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                                                )}
                                                <span>{activeTab === 'sales' ? customer.orderCount : customer.bookingCount}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {customer.totalSpent.toLocaleString('vi-VN')} ₫
                                        </td>
                                        <td className="px-4 py-3">
                                            {activeTab === 'sales' 
                                                ? (customer.lastOrderDate 
                                                ? customer.lastOrderDate.toLocaleDateString('vi-VN')
                                                    : '-')
                                                : (customer.lastBookingDate 
                                                    ? customer.lastBookingDate.toLocaleDateString('vi-VN')
                                                    : '-')
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button
                                                variant="secondary"
                                                onClick={() => viewCustomerDetails(customer)}
                                                className="px-3 py-1 text-sm"
                                            >
                                                <EyeIcon className="w-4 h-4 inline mr-1" />
                                                Chi tiết
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Customer Details Modal */}
            {showDetailsModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold">Chi tiết khách hàng</h2>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Thông tin khách hàng</h3>
                                    <p><strong>Họ và tên:</strong> {selectedCustomer.fullName || selectedCustomer.username || '—'}</p>
                                    <p><strong>Tên đăng nhập:</strong> {selectedCustomer.username || '—'}</p>
                                    <p><strong>Email:</strong> {selectedCustomer.email && selectedCustomer.email !== 'N/A' ? selectedCustomer.email : '—'}</p>
                                    <p><strong>Số điện thoại:</strong> {selectedCustomer.phone && selectedCustomer.phone !== '—' ? selectedCustomer.phone : '—'}</p>
                                    <p><strong>{activeTab === 'sales' ? 'Số đơn hàng' : 'Số lịch hẹn'}:</strong> {activeTab === 'sales' ? selectedCustomer.orderCount : selectedCustomer.bookingCount}</p>
                                    <p><strong>Tổng chi tiêu:</strong> {selectedCustomer.totalSpent.toLocaleString('vi-VN')} ₫</p>
                                    <p><strong>{activeTab === 'sales' ? 'Đơn hàng gần nhất' : 'Lịch hẹn gần nhất'}:</strong> {
                                        activeTab === 'sales' 
                                            ? (selectedCustomer.lastOrderDate?.toLocaleDateString('vi-VN') || '—')
                                            : (selectedCustomer.lastBookingDate?.toLocaleDateString('vi-VN') || '—')
                                    }</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">{activeTab === 'sales' ? 'Lịch sử đơn hàng' : 'Lịch sử lịch hẹn'}</h3>
                                    <div className="space-y-2">
                                        {activeTab === 'sales' ? (
                                            customerOrders.length === 0 ? (
                                            <p className="text-gray-500">Chưa có đơn hàng nào</p>
                                        ) : (
                                            customerOrders.map((order) => (
                                                <div key={order.id} className="border-b pb-2">
                                                    <div className="flex justify-between">
                                                        <div>
                                                            <p className="font-medium">Đơn hàng {order.orderCode || order.posCode || 'Chưa có mã'}</p>
                                                            <p className="text-sm text-gray-500">
                                                                {new Date(order.createdAt).toLocaleString('vi-VN')}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-medium">{order.total?.toLocaleString('vi-VN')} ₫</p>
                                                            <p className={`text-xs ${
                                                                order.status === 'Completed' || order.status === 'Delivered' ? 'text-green-600' :
                                                                order.status === 'Cancelled' ? 'text-red-600' :
                                                                'text-yellow-600'
                                                            }`}>
                                                                {order.status}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                            )
                                        ) : (
                                            customerBookings.length === 0 ? (
                                                <p className="text-gray-500">Chưa có lịch hẹn nào</p>
                                            ) : (
                                                customerBookings.map((booking) => (
                                                    <div key={booking.id} className="border-b pb-2">
                                                        <div className="flex justify-between">
                                                            <div>
                                                                <p className="font-medium">Lịch hẹn {booking.bookingCode || `#${booking.id}`}</p>
                                                                <p className="text-sm text-gray-500">
                                                                    {new Date(booking.startTime || booking.bookingDateTime || booking.createdAt).toLocaleString('vi-VN')}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-medium">{(booking.totalPrice || 0).toLocaleString('vi-VN')} ₫</p>
                                                                <p className={`text-xs ${
                                                                    (booking.status || '').toLowerCase() === 'completed' ? 'text-green-600' :
                                                                    (booking.status || '').toLowerCase() === 'cancelled' ? 'text-red-600' :
                                                                    'text-yellow-600'
                                                                }`}>
                                                                    {booking.status || 'Pending'}
                                                                </p>
                                                                <p className={`text-xs mt-1 ${
                                                                    (booking.paymentStatus || '').toLowerCase() === 'paid' ? 'text-green-600' : 'text-yellow-600'
                                                                }`}>
                                                                    {(booking.paymentStatus || '').toLowerCase() === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

