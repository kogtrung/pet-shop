import React, { useState, useEffect } from 'react';
import { getProductRecommendations } from '../../api/productApi';

export default function ProductRecommendations() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        // Đọc sessionId từ localStorage (dùng chung key với ChatWindow)
        const sessionId = localStorage.getItem('chatSessionId');
        
        const response = await getProductRecommendations(sessionId); // Gửi sessionId
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  if (loading) {
    return (
      <div className="p-4 w-72">
        <h4 className="font-bold mb-2">Sản phẩm Nổi bật</h4>
        <div className="flex flex-col space-y-2">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex items-center space-x-2 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="p-4 w-72">
      <h4 className="font-bold mb-2">Sản phẩm Nổi bật</h4>
      <div className="flex flex-col space-y-2">
        {products.map(product => (
          <a 
            href={`/product/${product.slug}`} 
            key={product.id} 
            className="flex items-center space-x-2 hover:bg-gray-100 p-1 rounded transition-colors"
          >
            <img 
              src={product.imageUrl || '/placeholder-image.png'} 
              alt={product.name} 
              className="w-10 h-10 object-cover rounded" 
              onError={(e) => {
                e.target.src = '/placeholder-image.png';
              }}
            />
            <div>
              <p className="text-sm font-medium truncate max-w-[160px]">{product.name}</p>
              <p className="text-sm text-red-500">
                {product.price.toLocaleString('vi-VN')}đ
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}