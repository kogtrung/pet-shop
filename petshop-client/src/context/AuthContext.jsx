import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api/apiClient';
import { getProfile } from '../api/profileApi';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Hàm helper để giải mã token
const getPayloadFromToken = (token) => {
    if (!token) return null;
    try {
        const payload = atob(token.split('.')[1]);
        return JSON.parse(payload);
    } catch (error) {
        console.error("Failed to decode token:", error);
        return null;
    }
};

// Function to get user ID from token
const getUserIdFromToken = (payload) => {
    if (!payload) return null;
    // The user ID is typically stored in the 'nameid' claim
    const nameIdClaim = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
    return payload[nameIdClaim] || payload.nameid || payload.sub;
};

const getRolesFromPayload = (payload) => {
    if (!payload) return [];
    const roleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
    const roles = payload[roleClaim] ?? payload.role ?? payload.roles;
    if (!roles) return [];
    if (Array.isArray(roles)) return roles;
    if (typeof roles === 'string') {
        return roles.split(',').map(r => r.trim()).filter(Boolean);
    }
    return [];
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('jwtToken'));
    const [isAdmin, setIsAdmin] = useState(false);
    const [isServiceStaff, setIsServiceStaff] = useState(false);
    const [isSaleStaff, setIsSaleStaff] = useState(false);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dispatch auth state changes for other contexts
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('auth-state-change', {
            detail: { user, token }
        }));
    }, [user, token]);

    useEffect(() => {
        const loadUserData = async () => {
        if (token) {
            const payload = getPayloadFromToken(token);
            if (payload) {
                // Kiểm tra token hết hạn
                const isExpired = payload.exp * 1000 < Date.now();
                if (isExpired) {
                    logout();
                        return;
                    }
                    const roleList = getRolesFromPayload(payload);
                    setRoles(roleList);
                    const primaryRole = roleList[0] || null;
                    const userId = getUserIdFromToken(payload);
                    
                    // Load profile to get fullname
                    let profileData = null;
                    try {
                        const profileResponse = await getProfile();
                        profileData = profileResponse.data;
                    } catch (error) {
                        console.error('Error loading profile:', error);
                        // Continue without profile data
                    }
                    
                    setUser({
                        id: userId,
                        username: payload.unique_name,
                        email: profileData?.email || payload.email || '',
                        role: primaryRole,
                        roles: roleList,
                        profile: profileData ? {
                            fullName: profileData.fullName,
                            phone: profileData.phone
                        } : null
                    });
                    setIsAdmin(roleList.includes('Admin'));
                    setIsServiceStaff(roleList.includes('ServiceStaff'));
                    setIsSaleStaff(roleList.includes('SaleStaff'));
            } else {
                // Token không hợp lệ
                logout();
            }
        } else {
            setUser(null);
            setIsAdmin(false);
            setIsServiceStaff(false);
            setIsSaleStaff(false);
            setRoles([]);
        }
        setLoading(false);
        };
        
        loadUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const login = async (username, password) => {
        const response = await apiClient.post('/api/Auth/login', { username, password });
        const newToken = response.data.token;
        localStorage.setItem('jwtToken', newToken);
        setToken(newToken);
        return response;
    };

    const register = (username, email, password, phone) => {
        return apiClient.post('/api/Auth/register', { username, email, password, phone });
    };

    const logout = () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('cartItems'); // Xóa cart từ localStorage
        setToken(null);
        setUser(null);
        setIsAdmin(false);
        setIsServiceStaff(false);
        setIsSaleStaff(false);
        setRoles([]);
        
        // Dispatch a custom event to notify other parts of the app
        window.dispatchEvent(new CustomEvent('user-logout'));
    };

    const value = {
        user,
        token,
        isAdmin,
        isServiceStaff,
        isSaleStaff,
        roles,
        loading,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};