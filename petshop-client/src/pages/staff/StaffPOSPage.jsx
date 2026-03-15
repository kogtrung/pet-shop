import React, { useEffect, useState } from 'react';
import { getProducts, fetchProducts } from '../../api/productApi';
import { createPOSOrder, createOrder } from '../../api/orderApi';
import { searchCustomers } from '../../api/userApi';
import { validatePromotion } from '../../api/promotionApi';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import { PlusIcon, MinusIcon, TrashIcon, PrinterIcon, ShoppingCartIcon, MagnifyingGlassIcon, XMarkIcon, TagIcon } from '@heroicons/react/24/outline';
import { getImageUrl, getProductImage } from '../../utils/imageUtils';

export default function StaffPOSPage() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null); // Khách hàng đã chọn
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [searchingCustomers, setSearchingCustomers] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [promotionCode, setPromotionCode] = useState('');
    const [appliedPromotion, setAppliedPromotion] = useState(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [validatingPromotion, setValidatingPromotion] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [createdOrder, setCreatedOrder] = useState(null);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentQRCode, setPaymentQRCode] = useState('');
    const [paymentInfo, setPaymentInfo] = useState(null);
    // Pagination and filtering
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 20; // 5 products per row x 4 rows
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [priceFilter, setPriceFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    useEffect(() => {
            loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const response = await getProducts({ pageSize: 100, isService: false });
            const productsList = response.data?.items || response.data || [];
            setProducts(productsList);
        } catch (error) {
            console.error('Error loading products:', error);
            toast.error('Không thể tải danh sách sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product) => {
        const existingItem = cart.find(item => item.productId === product.id);
        if (existingItem) {
            setCart(cart.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                productId: product.id,
                productName: product.name,
                unitPrice: product.salePrice || product.price,
                quantity: 1,
                imageUrl: getProductImage(product)
            }]);
        }
        toast.success('Đã thêm vào giỏ hàng');
    };

    const updateQuantity = (productId, delta) => {
        setCart(cart.map(item => {
            if (item.productId === productId) {
                const newQuantity = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.productId !== productId));
        toast.success('Đã xóa khỏi giỏ hàng');
    };

    const getSubTotal = () => {
        return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    };

    const getTotal = () => {
        const subTotal = getSubTotal();
        return Math.max(0, subTotal - discountAmount);
    };

    // Tìm kiếm khách hàng
    const handleSearchCustomers = async (query) => {
        setCustomerSearchQuery(query);
        if (!query || query.trim().length < 2) {
            setCustomerSearchResults([]);
            setShowCustomerSearch(false);
            return;
        }

        setSearchingCustomers(true);
        try {
            const response = await searchCustomers(query.trim());
            setCustomerSearchResults(response.data || []);
            setShowCustomerSearch(true);
        } catch (error) {
            console.error('Error searching customers:', error);
            setCustomerSearchResults([]);
        } finally {
            setSearchingCustomers(false);
        }
    };

    // Chọn khách hàng từ kết quả tìm kiếm
    const handleSelectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setCustomerName(customer.fullName || customer.username || customer.email || '');
        setCustomerPhone(customer.phone || '');
        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
        setShowCustomerSearch(false);
        toast.success('Đã chọn khách hàng');
    };

    // Xóa khách hàng đã chọn
    const handleClearCustomer = () => {
        setSelectedCustomer(null);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerSearchQuery('');
        setCustomerSearchResults([]);
        setShowCustomerSearch(false);
    };

    // Validate và áp dụng mã giảm giá
    const handleApplyPromotion = async () => {
        if (!promotionCode.trim()) {
            toast.error('Vui lòng nhập mã giảm giá');
            return;
        }

        const subTotal = getSubTotal();
        if (subTotal === 0) {
            toast.error('Giỏ hàng trống, không thể áp dụng mã giảm giá');
            return;
        }

        setValidatingPromotion(true);
        try {
            const response = await validatePromotion(
                promotionCode.trim(),
                subTotal,
                selectedCustomer?.id || null
            );

            const result = response.data;
            if (result.isValid) {
                setAppliedPromotion(result.promotion);
                setDiscountAmount(result.discountAmount);
                toast.success(`Áp dụng mã giảm giá thành công! Giảm ${result.discountAmount.toLocaleString('vi-VN')} ₫`);
            } else {
                setAppliedPromotion(null);
                setDiscountAmount(0);
                toast.error(result.errorMessage || 'Mã giảm giá không hợp lệ');
            }
        } catch (error) {
            console.error('Error validating promotion:', error);
            setAppliedPromotion(null);
            setDiscountAmount(0);
            toast.error('Không thể kiểm tra mã giảm giá. Vui lòng thử lại.');
        } finally {
            setValidatingPromotion(false);
        }
    };

    // Xóa mã giảm giá
    const handleRemovePromotion = () => {
        setPromotionCode('');
        setAppliedPromotion(null);
        setDiscountAmount(0);
        toast.success('Đã xóa mã giảm giá');
    };

    // Xử lý quét mã vạch
    const handleBarcodeScan = (barcode) => {
        const product = products.find(p => p.sku === barcode || p.id.toString() === barcode);
        if (product) {
            addToCart(product);
            setBarcodeInput('');
        } else {
            toast.error('Không tìm thấy sản phẩm với mã: ' + barcode);
        }
    };

    // Tạo QR code và thông tin thanh toán
    const generatePaymentInfo = () => {
        const total = getTotal();
        const momoAccount = '0901234567';
        const bankAccount = '9704221234567890';
        
        const paymentMethods = {
            'MOMO_QR': {
                name: 'Momo QR',
                accountName: 'PET SHOP',
                accountNumber: momoAccount,
                qrData: `2|99|${momoAccount}||0|0|${total}|${customerName || 'Khach hang'}|${Date.now()}`,
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

        return paymentMethods[paymentMethod] || null;
    };

    // Mở form thanh toán
    const handleOpenPaymentModal = () => {
        if (cart.length === 0) {
            toast.error('Giỏ hàng trống');
            return;
        }

        if (!customerName.trim()) {
            toast.error('Vui lòng nhập tên khách hàng');
            return;
        }

        // Generate QR code data for QR payment methods
        if (paymentMethod === 'MOMO_QR' || paymentMethod === 'VNPAY_QR' || paymentMethod === 'VIETQR') {
            const info = generatePaymentInfo();
            setPaymentInfo(info);
            // Generate QR code URL using a QR code generator service
            const qrData = encodeURIComponent(info.qrData);
            setPaymentQRCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`);
        } else {
            setPaymentInfo(null);
            setPaymentQRCode('');
        }

        setShowPaymentModal(true);
    };

    // Xác nhận thanh toán thành công (sau khi khách quét QR hoặc thanh toán)
    const handleConfirmPaymentSuccess = async () => {
        setProcessingPayment(true);
        try {
            // Thanh toán thành công - Tạo đơn hàng
            const orderData = {
                customerId: selectedCustomer?.id || null,
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim() || null,
                paymentMethod: paymentMethod,
                promotionCode: appliedPromotion?.code || null,
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                }))
            };

            const response = await createPOSOrder(orderData);
            const newOrder = response.data.data || response.data;
            setCreatedOrder(newOrder);
            
            // Đóng modal thanh toán
            setShowPaymentModal(false);
            setPaymentQRCode('');
            setPaymentInfo(null);
            
            toast.success('Thanh toán thành công! Đang in hóa đơn...');
            
            // Print invoice after successful payment
            setTimeout(() => {
                handlePrintInvoice(newOrder);
                
                // Reset form after printing
                setCart([]);
                setCustomerName('');
                setCustomerPhone('');
                setSelectedCustomer(null);
                setCustomerSearchQuery('');
                setCustomerSearchResults([]);
                setShowCustomerSearch(false);
                setPaymentMethod('COD');
                setPromotionCode('');
                setAppliedPromotion(null);
                setDiscountAmount(0);
                setCreatedOrder(null);
                setBarcodeInput('');
            }, 500);
        } catch (error) {
            console.error('Error creating order:', error);
            toast.error('Không thể tạo đơn hàng: ' + (error.response?.data?.message || error.message));
        } finally {
            setProcessingPayment(false);
        }
    };

    const handlePrintInvoice = (order) => {
        const printWindow = window.open('', '_blank');
        const paymentMethodText = {
            'COD': 'Tiền mặt',
            'MOMO_QR': 'Momo QR',
            'VNPAY_QR': 'VNPay QR',
            'VIETQR': 'VietQR (Chuyển khoản)',
            'CREDIT_CARD': 'Thẻ (POS quẹt thẻ)',
            'BANK_TRANSFER': 'Chuyển khoản'
        };
        
        const invoiceContent = `
            <html>
                <head>
                    <title>Hóa đơn ${order.orderCode || order.posCode || 'Chưa có mã'}</title>
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
                        <h2>HÓA ĐƠN BÁN HÀNG</h2>
                    </div>
                    <div class="info">
                        <p><strong>Mã hóa đơn:</strong> ${order.orderCode || order.posCode || 'Chưa có mã'}</p>
                        <p><strong>Ngày giờ:</strong> ${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                        <div class="divider"></div>
                        <p><strong>Khách hàng:</strong> ${customerName}</p>
                        ${customerPhone ? `<p><strong>SĐT:</strong> ${customerPhone}</p>` : ''}
                        ${selectedCustomer ? `<p><strong>Mã KH:</strong> ${selectedCustomer.id.substring(0, 8)}...</p>` : '<p><strong>Loại:</strong> Khách vãng lai</p>'}
                        <div class="divider"></div>
                        <p><strong>Phương thức thanh toán:</strong> ${paymentMethodText[paymentMethod] || paymentMethod}</p>
                        <p><strong>Trạng thái:</strong> Đã thanh toán</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th class="product-name">Sản phẩm</th>
                                <th class="quantity">SL</th>
                                <th class="price">Đơn giá</th>
                                <th class="price">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cart.map(item => `
                                <tr>
                                    <td class="product-name">${item.productName}</td>
                                    <td class="quantity">${item.quantity}</td>
                                    <td class="price">${item.unitPrice.toLocaleString('vi-VN')} ₫</td>
                                    <td class="price">${(item.unitPrice * item.quantity).toLocaleString('vi-VN')} ₫</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="summary">
                        <div class="summary-line">
                            <span>Tạm tính:</span>
                            <span>${order.subTotal ? order.subTotal.toLocaleString('vi-VN') : getSubTotal().toLocaleString('vi-VN')} ₫</span>
                        </div>
                        ${order.promotionCode && order.discountAmount ? `
                            <div class="summary-line">
                                <span>Mã giảm giá (${order.promotionCode}):</span>
                                <span>-${order.discountAmount.toLocaleString('vi-VN')} ₫</span>
                            </div>
                        ` : ''}
                        <div class="summary-total">
                            <div class="summary-line">
                                <span>TỔNG CỘNG:</span>
                                <span>${order.total.toLocaleString('vi-VN')} ₫</span>
                            </div>
                        </div>
                    </div>
                    <div class="footer">
                        <p><strong>Cảm ơn quý khách!</strong></p>
                        <p>Hẹn gặp lại</p>
                        <div class="divider"></div>
                        <p style="font-size: 10px;">Hóa đơn được tạo bởi hệ thống POS</p>
                    </div>
                </body>
            </html>
        `;
        printWindow.document.write(invoiceContent);
        printWindow.document.close();
        printWindow.print();
    };

    // Get unique categories
    const categories = React.useMemo(() => {
        const cats = new Set();
        products.forEach(p => {
            if (p.category?.name) cats.add(p.category.name);
        });
        return Array.from(cats);
    }, [products]);

    const filteredProducts = React.useMemo(() => {
        let filtered = products.filter(product => {
            // Search filter
            if (searchQuery) {
        const query = searchQuery.toLowerCase();
                if (!product.name?.toLowerCase().includes(query) &&
                    !product.sku?.toLowerCase().includes(query)) {
                    return false;
                }
            }
            
            // Category filter
            if (categoryFilter !== 'all' && product.category?.name !== categoryFilter) {
                return false;
            }
            
            // Price filter
            const price = product.salePrice || product.price || 0;
            if (priceFilter === 'low' && price >= 100000) return false;
            if (priceFilter === 'medium' && (price < 100000 || price >= 500000)) return false;
            if (priceFilter === 'high' && price < 500000) return false;
            
            // Stock filter
            const stock = product.quantity !== undefined ? product.quantity : (product.inventory?.quantity || 0);
            if (stockFilter === 'inStock' && stock <= 0) return false;
            if (stockFilter === 'outOfStock' && stock > 0) return false;
            
            return true;
        });
        
        // Sort
        filtered.sort((a, b) => {
            let aVal, bVal;
            if (sortBy === 'name') {
                aVal = a.name || '';
                bVal = b.name || '';
            } else if (sortBy === 'price') {
                aVal = a.salePrice || a.price || 0;
                bVal = b.salePrice || b.price || 0;
            } else {
                aVal = a.quantity !== undefined ? a.quantity : (a.inventory?.quantity || 0);
                bVal = b.quantity !== undefined ? b.quantity : (b.inventory?.quantity || 0);
            }
            
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
        
        return filtered;
    }, [products, searchQuery, categoryFilter, priceFilter, stockFilter, sortBy, sortOrder]);

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * productsPerPage,
        currentPage * productsPerPage
    );

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter, priceFilter, stockFilter]);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bán hàng tại cửa hàng (POS)</h1>
                <p className="text-gray-600 dark:text-gray-400">Tạo hóa đơn và thanh toán dịch vụ</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product Selection */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search and Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm sản phẩm..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                                <option value="all">Tất cả danh mục</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <select
                                value={priceFilter}
                                onChange={(e) => setPriceFilter(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                                <option value="all">Tất cả giá</option>
                                <option value="low">Dưới 100k</option>
                                <option value="medium">100k - 500k</option>
                                <option value="high">Trên 500k</option>
                            </select>
                            <select
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                                <option value="all">Tất cả tồn kho</option>
                                <option value="inStock">Còn hàng</option>
                                <option value="outOfStock">Hết hàng</option>
                            </select>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                                <option value="name">Sắp xếp theo tên</option>
                                <option value="price">Sắp xếp theo giá</option>
                                <option value="stock">Sắp xếp theo tồn kho</option>
                            </select>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                                <option value="asc">Tăng dần</option>
                                <option value="desc">Giảm dần</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-5 gap-3 mb-4">
                                    {paginatedProducts.map((product) => {
                                        const imageUrl = getProductImage(product);
                                        return (
                                    <div
                                        key={product.id}
                                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                                        onClick={() => addToCart(product)}
                                    >
                                                <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded mb-2 overflow-hidden flex items-center justify-center">
                                                    {imageUrl && !imageUrl.includes('placehold.co') ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={product.name}
                                                            className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                                e.target.nextElementSibling.style.display = 'flex';
                                                    }}
                                                />
                                                    ) : null}
                                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center" style={{ display: imageUrl && !imageUrl.includes('placehold.co') ? 'none' : 'flex' }}>
                                                        <ShoppingCartIcon className="w-8 h-8 text-gray-400" />
                                        </div>
                                                </div>
                                                <h3 className="font-medium text-xs line-clamp-2 mb-1 text-gray-900 dark:text-white">{product.name}</h3>
                                                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                            {(product.salePrice || product.price || 0).toLocaleString('vi-VN')} ₫
                                        </p>
                                    </div>
                                        );
                                    })}
                                </div>
                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Trang {currentPage} / {totalPages} ({filteredProducts.length} sản phẩm)
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                Trước
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                Sau
                                            </button>
                                        </div>
                            </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Cart & Checkout */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3">
                        <h2 className="text-base font-bold mb-3">Thông tin khách hàng</h2>
                        <div className="space-y-2">
                            {/* Tìm kiếm khách hàng */}
                            <div className="relative">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={customerSearchQuery}
                                            onChange={(e) => handleSearchCustomers(e.target.value)}
                                            placeholder="Tìm khách hàng..."
                                            className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                        {customerSearchQuery && (
                                            <button
                                                onClick={() => {
                                                    setCustomerSearchQuery('');
                                                    setCustomerSearchResults([]);
                                                    setShowCustomerSearch(false);
                                                }}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Kết quả tìm kiếm */}
                                {showCustomerSearch && customerSearchResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {customerSearchResults.map((customer) => (
                                            <button
                                                key={customer.id}
                                                onClick={() => handleSelectCustomer(customer)}
                                                className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                                            >
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {customer.fullName || customer.username || customer.email}
                                                </div>
                                                {customer.email && (
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</div>
                                                )}
                                                {customer.phone && (
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {searchingCustomers && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center">
                                        <div className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Thông tin khách hàng đã chọn */}
                            {selectedCustomer && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                                ✓ Khách hàng: {selectedCustomer.fullName || selectedCustomer.username || selectedCustomer.email}
                                            </p>
                                            {selectedCustomer.phone && (
                                                <p className="text-xs text-green-600 dark:text-green-300">SĐT: {selectedCustomer.phone}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleClearCustomer}
                                            className="text-green-600 hover:text-green-800"
                                        >
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Nhập thông tin khách hàng (nếu chưa chọn từ tìm kiếm) */}
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Tên khách hàng *"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                disabled={!!selectedCustomer}
                            />
                            <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="Số điện thoại"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                disabled={!!selectedCustomer}
                            />
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Phương thức thanh toán *
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                >
                                    <option value="COD">💵 Tiền mặt</option>
                                    <option value="MOMO_QR">📱 Momo QR</option>
                                    <option value="VNPAY_QR">🏦 VNPay QR</option>
                                    <option value="VIETQR">🏧 VietQR</option>
                                    <option value="CREDIT_CARD">💳 Thẻ</option>
                                </select>
                            </div>
                            
                            {/* Mã giảm giá */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Mã giảm giá
                                </label>
                                {!appliedPromotion ? (
                                    <div className="flex gap-1.5">
                                        <input
                                            type="text"
                                            value={promotionCode}
                                            onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                                            placeholder="Nhập mã"
                                            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleApplyPromotion();
                                                }
                                            }}
                                        />
                                        <Button
                                            onClick={handleApplyPromotion}
                                            disabled={validatingPromotion || !promotionCode.trim()}
                                            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                        >
                                            {validatingPromotion ? '...' : 'Áp dụng'}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-medium text-green-800 dark:text-green-200">
                                                    ✓ {appliedPromotion.code}
                                                </p>
                                                <p className="text-xs text-green-600 dark:text-green-300">
                                                    -{discountAmount.toLocaleString('vi-VN')} ₫
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleRemovePromotion}
                                                className="text-green-600 hover:text-green-800"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3">
                        <h2 className="text-base font-bold mb-3">Giỏ hàng ({cart.length})</h2>
                        {cart.length === 0 ? (
                            <p className="text-gray-500 text-center py-3 text-sm">Giỏ hàng trống</p>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {cart.map((item) => (
                                    <div key={item.productId} className="flex items-center gap-2 border-b pb-2">
                                        {item.imageUrl && (
                                            <img src={item.imageUrl} alt={item.productName} className="w-10 h-10 object-cover rounded" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium line-clamp-1 text-gray-900 dark:text-white">{item.productName}</p>
                                            <p className="text-xs text-gray-500">{item.unitPrice.toLocaleString('vi-VN')} ₫</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => updateQuantity(item.productId, -1)}
                                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <MinusIcon className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="w-6 text-center text-xs">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.productId, 1)}
                                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <PlusIcon className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => removeFromCart(item.productId)}
                                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="space-y-1.5 mb-3">
                                <div className="flex justify-between text-xs">
                                    <span>Tạm tính:</span>
                                    <span>{getSubTotal().toLocaleString('vi-VN')} ₫</span>
                                </div>
                                {appliedPromotion && discountAmount > 0 && (
                                    <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                                        <span>Giảm giá ({appliedPromotion.code}):</span>
                                        <span>-{discountAmount.toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-gray-200 dark:border-gray-700">
                                    <span>Tổng cộng:</span>
                                    <span>{getTotal().toLocaleString('vi-VN')} ₫</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 mt-3">
                            {cart.length > 0 && (
                                <Button
                                    onClick={() => {
                                        if (window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
                                            setCart([]);
                                            setPromotionCode('');
                                            setAppliedPromotion(null);
                                            setDiscountAmount(0);
                                            setBarcodeInput('');
                                        }
                                    }}
                                    variant="secondary"
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm py-2 rounded-lg"
                                >
                                        Hủy đơn
                                </Button>
                            )}
                                <Button
                                    onClick={handleOpenPaymentModal}
                                    disabled={processingPayment || cart.length === 0}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm py-2 rounded-lg"
                                >
                                    💳 Thanh toán
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Thanh toán
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowPaymentModal(false);
                                        setPaymentQRCode('');
                                        setPaymentInfo(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Số tiền */}
                                <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Số tiền cần thanh toán</p>
                                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {getTotal().toLocaleString('vi-VN')} ₫
                                    </p>
                                </div>

                                {/* QR Code và thông tin thanh toán */}
                                {paymentMethod === 'COD' ? (
                                    <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="text-6xl mb-4">💵</div>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            Thanh toán tiền mặt
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Vui lòng nhận tiền từ khách hàng và xác nhận thanh toán
                                        </p>
                                    </div>
                                ) : paymentMethod === 'CREDIT_CARD' ? (
                                    <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="text-6xl mb-4">💳</div>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            Quẹt thẻ thanh toán
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            Vui lòng quẹt thẻ trên máy POS và chờ xác nhận
                                        </p>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-left">
                                            <p className="text-xs text-blue-800 dark:text-blue-200">
                                                <strong>Lưu ý:</strong> Đây là chế độ demo. Trong thực tế, hệ thống sẽ tự động nhận kết quả từ máy POS.
                                            </p>
                                        </div>
                                    </div>
                                ) : paymentInfo ? (
                                    <div className="space-y-4">
                                        {/* QR Code */}
                                        <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                                Quét mã QR để thanh toán
                                            </p>
                                            {paymentQRCode ? (
                                                <img 
                                                    src={paymentQRCode} 
                                                    alt="QR Code" 
                                                    className="mx-auto w-48 h-48 border-2 border-gray-200 dark:border-gray-600 rounded-lg"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextElementSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div className="mx-auto w-48 h-48 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center" style={{ display: paymentQRCode ? 'none' : 'flex' }}>
                                                <div className="text-center">
                                                    <div className="text-4xl mb-2">📱</div>
                                                    <p className="text-xs text-gray-500">Đang tạo QR...</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Thông tin tài khoản */}
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                                Thông tin chuyển khoản:
                                            </p>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Ngân hàng:</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">{paymentInfo.bankName}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Chủ tài khoản:</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">{paymentInfo.accountName}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Số tài khoản:</span>
                                                    <span className="font-medium text-gray-900 dark:text-white font-mono">{paymentInfo.accountNumber}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Số tiền:</span>
                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{getTotal().toLocaleString('vi-VN')} ₫</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hướng dẫn */}
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                            <p className="text-xs text-blue-800 dark:text-blue-200">
                                                <strong>Hướng dẫn:</strong> Mở ứng dụng {paymentInfo.name} trên điện thoại, quét mã QR hoặc chuyển khoản theo thông tin trên. Sau khi thanh toán thành công, nhấn "Xác nhận thanh toán".
                                            </p>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-4 border-t">
                                    <Button
                                        onClick={handleConfirmPaymentSuccess}
                                        disabled={processingPayment}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                                    >
                                        {processingPayment ? (
                                            <>
                                                <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                                Đang xử lý...
                                            </>
                                        ) : (
                                            '✓ Xác nhận thanh toán thành công'
                                        )}
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setShowPaymentModal(false);
                                            setPaymentQRCode('');
                                            setPaymentInfo(null);
                                        }}
                                        variant="secondary"
                                        className="px-4 py-2 text-gray-900 dark:text-white"
                                    >
                                        Đóng
                                    </Button>
                                </div>

                                {/* Demo Notice */}
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                    <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
                                        <strong>⚠️ Chế độ Demo:</strong> Đây là giao diện demo. Trong thực tế, hệ thống sẽ tự động nhận kết quả thanh toán từ payment gateway.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

