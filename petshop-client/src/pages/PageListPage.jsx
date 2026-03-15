import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPages } from '../api/pageApi';
import { getImageUrl } from '../utils/imageUtils';
import { SparklesIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const TAG_COLORS = [
    'bg-black text-white',
    'bg-gray-900 text-white',
    'bg-neutral-900 text-white',
    'bg-stone-900 text-white'
];

export default function PageListPage() {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        try {
            setLoading(true);
            const response = await getPages({ isPublished: true });
            const sortedPages = response.data
                .filter(page => page.isPublished)
                .sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return dateB - dateA;
                });
            setPages(sortedPages);
        } catch (err) {
            setError('Không thể tải danh sách trang');
            console.error('Error loading pages:', err);
        } finally {
            setLoading(false);
        }
    };

    const decodeHtmlEntities = (text) => {
        if (!text) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    };

    const stripHtml = (html) => {
        if (!html) return '';
        const decoded = decodeHtmlEntities(html);
        return decoded.replace(/<[^>]*>/g, '');
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl font-heading font-bold text-black mb-8">Tin tức & Blog</h1>
                
                {pages.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600">Chưa có bài viết nào.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {pages.map((page, idx) => {
                            // Try multiple image fields
                            const imageUrl = page.featuredImage 
                                ? getImageUrl(page.featuredImage) 
                                : page.imageUrl 
                                    ? getImageUrl(page.imageUrl) 
                                    : null;
                            const excerpt = stripHtml(page.excerpt || page.content || '').substring(0, 150);
                            
                            return (
                                <Link 
                                    key={page.id} 
                                    to={`/pages/${page.slug}`} 
                                    className="group"
                                >
                                    <div className="bg-white border border-gray-200 overflow-hidden hover:shadow-lg transition-all relative">
                                        {/* Tag on corner */}
                                        {page.tag && (
                                            <div className="absolute top-3 right-3 z-10">
                                                <span className={`px-3 py-1 text-xs font-medium ${TAG_COLORS[idx % TAG_COLORS.length]}`}>
                                                    {page.tag}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Image */}
                                        {imageUrl ? (
                                            <div className="h-48 overflow-hidden bg-gray-100 relative">
                                                <img 
                                                    src={imageUrl} 
                                                    alt={decodeHtmlEntities(page.title || '')}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        const fallback = e.target.parentElement.querySelector('.image-fallback');
                                                        if (fallback) fallback.style.display = 'flex';
                                                    }}
                                                />
                                                <div className="image-fallback w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center" style={{ display: 'none' }}>
                                                    <SparklesIcon className="w-16 h-16 text-gray-400" strokeWidth={2} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                                <SparklesIcon className="w-16 h-16 text-gray-400" strokeWidth={2} />
                                            </div>
                                        )}
                                        
                                        {/* Content */}
                                        <div className="p-6">
                                            <h3 className="text-xl font-heading font-semibold text-black mb-2 line-clamp-2 group-hover:text-gray-600 transition-colors">
                                                {decodeHtmlEntities(page.title || 'Bài viết')}
                                            </h3>
                                            {excerpt && (
                                                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                                                    {excerpt}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">
                                                    {page.createdAt ? new Date(page.createdAt).toLocaleDateString('vi-VN') : ''}
                                                </span>
                                                <span className="text-black font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                                                    Đọc thêm <ChevronRightIcon className="w-4 h-4" strokeWidth={2} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

