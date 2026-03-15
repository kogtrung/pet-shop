import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPageBySlug } from '../api/pageApi';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const PageDetailPage = () => {
    const { slug } = useParams();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                setLoading(true);
                const response = await getPageBySlug(slug);
                setPage(response.data);
            } catch (err) {
                console.error('Error fetching page:', err);
                setError('Không thể tải trang. Trang có thể không tồn tại hoặc chưa được xuất bản.');
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchPage();
        }
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="text-5xl text-red-500 mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Không tìm thấy trang</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'Trang bạn đang tìm kiếm không tồn tại hoặc chưa được xuất bản.'}</p>
                    <Link 
                        to="/" 
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Quay về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link 
                    to="/" 
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mb-6"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Quay về trang chủ
                </Link>
                
                <article className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                    {page.imageUrl && (
                        <div className="w-full h-64 md:h-96 overflow-hidden bg-gray-200 dark:bg-gray-700">
                            <img 
                                src={page.imageUrl.startsWith('http') ? page.imageUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5200'}${page.imageUrl}`}
                                alt={page.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                    <div className="p-6 md:p-8 lg:p-12">
                        <header className="mb-8">
                                {page.tag && (
                                <div className="mb-4">
                                    <span className="inline-block px-4 py-2 text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full">
                                        {page.tag}
                                    </span>
                                </div>
                                )}
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                                {page.title}
                            </h1>
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                <span>Đăng bởi Admin</span>
                                {(page.createdAt || page.updatedAt) && (
                                    <>
                                <span className="mx-2">•</span>
                                        <span>{new Date(page.createdAt || page.updatedAt).toLocaleDateString('vi-VN', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}</span>
                                    </>
                                )}
                            </div>
                        </header>
                        
                        <div 
                            className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-indigo-600 dark:prose-a:text-indigo-400"
                            dangerouslySetInnerHTML={{ __html: page.content }}
                        />
                    </div>
                </article>
            </div>
        </div>
    );
};

export default PageDetailPage;