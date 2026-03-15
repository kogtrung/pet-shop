import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPages, createPage, updatePage, deletePage } from '../../api/pageApi';
import apiClient from '../../api/apiClient';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import toast from 'react-hot-toast';
import { Editor } from '@tinymce/tinymce-react';

export default function ManagePagesPage() {
    const { user } = useAuth();
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPage, setEditingPage] = useState(null);
    const [pageForm, setPageForm] = useState({
        title: '',
        slug: '',
        content: '',
        tag: '',
        imageUrl: '',
        isPublished: true
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // TinyMCE API key (you can get a free one at https://www.tiny.cloud)
    const apiKey = '0qxlgx6zyabda5in2zsxtq802jlyj9ccmn617pnhum9vt97j'; // Using free version without API key
    
    // Ref for ReactQuill
    const quillRef = useRef(null);

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        try {
            setLoading(true);
            // Admin cần xem cả trang đã xuất bản và nháp
            const response = await getPages({ isPublished: null });
            setPages(response.data || []);
        } catch (err) {
            console.error('Error loading pages:', err);
            toast.error('Không thể tải danh sách trang');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setPageForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageUpload = async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await apiClient.post('/api/Page/upload-image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            return response.data.imageUrl;
        } catch (err) {
            console.error('Error uploading image:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Không thể upload ảnh';
            toast.error(errorMsg);
            throw err;
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn file ảnh');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Kích thước file không được vượt quá 5MB');
            return;
        }

        try {
            const loadingToast = toast.loading('Đang upload ảnh...');
            const imageUrl = await handleImageUpload(file);
            setPageForm(prev => ({ ...prev, imageUrl }));
            toast.success('Upload ảnh thành công', { id: loadingToast });
        } catch (err) {
            // Error already handled in handleImageUpload
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!pageForm.title || pageForm.title.trim() === '') {
            const errorMsg = 'Vui lòng nhập tiêu đề trang';
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        try {
            if (editingPage) {
                // Update existing page
                await updatePage(editingPage.id, {
                    title: pageForm.title,
                    slug: pageForm.slug, // Keep existing slug or let backend handle
                    content: pageForm.content,
                    tag: pageForm.tag,
                    imageUrl: pageForm.imageUrl,
                    isPublished: pageForm.isPublished
                });
                setSuccess('Cập nhật trang thành công');
                toast.success('Cập nhật trang thành công');
            } else {
                // Create new page - slug will be auto-generated
                await createPage({
                    title: pageForm.title,
                    slug: null, // Let backend auto-generate
                    content: pageForm.content,
                    tag: pageForm.tag,
                    imageUrl: pageForm.imageUrl,
                    isPublished: pageForm.isPublished
                });
                setSuccess('Tạo trang mới thành công');
                toast.success('Tạo trang mới thành công');
            }

            // Reset form and reload pages
            setPageForm({
                title: '',
                slug: '',
                content: '',
                tag: '',
                imageUrl: '',
                isPublished: true
            });
            setEditingPage(null);
            setShowModal(false);
            loadPages();
        } catch (err) {
            console.error('Error saving page:', err);
            const errorMsg = editingPage ? 'Không thể cập nhật trang' : 'Không thể tạo trang mới';
            setError(errorMsg);
            toast.error(errorMsg);
        }
    };

    const handleEdit = (page) => {
        setEditingPage(page);
        setPageForm({
            title: page.title,
            slug: page.slug,
            content: page.content,
            tag: page.tag || '',
            imageUrl: page.imageUrl || '',
            isPublished: page.isPublished
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa trang này?')) {
            return;
        }

        try {
            await deletePage(id);
            toast.success('Xóa trang thành công');
            loadPages();
        } catch (err) {
            console.error('Error deleting page:', err);
            toast.error('Không thể xóa trang');
        }
    };

    const openModal = () => {
        setEditingPage(null);
        setPageForm({
            title: '',
            slug: '',
            content: '',
            isPublished: true
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPage(null);
        setPageForm({
            title: '',
            slug: '',
            content: '',
            isPublished: true
        });
        setError('');
        setSuccess('');
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
                    <div className="space-y-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý Trang</h1>
                <Button onClick={openModal} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">Tạo trang mới</Button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-700 dark:text-green-300">{success}</p>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Tiêu đề
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Slug
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Trạng thái
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Tag
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {pages.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                    Chưa có trang nào
                                </td>
                            </tr>
                        ) : (
                            pages.map((page) => (
                                <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{page.title}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{page.slug}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${page.isPublished ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                                            {page.isPublished ? 'Đã xuất bản' : 'Nháp'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {page.tag ? (
                                            <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                                {page.tag}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleEdit(page)}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                                                title="Sửa"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(page.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                title="Xóa"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Page Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingPage ? 'Chỉnh sửa trang' : 'Tạo trang mới'}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tiêu đề *
                                    </label>
                                    <Input
                                        type="text"
                                        name="title"
                                        value={pageForm.title}
                                        onChange={handleInputChange}
                                        placeholder="Nhập tiêu đề trang"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tag
                                    </label>
                                    <Input
                                        type="text"
                                        name="tag"
                                        value={pageForm.tag}
                                        onChange={handleInputChange}
                                        placeholder="Ví dụ: Chó, Mèo, Thức ăn, Sức khỏe..."
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Tag để phân loại bài viết (Chó, Mèo, Thức ăn, Sức khỏe, ...)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Ảnh đại diện
                                    </label>
                                    <div className="space-y-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Chọn ảnh từ máy tính của bạn (JPG, PNG, GIF, WEBP - tối đa 5MB)
                                        </p>
                                        {pageForm.imageUrl && (
                                            <div className="mt-2">
                                                <img
                                                    src={pageForm.imageUrl}
                                                    alt="Preview"
                                                    className="max-w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setPageForm(prev => ({ ...prev, imageUrl: '' }))}
                                                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                                                >
                                                    Xóa ảnh
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nội dung
                                    </label>
                                    <Editor
                                        apiKey={apiKey}
                                        value={pageForm.content || ''}
                                        onEditorChange={(content) => {
                                            setPageForm(prev => ({ ...prev, content: content || '' }));
                                        }}
                                        init={{
                                            height: 400,
                                            menubar: false,
                                            plugins: [
                                                'advlist autolink lists link image charmap print preview anchor',
                                                'searchreplace visualblocks code fullscreen',
                                                'insertdatetime media table paste code help wordcount'
                                            ],
                                            toolbar: 'undo redo | formatselect | ' +
                                                'bold italic backcolor | alignleft aligncenter ' +
                                                'alignright alignjustify | bullist numlist outdent indent | ' +
                                                'removeformat | help',
                                            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                            encoding: 'utf8'
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="isPublished"
                                            id="isPublished"
                                            checked={pageForm.isPublished}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-900 dark:text-white">
                                            Xuất bản ngay
                                        </label>
                                    </div>
                                    {editingPage && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={async () => {
                                                try {
                                                    await updatePage(editingPage.id, {
                                                        isPublished: !pageForm.isPublished
                                                    });
                                                    setPageForm(prev => ({ ...prev, isPublished: !prev.isPublished }));
                                                    toast.success(`Đã ${!pageForm.isPublished ? 'xuất bản' : 'ẩn'} bài viết`);
                                                    loadPages();
                                                } catch (err) {
                                                    toast.error('Không thể cập nhật trạng thái');
                                                }
                                            }}
                                        >
                                            {pageForm.isPublished ? 'Ẩn bài viết' : 'Xuất bản bài viết'}
                                        </Button>
                                    )}
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <Button type="button" variant="outline" onClick={closeModal}>
                                        Hủy
                                    </Button>
                                    <Button type="submit" className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                                        {editingPage ? 'Cập nhật' : 'Tạo trang'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}