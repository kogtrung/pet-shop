import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    CalendarDaysIcon,
    CheckCircleIcon,
    ClockIcon,
    CurrencyDollarIcon,
    MagnifyingGlassIcon,
    CreditCardIcon,
    XMarkIcon,
    EyeIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';
import { getAllServiceBookings, markBookingAsPaid } from '../../api/serviceBookingApi';

const QR_METHODS = ['MOMO_QR', 'VNPAY_QR', 'VIETQR'];

const formatCurrency = (value) => `${(value || 0).toLocaleString('vi-VN')} ₫`;

const getVietnameseStatus = (status) => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
        case 'pending':
            return 'Chờ xác nhận';
        case 'confirmed':
            return 'Đã xác nhận';
        case 'assigned':
            return 'Đã phân công';
        case 'inprogress':
            return 'Đang làm';
        case 'completed':
            return 'Hoàn thành';
        case 'cancelled':
            return 'Đã hủy';
        case 'rejected':
            return 'Từ chối';
        default:
            return status || 'Chờ xác nhận';
    }
};

export default function StaffServicePaymentsPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewFilter, setViewFilter] = useState('pending'); // pending | paid | all
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [detailBooking, setDetailBooking] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [paymentInfo, setPaymentInfo] = useState(null);
    const [paymentQRCode, setPaymentQRCode] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    useEffect(() => {
        loadBookings();
    }, []);

    useEffect(() => {
        if (showPaymentModal && selectedBooking) {
            handlePaymentVisuals(paymentMethod, selectedBooking);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentMethod, selectedBooking, showPaymentModal]);

    const loadBookings = async () => {
        setLoading(true);
        try {
            const response = await getAllServiceBookings({ pageSize: 200 });
            const payload = response.data?.items || response.data?.data || response.data || [];
            const normalized = Array.isArray(payload?.items)
                ? payload.items
                : Array.isArray(payload)
                    ? payload
                    : [];
            setBookings(normalized);
        } catch (error) {
            console.error('Error loading service bookings', error);
            toast.error('Không thể tải danh sách lịch hẹn');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, viewFilter]);

    const stats = useMemo(() => {
        const paidBookings = bookings.filter(b => (b.paymentStatus || '').toLowerCase() === 'paid');
        const pendingPayment = bookings.filter(
            b => (b.status || '').toLowerCase() === 'completed' && (b.paymentStatus || '').toLowerCase() !== 'paid'
        );

        return {
            total: bookings.length,
            completed: bookings.filter(b => (b.status || '').toLowerCase() === 'completed').length,
            paid: paidBookings.length,
            pendingPayment: pendingPayment.length,
            revenue: paidBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
            recentPaid: paidBookings
                .slice()
                .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
                .slice(0, 5)
        };
    }, [bookings]);

    const filteredBookings = bookings
        .filter(booking => {
            if (viewFilter === 'pending') {
                return (booking.status || '').toLowerCase() === 'completed' &&
                    (booking.paymentStatus || '').toLowerCase() !== 'paid';
            }
            if (viewFilter === 'paid') {
                return (booking.paymentStatus || '').toLowerCase() === 'paid';
            }
            return true;
        })
        .filter(booking => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase();
            return (
                booking.bookingCode?.toLowerCase().includes(query) ||
                booking.customerName?.toLowerCase().includes(query) ||
                booking.customerPhone?.toLowerCase().includes(query) ||
                booking.id.toString().includes(query)
            );
        })
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
    const currentSafePage = Math.min(currentPage, totalPages);
    const pageStart = (currentSafePage - 1) * pageSize;
    const paginatedBookings = filteredBookings.slice(pageStart, pageStart + pageSize);

    const handlePaymentVisuals = (method, booking) => {
        if (!booking) return;
        if (!QR_METHODS.includes(method)) {
            setPaymentInfo(null);
            setPaymentQRCode('');
            return;
        }

        const total = booking.totalPrice || 0;
        const momoAccount = '0901234567';
        const bankAccount = '9704221234567890';

        const paymentMethods = {
            'MOMO_QR': {
                name: 'Momo QR',
                accountName: 'PET SHOP',
                accountNumber: momoAccount,
                qrData: `2|99|${momoAccount}||0|0|${total}|${booking.customerName || 'Khach hang'}|${Date.now()}`,
                bankName: 'MoMo'
            },
            'VNPAY_QR': {
                name: 'VNPay QR',
                accountName: 'PET SHOP',
                accountNumber: bankAccount,
                qrData: `00020101021238570010A00000072701270006${bankAccount}0208QRIBFTTA53037045405${total}5802VN62120812Thanh toan6304`,
                bankName: 'Vietcombank'
            },
            'VIETQR': {
                name: 'VietQR',
                accountName: 'PET SHOP',
                accountNumber: bankAccount,
                qrData: `00020101021238570010A00000072701270006${bankAccount}0208QRIBFTTA53037045405${total}5802VN62120812Thanh toan6304`,
                bankName: 'Vietcombank'
            }
        };

        const info = paymentMethods[method];
        setPaymentInfo(info);
        const qrData = encodeURIComponent(info.qrData);
        setPaymentQRCode(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`);
    };

    const openPaymentModal = (booking) => {
        setSelectedBooking(booking);
        setPaymentMethod('COD');
        setPaymentInfo(null);
        setPaymentQRCode('');
        setShowPaymentModal(true);
    };

    const closePaymentModal = () => {
        setShowPaymentModal(false);
        setSelectedBooking(null);
        setPaymentInfo(null);
        setPaymentQRCode('');
        setProcessingPayment(false);
    };

    const handleConfirmPayment = async () => {
        if (!selectedBooking) return;
        setProcessingPayment(true);
        try {
            await markBookingAsPaid(selectedBooking.id);
            const paidBooking = {
                ...selectedBooking,
                paymentStatus: 'Paid',
                paymentMethod,
                updatedAt: new Date().toISOString()
            };
            toast.success('Đã xác nhận thanh toán dịch vụ');
            setBookings(prev =>
                prev.map(b =>
                    b.id === selectedBooking.id
                        ? { ...b, paymentStatus: 'Paid', updatedAt: paidBooking.updatedAt }
                        : b
                )
            );
            handlePrintServiceInvoice(paidBooking);
            closePaymentModal();
        } catch (error) {
            console.error('Failed to confirm service payment', error);
            toast.error('Không thể xác nhận thanh toán');
        } finally {
            setProcessingPayment(false);
        }
    };

    const renderPaymentMethodContent = () => {
        if (paymentMethod === 'COD') {
            return (
                <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-5xl mb-3">💵</div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Nhận tiền mặt trực tiếp
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Xác nhận sau khi đã thu đủ tiền từ khách hàng.
                    </p>
                </div>
            );
        }

        if (paymentMethod === 'CREDIT_CARD') {
            return (
                <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-5xl mb-3">💳</div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Thanh toán qua máy POS
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Quẹt thẻ và đợi xác nhận từ thiết bị POS.
                    </p>
                </div>
            );
        }

        if (paymentInfo) {
            return (
                <div className="space-y-4">
                    <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Quét mã QR để thanh toán
                        </p>
                        {paymentQRCode && (
                            <img
                                src={paymentQRCode}
                                alt="QR Code"
                                className="mx-auto w-48 h-48 border border-gray-200 dark:border-gray-600 rounded-lg"
                            />
                        )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Ngân hàng</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{paymentInfo.bankName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Chủ tài khoản</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{paymentInfo.accountName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Số tài khoản</span>
                            <span className="font-mono text-gray-900 dark:text-white">{paymentInfo.accountNumber}</span>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    const handlePrintServiceInvoice = (booking) => {
        if (!booking) return;
        const paymentMethodText = {
            'COD': 'Tiền mặt',
            'MOMO_QR': 'Momo QR',
            'VNPAY_QR': 'VNPay QR',
            'VIETQR': 'VietQR (Chuyển khoản)',
            'CREDIT_CARD': 'Thẻ (POS quẹt thẻ)',
            'BANK_TRANSFER': 'Chuyển khoản'
        };
        const paymentText = paymentMethodText[paymentMethod] || paymentMethod;

        const printWindow = window.open('', '_blank');
        
        // Group services by serviceName
        const groupedServices = (booking.bookingItems || []).reduce((acc, item) => {
            const serviceName = item.serviceName || 'Dịch vụ';
            if (!acc[serviceName]) {
                acc[serviceName] = [];
            }
            acc[serviceName].push(item);
            return acc;
        }, {});

        const servicesRows = Object.entries(groupedServices)
            .map(([serviceName, items]) => {
                const totalPrice = items.reduce((sum, item) => sum + (item.priceAtBooking || item.packagePrice || item.servicePackagePrice || 0), 0);
                const packageNames = items.map(item => item.servicePackageName || '—').filter(Boolean).join(', ');
                return `
                    <tr>
                        <td class="product-name">${serviceName}${items.length > 1 ? ` (${items.length})` : ''}${packageNames ? ` - ${packageNames}` : ''}</td>
                        <td class="quantity">${items.length}</td>
                        <td class="price">${(totalPrice / items.length).toLocaleString('vi-VN')} ₫</td>
                        <td class="price">${totalPrice.toLocaleString('vi-VN')} ₫</td>
                    </tr>
                `;
            })
            .join('');

        const invoiceContent = `
            <html>
                <head>
                    <title>Hóa đơn ${booking.bookingCode || booking.id || 'Chưa có mã'}</title>
                    <style>
                        @media print {
                            @page { margin: 10mm; size: 80mm auto; }
                            body { margin: 0; padding: 10px; font-size: 12px; }
                        }
                        body { font-family: 'Courier New', monospace; padding: 20px; max-width: 80mm; margin: 0 auto; }
                        .header { text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                        .header h1 { margin: 0; font-size: 18px; font-weight: bold; }
                        .header h2 { margin: 5px 0; font-size: 14px; }
                        .info { margin-bottom: 15px; font-size: 11px; line-height: 1.6; }
                        .info p { margin: 3px 0; }
                        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
                        th, td { padding: 5px 3px; text-align: left; border-bottom: 1px dashed #ddd; }
                        th { font-weight: bold; border-bottom: 2px solid #000; }
                        .product-name { max-width: 40%; word-wrap: break-word; }
                        .quantity { text-align: center; width: 15%; }
                        .price { text-align: right; width: 22%; }
                        .total-row { text-align: right; font-weight: bold; }
                        .summary { margin-top: 15px; padding-top: 10px; border-top: 2px dashed #000; }
                        .summary-line { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
                        .summary-total { font-size: 16px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000; }
                        .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px dashed #000; font-size: 11px; }
                        .divider { border-top: 1px dashed #000; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>PET SHOP</h1>
                        <h2>HÓA ĐƠN DỊCH VỤ</h2>
                    </div>
                    <div class="info">
                        <p><strong>Mã hóa đơn:</strong> ${booking.bookingCode || `SVC-${booking.id}` || 'Chưa có mã'}</p>
                        <p><strong>Ngày giờ:</strong> ${new Date(booking.startTime || booking.createdAt).toLocaleString('vi-VN')}</p>
                        <div class="divider"></div>
                        <p><strong>Khách hàng:</strong> ${booking.customerName || '—'}</p>
                        ${booking.customerPhone ? `<p><strong>SĐT:</strong> ${booking.customerPhone}</p>` : ''}
                        <div class="divider"></div>
                        <p><strong>Phương thức thanh toán:</strong> ${paymentText}</p>
                        <p><strong>Trạng thái:</strong> Đã thanh toán</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th class="product-name">Dịch vụ</th>
                                <th class="quantity">SL</th>
                                <th class="price">Đơn giá</th>
                                <th class="price">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${servicesRows}
                        </tbody>
                    </table>
                    <div class="summary">
                        <div class="summary-line">
                            <span>Tạm tính:</span>
                            <span>${(booking.totalPrice || 0).toLocaleString('vi-VN')} ₫</span>
                        </div>
                        <div class="summary-total">
                            <div class="summary-line">
                                <span>TỔNG CỘNG:</span>
                                <span>${(booking.totalPrice || 0).toLocaleString('vi-VN')} ₫</span>
                            </div>
                        </div>
                    </div>
                    <div class="footer">
                        <p><strong>Cảm ơn quý khách!</strong></p>
                        <p>Hẹn gặp lại</p>
                    </div>
                    <div class="divider"></div>
                    <p style="text-align: center; font-size: 10px; color: #666;">Hóa đơn được tạo bởi hệ thống POS</p>
                </body>
            </html>
        `;
        printWindow.document.write(invoiceContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Thanh toán dịch vụ</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Xử lý thanh toán cho các lịch hẹn dịch vụ đã hoàn thành
                    </p>
                </div>
                <Button onClick={loadBookings} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5">
                    Làm mới dữ liệu
                </Button>
            </header>

            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo mã lịch, tên hoặc số điện thoại..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: 'pending', label: 'Chờ thanh toán' },
                        { key: 'paid', label: 'Đã thanh toán' },
                        { key: 'all', label: 'Tất cả lịch' }
                    ].map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => setViewFilter(filter.key)}
                            className={`px-4 py-2 rounded-full text-sm font-medium ${
                                viewFilter === filter.key
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                            }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                        Không có lịch hẹn phù hợp với điều kiện lọc hiện tại.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Mã lịch</th>
                                    <th className="px-4 py-3 text-left">Khách hàng</th>
                                    <th className="px-4 py-3 text-left">Dịch vụ</th>
                                    <th className="px-4 py-3 text-left">Trạng thái</th>
                                    <th className="px-4 py-3 text-left">Thanh toán</th>
                                    <th className="px-4 py-3 text-right">Tổng tiền</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedBookings.map(booking => (
                                    <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 font-medium">{booking.bookingCode || `#${booking.id}`}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-gray-900 dark:text-white">{booking.customerName}</div>
                                            <div className="text-xs text-gray-500">{booking.customerPhone}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm">
                                                {(() => {
                                                    // Group items by serviceName
                                                    const grouped = (booking.bookingItems || []).reduce((acc, item) => {
                                                        const serviceName = item.serviceName || 'Dịch vụ';
                                                        if (!acc[serviceName]) {
                                                            acc[serviceName] = [];
                                                        }
                                                        acc[serviceName].push(item);
                                                        return acc;
                                                    }, {});
                                                    
                                                    const serviceNames = Object.keys(grouped);
                                                    const displayCount = Math.min(2, serviceNames.length);
                                                    
                                                    return (
                                                        <>
                                                            {serviceNames.slice(0, displayCount).map((serviceName, idx) => {
                                                                const items = grouped[serviceName];
                                                                const count = items.length;
                                                                return (
                                                                    <div key={idx} className="text-gray-800 dark:text-gray-200">
                                                                        {serviceName}
                                                                        {count > 1 && (
                                                                            <span className="text-xs text-gray-500 ml-1">({count})</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {serviceNames.length > displayCount && (
                                                                <div className="text-xs text-gray-500">+{serviceNames.length - displayCount} dịch vụ khác</div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                (booking.status || '').toLowerCase() === 'completed'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : (booking.status || '').toLowerCase() === 'assigned'
                                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                                    : (booking.status || '').toLowerCase() === 'inprogress'
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : (booking.status || '').toLowerCase() === 'rejected'
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    : (booking.status || '').toLowerCase() === 'cancelled'
                                                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                                {getVietnameseStatus(booking.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                (booking.paymentStatus || '').toLowerCase() === 'paid'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {(booking.paymentStatus || '').toLowerCase() === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                                            {formatCurrency(booking.totalPrice)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setDetailBooking(booking);
                                                        setShowDetailModal(true);
                                                    }}
                                                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group relative"
                                                >
                                                    <EyeIcon className="w-5 h-5" />
                                                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                        Xem chi tiết
                                                    </span>
                                                </button>
                                                {(booking.status || '').toLowerCase() === 'completed' && (booking.paymentStatus || '').toLowerCase() !== 'paid' ? (
                                                    <Button
                                                        onClick={() => openPaymentModal(booking)}
                                                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                                                    >
                                                        <CreditCardIcon className="w-4 h-4" />
                                                        Thanh toán
                                                    </Button>
                                                ) : (
                                                    <span className={`text-xs font-medium ${ (booking.paymentStatus || '').toLowerCase() === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                                        {(booking.paymentStatus || '').toLowerCase() === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Hiển thị {filteredBookings.length === 0 ? 0 : pageStart + 1}-
                                {Math.min(pageStart + pageSize, filteredBookings.length)} trong tổng số {filteredBookings.length} lịch
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentSafePage === 1}
                                    className={`p-2 rounded-lg border ${
                                        currentSafePage === 1
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    Trang {currentSafePage}/{totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentSafePage === totalPages}
                                    className={`p-2 rounded-lg border ${
                                        currentSafePage === totalPages
                                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Recent payments */}
            {stats.recentPaid.length > 0 && (
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Thanh toán gần đây</h2>
                    <div className="space-y-3">
                        {stats.recentPaid.map(item => (
                            <div key={item.id} className="flex items-center justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{item.bookingCode || `#${item.id}`}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.customerName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-indigo-600 dark:text-indigo-400">{formatCurrency(item.totalPrice)}</p>
                                    <p className="text-xs text-gray-500">{new Date(item.updatedAt || item.createdAt).toLocaleString('vi-VN')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedBooking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
                        <div className="p-6 space-y-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Thanh toán dịch vụ</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {selectedBooking.bookingCode || `#${selectedBooking.id}`} • {selectedBooking.customerName}
                                    </p>
                                </div>
                                <button onClick={closePaymentModal} className="text-gray-500 hover:text-gray-700">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Số tiền cần thanh toán</p>
                                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {formatCurrency(selectedBooking.totalPrice)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Phương thức thanh toán
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                    <option value="COD">💵 Tiền mặt</option>
                                    <option value="CREDIT_CARD">💳 Quẹt thẻ</option>
                                    <option value="MOMO_QR">📱 Momo QR</option>
                                    <option value="VNPAY_QR">🏦 VNPay QR</option>
                                    <option value="VIETQR">🏧 VietQR</option>
                                </select>
                            </div>

                            {renderPaymentMethodContent()}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handleConfirmPayment}
                                    disabled={processingPayment}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {processingPayment ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                                </Button>
                                <Button onClick={closePaymentModal} variant="secondary" className="px-4 py-2 text-gray-700">
                                    Đóng
                                </Button>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-200 text-center">
                                <strong>Chế độ demo:</strong> Sau khi xác nhận, hệ thống tự đánh dấu lịch hẹn là đã thanh toán.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && detailBooking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Chi tiết lịch hẹn {detailBooking.bookingCode || `#${detailBooking.id}`}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {detailBooking.customerName || '—'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setDetailBooking(null);
                                    setShowDetailModal(false);
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status & Info */}
                            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        (detailBooking.status || '').toLowerCase() === 'completed'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : (detailBooking.status || '').toLowerCase() === 'assigned'
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                            : (detailBooking.status || '').toLowerCase() === 'inprogress'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : (detailBooking.status || '').toLowerCase() === 'rejected'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            : (detailBooking.status || '').toLowerCase() === 'cancelled'
                                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                        {getVietnameseStatus(detailBooking.status)}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        (detailBooking.paymentStatus || '').toLowerCase() === 'paid'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                        {(detailBooking.paymentStatus || '').toLowerCase() === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                    </span>
                                </div>
                            </div>

                            {/* Order Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ngày đặt</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                        {detailBooking.createdAt ? new Date(detailBooking.createdAt).toLocaleString('vi-VN') : '—'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Thời gian hẹn</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                                        {detailBooking.startTime ? new Date(detailBooking.startTime).toLocaleString('vi-VN') : '—'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Khách hàng</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{detailBooking.customerName || '—'}</p>
                                    {detailBooking.customerPhone && (
                                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{detailBooking.customerPhone}</p>
                                    )}
                                    {detailBooking.customerEmail && (
                                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{detailBooking.customerEmail}</p>
                                    )}
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Thú cưng</label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{detailBooking.petName || '—'}</p>
                                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                        {detailBooking.petType || '—'} {detailBooking.petBreed ? `- ${detailBooking.petBreed}` : ''}
                                    </p>
                                    {(detailBooking.petAge || detailBooking.petWeight) && (
                                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                            {detailBooking.petAge ? `${detailBooking.petAge} tháng` : ''} {detailBooking.petWeight ? `• ${detailBooking.petWeight}kg` : ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Services */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    Dịch vụ đã đặt ({(detailBooking.bookingItems || []).length})
                                </h3>
                                <div className="space-y-4 max-h-80 overflow-y-auto">
                                    {(() => {
                                        // Group items by serviceName
                                        const grouped = (detailBooking.bookingItems || []).reduce((acc, item) => {
                                            const serviceName = item.serviceName || 'Dịch vụ';
                                            if (!acc[serviceName]) {
                                                acc[serviceName] = [];
                                            }
                                            acc[serviceName].push(item);
                                            return acc;
                                        }, {});
                                        
                                        return Object.entries(grouped).map(([serviceName, items]) => (
                                            <div key={serviceName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                                                    <p className="font-semibold text-gray-900 dark:text-white">{serviceName}</p>
                                                    {items.length > 1 && (
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">({items.length} gói dịch vụ)</p>
                                                    )}
                                                </div>
                                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {items.map((item, idx) => (
                                                        <div key={idx} className="px-4 py-3 bg-white dark:bg-gray-800">
                                                            {item.assignedStaffName && (
                                                                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">
                                                                    Nhân viên: {item.assignedStaffName}
                                                                </p>
                                                            )}
                                                            {item.servicePackageName && (
                                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                    {item.servicePackageName}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center justify-between text-sm">
                                                                <div className="text-gray-500 dark:text-gray-400">
                                                                    Giá: {formatCurrency(item.priceAtBooking || item.packagePrice || item.servicePackagePrice || 0)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Tổng cộng:</span>
                                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {formatCurrency(detailBooking.totalPrice)}
                                    </span>
                                </div>
                            </div>

                            {/* Notes */}
                            {detailBooking.note && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Ghi chú</label>
                                    <p className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-900 dark:text-white">
                                        {detailBooking.note}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end">
                            <button
                                onClick={() => {
                                    setDetailBooking(null);
                                    setShowDetailModal(false);
                                }}
                                className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, title, value }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex items-center gap-4 border border-gray-100 dark:border-gray-700">
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    );
}

function DetailSection({ title, items }) {
    return (
        <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/40 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">{title}</h3>
            {items.map((item) => (
                <div key={item.label} className="text-sm text-gray-600 dark:text-gray-300 flex justify-between">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{item.value || '—'}</span>
                </div>
            ))}
        </div>
    );
}

