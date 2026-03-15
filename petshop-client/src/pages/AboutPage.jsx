import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPageBySlug } from '../api/pageApi';
import { getImageUrl } from '../utils/imageUtils';
import { SparklesIcon } from '@heroicons/react/24/outline';

const ABOUT_SLUG = 'gioi-thieu';

export default function AboutPage() {
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAboutPage = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await getPageBySlug(ABOUT_SLUG);
                const pageData = response.data || response;
                setPage(pageData);
            } catch (err) {
                if (err.response?.status === 404) {
                    setError('not-found');
                } else {
                    setError('unknown');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAboutPage();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-gray-600 text-sm">Đang tải trang giới thiệu...</p>
                </div>
            </div>
        );
    }

    if (error === 'not-found') {
        return (
            <div className="max-w-4xl mx-auto py-16 px-4">
                <div className="border border-gray-200 bg-white shadow-sm p-10 text-center">
                    <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                    <h1 className="text-3xl font-heading font-semibold text-black mb-4">Chưa có trang giới thiệu</h1>
                    <p className="text-gray-600 mb-6">
                        Bạn có thể tạo nội dung giới thiệu nhanh chóng bằng cách vào{' '}
                        <strong>Quản trị &gt; Manage Pages</strong> và tạo một trang mới với slug
                        <code className="px-2 py-0.5 mx-1 bg-gray-100 text-gray-800 rounded">gioi-thieu</code>.
                    </p>
                    <p className="text-gray-600 mb-6">
                        Hoặc viết một bài trong mục <strong>Tin tức &amp; Blog</strong> rồi đặt slug là{' '}
                        <code className="px-2 py-0.5 mx-1 bg-gray-100 text-gray-800 rounded">gioi-thieu</code>, hệ thống sẽ tự liên kết.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link
                            to="/"
                            className="px-5 py-2 border border-black bg-black text-white text-sm font-medium transition-all hover:bg-white hover:text-black"
                        >
                            Về trang chủ
                        </Link>
                        <Link
                            to="/pages"
                            className="px-5 py-2 border border-black bg-white text-black text-sm font-medium transition-all hover:bg-black hover:text-white"
                        >
                            Xem Tin tức &amp; Blog
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto py-16 px-4 text-center">
                <h1 className="text-3xl font-heading font-semibold text-black mb-4">Không thể tải trang giới thiệu</h1>
                <p className="text-gray-600 mb-6">Vui lòng thử lại sau hoặc liên hệ quản trị viên.</p>
                <Link
                    to="/"
                    className="inline-flex items-center px-5 py-2 border border-black bg-black text-white text-sm font-medium transition-all hover:bg-white hover:text-black"
                >
                    Quay về trang chủ
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-3">Petivo</p>
                    <h1 className="text-4xl font-heading font-bold text-black mb-4">{page?.title || 'Giới thiệu'}</h1>
                    <p className="text-gray-600 text-base">
                        Những thông tin tổng quan về Petivo – cửa hàng chăm sóc thú cưng của bạn.
                    </p>
                </div>

                {page?.imageUrl && (
                    <div className="mb-10 overflow-hidden">
                        <img
                            src={getImageUrl(page.imageUrl)}
                            alt={page.title}
                            className="w-full h-[320px] object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                )}

                <article className="prose prose-lg max-w-none">
                    <div
                        className="text-gray-800 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: page?.content || '' }}
                    />
                </article>

                <div className="mt-12 border-t border-gray-200 pt-6 flex flex-wrap items-center justify-between gap-4">
                    {(() => {
                        const lastUpdated = page?.updatedAt || page?.createdAt;
                        return (
                    <span className="text-sm text-gray-500">
                        Cập nhật lần cuối vào{' '}
                                {lastUpdated
                                    ? new Date(lastUpdated).toLocaleDateString('vi-VN')
                                    : new Date().toLocaleDateString('vi-VN')}
                    </span>
                        );
                    })()}
                    <Link
                        to="/pages"
                        className="inline-flex items-center gap-2 text-sm font-medium text-black hover:underline"
                    >
                        Khám phá thêm Tin tức &amp; Blog
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}

