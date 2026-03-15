import axios from 'axios';

// Lấy URL cơ sở của API từ biến môi trường, mặc định dùng http://localhost:5200 nếu không có
const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5200';

const apiClient = axios.create({
    baseURL: apiUrl,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: false,
});

// Interceptor để tự động thêm token vào mỗi request
apiClient.interceptors.request.use(
    (config) => {
        console.log('=== API REQUEST ===');
        console.log('URL:', config.baseURL + config.url);
        console.log('Method:', config.method?.toUpperCase());
        console.log('Headers:', config.headers);
        console.log('Data:', config.data);
        
        const token = localStorage.getItem('jwtToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
            console.log('Auth token added');
        } else {
            console.log('No auth token found');
        }
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Interceptor để log responses
apiClient.interceptors.response.use(
    (response) => {
        console.log('=== API RESPONSE SUCCESS ===');
        console.log('Status:', response.status);
        console.log('Data:', response.data);
        return response;
    },
    (error) => {
        console.error('=== API RESPONSE ERROR ===');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        return Promise.reject(error);
    }
);

export default apiClient;