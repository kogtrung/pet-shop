import React, { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import Button from '../components/common/Button.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { getProductImage } from '../utils/imageUtils.js';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline';

export default function CartPage() {
    const { items, updateQuantity, removeItem, totals, clearCart } = useCart();
    const navigate = useNavigate();
    
    // Shipping method state (default to standard)
    const [shippingMethod, setShippingMethod] = useState('standard');
    const shippingMethods = [
        { id: 'standard', name: 'Giao hàng tiêu chuẩn', price: 0 },
        { id: 'express', name: 'Giao hàng nhanh', price: 30000 },
        { id: 'same-day', name: 'Giao hàng trong ngày', price: 50000 }
    ];
    
    // Calculate shipping cost
    const getShippingCost = () => {
        const method = shippingMethods.find(m => m.id === shippingMethod);
        // Free shipping for orders over 500,000 VND
        if (totals.subtotal >= 500000) {
            return 0;
        }
        return method ? method.price : 0;
    };
    
    // Calculate total with shipping
    const totalWithShipping = totals.subtotal + getShippingCost();

    if (items.length === 0) {
        return (
            <div className="text-center py-16 bg-white">
                <h1 className="text-2xl font-heading font-bold text-textDark mb-2">Giỏ hàng trống</h1>
                <p className="text-textDark/70 mb-6">Hãy tiếp tục mua sắm để thêm sản phẩm vào giỏ.</p>
                <Link to="/products"><Button variant="primary">Khám phá sản phẩm</Button></Link>
            </div>
        );
    }

    // Helper function to get the correct price for an item
    const getItemPrice = (item) => {
        // Use regular price (no promotion discount)
        return item.productPrice || item.product?.price || 0;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white py-6 max-w-7xl mx-auto px-4">
            <div className="lg:col-span-8 bg-white shadow-soft p-4">
                {items.map((item) => (
                    <div key={item.id || item.product?.id} className="relative flex items-center py-3 border-b last:border-none border-softGray">
                        <img 
                            src={getProductImage(item.product || { 
                                images: item.productImageUrl ? [{ url: item.productImageUrl, isPrimary: true }] : [],
                                imageUrl: item.productImageUrl,
                                name: item.productName || item.product?.name
                            })} 
                            alt={item.productName || item.product?.name} 
                            className="w-16 h-16 rounded-image object-cover mr-3 flex-shrink-0"
                            onError={(e) => {
                                e.target.src = `https://placehold.co/64x64/EAF1FF/6E85B7?text=${encodeURIComponent((item.productName || item.product?.name || 'P')[0])}`;
                            }}
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-semibold text-sm text-textDark truncate">{item.productName || item.product?.name}</h3>
                            <div className="text-textDark/70 text-xs font-ui">{item.product?.brandName}</div>
                            {/* Display booking date time for services */}
                            {item.product?.isService && item.bookingDateTime && (
                                <div className="mt-1 text-xs text-primary font-ui">
                                    <span className="font-medium">Lịch đặt:</span> {new Date(item.bookingDateTime).toLocaleString('vi-VN')}
                                </div>
                            )}
                            <div className="mt-2 flex items-center space-x-2">
                                <div className="flex items-center border border-textDark/20 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newQuantity = Math.max(1, (item.quantity || 1) - 1);
                                            updateQuantity(item.productId || item.product?.id, newQuantity);
                                        }}
                                        className="p-1.5 hover:bg-softGray transition-colors"
                                        disabled={item.quantity <= 1}
                                    >
                                        <MinusIcon className="h-4 w-4 text-textDark" />
                                    </button>
                                <input 
                                    type="number" 
                                    min={1} 
                                    value={item.quantity} 
                                        onChange={(e) => {
                                            const value = Number(e.target.value);
                                            if (value >= 1) {
                                                updateQuantity(item.productId || item.product?.id, value);
                                            }
                                        }} 
                                        className="w-12 text-center bg-softGray text-textDark px-2 py-1 text-sm border-0 focus:ring-0 font-ui" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newQuantity = (item.quantity || 1) + 1;
                                            updateQuantity(item.productId || item.product?.id, newQuantity);
                                        }}
                                        className="p-1.5 hover:bg-softGray transition-colors"
                                    >
                                        <PlusIcon className="h-4 w-4 text-textDark" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeItem(item.productId || item.product?.id)}
                            className="absolute top-2 right-2 text-xs text-gray-500 hover:text-black"
                            title="Xóa"
                        >
                            ×
                        </button>
                        <div className="text-right font-ui font-normal text-primary min-w-24 text-sm">
                            {(getItemPrice(item) * (item.quantity || 0)).toLocaleString('vi-VN')} ₫
                        </div>
                    </div>
                ))}
                <div className="mt-3 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={clearCart}
                        className="px-5 py-2 border border-black bg-black text-white text-sm font-medium rounded-none transition-all duration-300 hover:bg-white hover:text-black"
                    >
                        Xóa giỏ hàng
                    </button>
                    <Link
                        to="/products"
                        className="px-4 py-2 border border-black bg-white text-black text-sm font-medium rounded-none transition-all duration-300 hover:bg-black hover:text-white"
                    >
                        Tiếp tục mua sắm
                    </Link>
                </div>
            </div>
            <aside className="lg:col-span-4 bg-white shadow-soft p-4 h-fit">
                <h2 className="text-lg font-heading font-semibold text-textDark mb-3">Thông tin đơn hàng</h2>
                <div className="flex justify-between text-base font-heading font-bold text-textDark mb-3">
                    <span>Tổng tiền</span>
                    <span className="text-black">{totalWithShipping.toLocaleString('vi-VN')} ₫</span>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/checkout')}
                    className="w-full mt-2 py-2.5 border border-black bg-black text-white text-sm font-medium rounded-none transition-all duration-300 hover:bg-white hover:text-black"
                >
                    Thanh toán
                </button>
            </aside>
        </div>
    );
}