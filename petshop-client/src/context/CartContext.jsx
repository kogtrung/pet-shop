import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        user: null,
        token: null
    });
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Listen for auth state changes
    useEffect(() => {
        const handleAuthChange = (event) => {
            setAuthState({
                user: event.detail.user,
                token: event.detail.token
            });
        };

        const handleLogout = () => {
            setItems([]);
            localStorage.removeItem('cartItems');
        };

        window.addEventListener('auth-state-change', handleAuthChange);
        window.addEventListener('user-logout', handleLogout);
        
        return () => {
            window.removeEventListener('auth-state-change', handleAuthChange);
            window.removeEventListener('user-logout', handleLogout);
        };
    }, []);

    // Load cart from API when user logs in
    useEffect(() => {
        if (authState.user && authState.token) {
            loadCartFromAPI();
        } else {
            // Clear local cart when not logged in
            setItems([]);
            localStorage.removeItem('cartItems');
        }
    }, [authState.user, authState.token]);

    const loadCartFromAPI = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/api/Cart');
            
            // Get booking info from local storage
            const saved = localStorage.getItem('cartItems');
            const localItems = saved ? JSON.parse(saved) : [];
            
            // Log for debugging
            console.log('API cart items:', response.data);
            console.log('Local storage items:', localItems);
            
            // Merge API cart items with local booking info
            const mergedItems = response.data.map(apiItem => {
                // Find corresponding local item with booking info
                const localItem = localItems.find(local => 
                    local.product && local.product.id === apiItem.productId
                );
                
                if (localItem && localItem.bookingDateTime) {
                    // Log for debugging
                    console.log('Merging booking info for item:', apiItem.productId, localItem.bookingDateTime);
                    // Return item with booking info from local storage
                    return {
                        ...apiItem,
                        bookingDateTime: localItem.bookingDateTime
                    };
                }
                return apiItem;
            });
            
            console.log('Merged items:', mergedItems);
            setItems(mergedItems);
        } catch (error) {
            console.error('Error loading cart from API:', error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const addItem = async (product, quantity = 1, bookingDateTime = null) => {
        // Log for debugging
        console.log('addItem called with:', { product, quantity, bookingDateTime });
        
        // If it's a service, don't add to cart - services are handled separately
        if (product.isService) {
            console.log('Service detected, not adding to cart. Services are handled separately.');
            return;
        }
        
        if (!authState.user) {
            // Handle guest user - store in localStorage
            const saved = localStorage.getItem('cartItems');
            let localItems = saved ? JSON.parse(saved) : [];
            
            const existing = localItems.find(i => i.product?.id === product.id);
            if (existing) {
                localItems = localItems.map(i => 
                    i.product?.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
                );
            } else {
                localItems.push({ 
                    product, 
                    quantity
                });
            }
            
            // Log for debugging
            console.log('Saving to localStorage (guest):', localItems);
            localStorage.setItem('cartItems', JSON.stringify(localItems));
            setItems(localItems);
            return;
        }

        try {
            // Add to API cart
            const cartItemData = { 
                productId: product.id, 
                quantity
            };
            
            await apiClient.post('/api/Cart', cartItemData);
            
            // Reload cart to get updated data
            await loadCartFromAPI();
        } catch (error) {
            console.error('Error adding item to cart:', error);
            toast.error('Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại sau!');
        }
    };

    const removeItem = async (productId) => {
        if (!authState.user) {
            // Handle guest user
            const saved = localStorage.getItem('cartItems');
            if (saved) {
                const localItems = JSON.parse(saved);
                const updatedItems = localItems.filter(i => i.product?.id !== productId);
                localStorage.setItem('cartItems', JSON.stringify(updatedItems));
                setItems(updatedItems);
            }
            return;
        }

        try {
            // Find the cart item ID for this product
            const cartItem = items.find(i => i.productId === productId || i.product?.id === productId);
            if (cartItem && cartItem.id) {
                await apiClient.delete(`/api/Cart/${cartItem.id}`);
            }
            
            // Update local storage
            const saved = localStorage.getItem('cartItems');
            if (saved) {
                const localItems = JSON.parse(saved);
                const updatedItems = localItems.filter(i => i.product?.id !== productId);
                // Log for debugging
                console.log('Removing from localStorage:', productId, updatedItems);
                localStorage.setItem('cartItems', JSON.stringify(updatedItems));
            }
            
            // Reload cart to get updated data
            await loadCartFromAPI();
        } catch (error) {
            console.error('Error removing item from cart:', error);
            // Fallback to local state update if API fails
            setItems(prev => prev.filter(i => 
                (i.productId !== productId) && (i.product?.id !== productId)
            ));
            
            // Also update local storage in fallback
            const saved = localStorage.getItem('cartItems');
            if (saved) {
                const localItems = JSON.parse(saved);
                const updatedItems = localItems.filter(i => i.product?.id !== productId);
                localStorage.setItem('cartItems', JSON.stringify(updatedItems));
            }
        }
    };

    const updateQuantity = async (productId, quantity) => {
        if (!authState.user) {
            // Handle guest user
            const saved = localStorage.getItem('cartItems');
            if (saved) {
                const localItems = JSON.parse(saved);
                const updatedItems = localItems.map(i => 
                    i.product?.id === productId ? { ...i, quantity } : i
                );
                localStorage.setItem('cartItems', JSON.stringify(updatedItems));
                setItems(updatedItems);
            }
            return;
        }

        try {
            // Find the cart item ID for this product
            const cartItem = items.find(i => i.productId === productId || i.product?.id === productId);
            if (cartItem && cartItem.id) {
                await apiClient.put(`/api/Cart/${cartItem.id}`, { quantity });
            }
            
            // Update local storage
            const saved = localStorage.getItem('cartItems');
            if (saved) {
                const localItems = JSON.parse(saved);
                const updatedItems = localItems.map(i => 
                    i.product?.id === productId ? { ...i, quantity } : i
                );
                // Log for debugging
                console.log('Updating quantity in localStorage:', productId, quantity, updatedItems);
                localStorage.setItem('cartItems', JSON.stringify(updatedItems));
            }
            
            // Reload cart to get updated data
            await loadCartFromAPI();
        } catch (error) {
            console.error('Error updating cart item quantity:', error);
            // Fallback to local state update if API fails
            setItems(prev => prev.map(i => 
                (i.productId === productId || i.product?.id === productId) ? { ...i, quantity } : i
            ));
            
            // Also update local storage in fallback
            const saved = localStorage.getItem('cartItems');
            if (saved) {
                const localItems = JSON.parse(saved);
                const updatedItems = localItems.map(i => 
                    i.product?.id === productId ? { ...i, quantity } : i
                );
                localStorage.setItem('cartItems', JSON.stringify(updatedItems));
            }
        }
    };

    const clearCart = async () => {
        if (!authState.user) {
            // Handle guest user
            localStorage.removeItem('cartItems');
            setItems([]);
            return;
        }

        try {
            await apiClient.delete('/api/Cart');
            setItems([]);
        } catch (error) {
            console.error('Error clearing cart:', error);
            setItems([]);
        } finally {
            // Always clear local storage
            localStorage.removeItem('cartItems');
        }
    };

    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, i) => {
            // Handle both API cart items and local cart items
            // Use sale price if available, otherwise use regular price
            const price = i.productPrice || i.product?.price || 0;
            const quantity = i.quantity || 0;
            return sum + (price * quantity);
        }, 0);
        return { subtotal };
    }, [items]);

    const value = { 
        items, 
        addItem, 
        removeItem, 
        updateQuantity, 
        clearCart, 
        totals,
        loading
    };
    
    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};