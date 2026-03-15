import React, { useEffect, useMemo, useState } from 'react';
import {
    fetchServices,
    createService,
    updateService,
    deleteService,
    createServicePackage,
    updateServicePackage,
    deleteServicePackage,
    getServiceStaff,
    assignStaffToService,
    removeStaffAssignment
} from '../../api/serviceApi.js';
import { getAllUsers } from '../../api/userApi.js';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button.jsx';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    Squares2X2Icon,
    Cog8ToothIcon,
    BoltIcon
} from '@heroicons/react/24/outline';

const PRICE_TYPE_OPTIONS = [
    { value: 'PerDay', label: 'Tính theo ngày' },
    { value: 'PerHour', label: 'Tính theo giờ' },
    { value: 'Fixed', label: 'Giá cố định' }
];

export default function ManageServicesPage() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showServiceModal, setShowServiceModal] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [serviceForm, setServiceForm] = useState({
        name: '',
        description: '',
        priceType: 'PerDay',
        isActive: true
    });

    const [showPackageModal, setShowPackageModal] = useState(false);
    const [packageModalService, setPackageModalService] = useState(null);
    const [editingPackage, setEditingPackage] = useState(null);
    const [packageForm, setPackageForm] = useState({
        name: '',
        price: '',
        description: '',
        durationMinutes: '',
        isActive: true
    });

    // Staff Assignment Modal
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [staffModalService, setStaffModalService] = useState(null);
    const [assignedStaff, setAssignedStaff] = useState([]);
    const [availableServiceStaff, setAvailableServiceStaff] = useState([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [assignmentNote, setAssignmentNote] = useState('');
    
    const resetServiceForm = () => {
        setServiceForm({
            name: '',
            description: '',
            priceType: 'PerDay',
            isActive: true
        });
        setEditingService(null);
    };

    const resetPackageForm = () => {
        setPackageForm({
            name: '',
            price: '',
            description: '',
            durationMinutes: '',
            isActive: true
        });
        setEditingPackage(null);
    };

    const loadServices = async () => {
        setLoading(true);
        try {
            const response = await fetchServices();
            setServices(response.data || []);
        } catch (error) {
            console.error('Failed to load services', error);
            toast.error('Không thể tải danh sách dịch vụ');
            setServices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadServices();
    }, []);

    const openCreateServiceModal = () => {
        resetServiceForm();
        setShowServiceModal(true);
    };

    const openEditServiceModal = (service) => {
        setEditingService(service);
        setServiceForm({
            name: service.name || '',
            description: service.description || '',
            priceType: service.priceType || 'PerDay',
            isActive: service.isActive !== false
        });
        setShowServiceModal(true);
    };

    const closeServiceModal = () => {
        setShowServiceModal(false);
        resetServiceForm();
    };

    const handleServiceFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setServiceForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSaveService = async (e) => {
        e.preventDefault();
        if (!serviceForm.name.trim()) {
            toast.error('Vui lòng nhập tên dịch vụ');
            return;
        }

        const payload = {
            name: serviceForm.name,
            description: serviceForm.description || undefined,
            priceType: serviceForm.priceType,
            isActive: serviceForm.isActive
        };

        const loadingToast = toast.loading(editingService ? 'Đang cập nhật dịch vụ...' : 'Đang tạo dịch vụ...');
        try {
            if (editingService) {
                await updateService(editingService.id, payload);
                toast.success('Cập nhật dịch vụ thành công', { id: loadingToast });
            } else {
                await createService(payload);
                toast.success('Tạo dịch vụ thành công', { id: loadingToast });
            }
            closeServiceModal();
            loadServices();
        } catch (error) {
            console.error('Failed to save service', error);
            const details = error.response?.data?.error || 'Không thể lưu dịch vụ';
            toast.error(details, { id: loadingToast });
        }
    };

    const handleDeleteService = async (serviceId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa dịch vụ này?')) return;
        const toastId = toast.loading('Đang xóa dịch vụ...');
        try {
            await deleteService(serviceId);
            toast.success('Đã xóa dịch vụ', { id: toastId });
            loadServices();
        } catch (error) {
            console.error('Failed to delete service', error);
            const message = error.response?.data?.error || 'Không thể xóa dịch vụ';
            toast.error(message, { id: toastId });
        }
    };

    const openPackageModal = (service) => {
        setPackageModalService(service);
        resetPackageForm();
        setShowPackageModal(true);
    };

    const closePackageModal = () => {
        setShowPackageModal(false);
        setPackageModalService(null);
        resetPackageForm();
    };

    const handlePackageFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setPackageForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleEditPackage = (pkg) => {
        setEditingPackage(pkg);
        setPackageForm({
            name: pkg.name || '',
            price: pkg.price != null ? pkg.price : '',
            description: pkg.description || '',
            durationMinutes: pkg.durationMinutes != null ? pkg.durationMinutes : '',
            isActive: pkg.isActive !== false
        });
    };

    const handleSavePackage = async (e) => {
        e.preventDefault();
        if (!packageModalService) return;
        if (!packageForm.name.trim()) {
            toast.error('Vui lòng nhập tên gói dịch vụ');
            return;
        }
        if (!packageForm.price || Number(packageForm.price) <= 0) {
            toast.error('Vui lòng nhập giá hợp lệ');
            return;
        }

        const payload = {
            name: packageForm.name,
            price: parseFloat(packageForm.price),
            description: packageForm.description || undefined,
            durationMinutes: packageForm.durationMinutes ? parseInt(packageForm.durationMinutes, 10) : undefined,
            isActive: packageForm.isActive
        };

        const toastId = toast.loading(editingPackage ? 'Đang cập nhật gói dịch vụ...' : 'Đang tạo gói dịch vụ...');
        try {
            if (editingPackage) {
                await updateServicePackage(editingPackage.id, payload);
                toast.success('Cập nhật gói dịch vụ thành công', { id: toastId });
            } else {
                await createServicePackage(packageModalService.id, payload);
                toast.success('Thêm gói dịch vụ thành công', { id: toastId });
            }
            await loadServices();
            const updatedService = (await fetchServices()).data.find((s) => s.id === packageModalService.id);
            setPackageModalService(updatedService || null);
            resetPackageForm();
        } catch (error) {
            console.error('Failed to save service package', error);
            const message = error.response?.data?.error || 'Không thể lưu gói dịch vụ';
            toast.error(message, { id: toastId });
        }
    };

    const handleDeletePackage = async (pkgId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa gói dịch vụ này?')) return;
        const toastId = toast.loading('Đang xóa gói dịch vụ...');
        try {
            await deleteServicePackage(pkgId);
            toast.success('Đã xóa gói dịch vụ', { id: toastId });
            await loadServices();
            if (packageModalService) {
                const updatedService = (await fetchServices()).data.find((s) => s.id === packageModalService.id);
                setPackageModalService(updatedService || null);
            }
        } catch (error) {
            console.error('Failed to delete service package', error);
            const message = error.response?.data?.error || 'Không thể xóa gói dịch vụ';
            toast.error(message, { id: toastId });
        }
    };

    const servicesWithPackagesCount = useMemo(() => {
        return services.map((service) => ({
            ...service,
            packageCount: service.packages?.length || 0
        }));
    }, [services]);

    // Staff Assignment Functions
    const openStaffModal = async (service) => {
        setStaffModalService(service);
        setShowStaffModal(true);
        await loadStaffData(service.id);
    };

    const closeStaffModal = () => {
        setShowStaffModal(false);
        setStaffModalService(null);
        setAssignedStaff([]);
        setSelectedStaffId('');
        setAssignmentNote('');
    };

    const loadStaffData = async (serviceId) => {
        setLoadingStaff(true);
        try {
            // Load danh sách nhân viên đã được phân công
            const assignedRes = await getServiceStaff(serviceId);
            setAssignedStaff(assignedRes.data || []);

            // Load tất cả ServiceStaff
            const usersRes = await getAllUsers();
            const allUsers = usersRes.data || [];
            const serviceStaff = allUsers.filter(u => 
                u.roles?.includes('ServiceStaff') || u.role === 'ServiceStaff'
            );
            setAvailableServiceStaff(serviceStaff);
        } catch (error) {
            console.error('Error loading staff data:', error);
            toast.error('Không thể tải thông tin nhân viên');
        } finally {
            setLoadingStaff(false);
        }
    };

    const handleAssignStaff = async () => {
        if (!selectedStaffId) {
            toast.error('Vui lòng chọn nhân viên');
            return;
        }

        const toastId = toast.loading('Đang phân công nhân viên...');
        try {
            await assignStaffToService(staffModalService.id, {
                staffId: selectedStaffId,
                note: assignmentNote || null
            });
            toast.success('Phân công nhân viên thành công', { id: toastId });
            await loadStaffData(staffModalService.id);
            setSelectedStaffId('');
            setAssignmentNote('');
        } catch (error) {
            console.error('Error assigning staff:', error);
            const message = error.response?.data?.error || 'Không thể phân công nhân viên';
            toast.error(message, { id: toastId });
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa phân công này?')) return;
        
        const toastId = toast.loading('Đang xóa phân công...');
        try {
            await removeStaffAssignment(assignmentId);
            toast.success('Đã xóa phân công', { id: toastId });
            await loadStaffData(staffModalService.id);
        } catch (error) {
            console.error('Error removing assignment:', error);
            const message = error.response?.data?.error || 'Không thể xóa phân công';
            toast.error(message, { id: toastId });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý dịch vụ</h1>
                    <p className="text-gray-600 dark:text-gray-400">Tạo và quản lý các dịch vụ chăm sóc thú cưng</p>
                </div>
                <Button onClick={openCreateServiceModal} className="flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Thêm dịch vụ
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
                ) : servicesWithPackagesCount.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                        Chưa có dịch vụ nào. Nhấn "Thêm dịch vụ" để bắt đầu.
                </div>
            ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Tên dịch vụ</th>
                                    <th className="px-4 py-3 text-left">Loại giá</th>
                                    <th className="px-4 py-3 text-left">Số gói</th>
                                    <th className="px-4 py-3 text-left">Ngày tạo</th>
                                    <th className="px-4 py-3 text-left">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {servicesWithPackagesCount.map((service) => (
                                    <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                        <td className="px-4 py-3">
                                                    <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                                            {service.description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                                    {service.description}
                                                </p>
                                                    )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {PRICE_TYPE_OPTIONS.find((opt) => opt.value === service.priceType)?.label || 'PerDay'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {service.packageCount}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {service.createdAt ? new Date(service.createdAt).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                service.isActive 
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                {service.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openPackageModal(service)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                                                    title="Quản lý gói dịch vụ"
                                                >
                                                    <Squares2X2Icon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => openStaffModal(service)}
                                                    className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                                                    title="Phân công nhân viên"
                                                >
                                                    <Cog8ToothIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => openEditServiceModal(service)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                    title="Chỉnh sửa"
                                                >
                                                    <PencilIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteService(service.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                    title="Xóa"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                </div>

            {/* Service Modal */}
            {showServiceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Cog8ToothIcon className="w-6 h-6" />
                                {editingService ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}
                            </h2>
                            <button onClick={closeServiceModal} className="text-gray-500 hover:text-gray-700">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveService} className="px-6 py-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tên dịch vụ *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={serviceForm.name}
                                    onChange={handleServiceFormChange}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ví dụ: Tắm & Chải lông"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Mô tả
                                </label>
                                <textarea
                                    name="description"
                                    value={serviceForm.description}
                                    onChange={handleServiceFormChange}
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Mô tả ngắn gọn dịch vụ"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Loại giá
                                    </label>
                                    <select
                                        name="priceType"
                                        value={serviceForm.priceType}
                                        onChange={handleServiceFormChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {PRICE_TYPE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 mt-6 md:mt-0">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={serviceForm.isActive}
                                        onChange={handleServiceFormChange}
                                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Đang hoạt động</span>
                                </label>
                                </div>

                            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 text-sm text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
                                <BoltIcon className="w-5 h-5 mt-0.5" />
                                <p>
                                    Sau khi tạo dịch vụ, bạn có thể thêm nhiều gói khác nhau (ví dụ: Basic, VIP) với mức giá riêng bằng nút "Quản lý gói".
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Button type="button" variant="outline" onClick={closeServiceModal}>
                                    Hủy
                                </Button>
                                <Button type="submit">
                                    {editingService ? 'Lưu thay đổi' : 'Tạo dịch vụ'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Package Modal */}
            {showPackageModal && packageModalService && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Squares2X2Icon className="w-6 h-6" />
                                    Gói dịch vụ cho "{packageModalService.name}"
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Quản lý các gói giá/đặc tả dành cho dịch vụ này
                                </p>
                            </div>
                            <button onClick={closePackageModal} className="text-gray-500 hover:text-gray-700">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                            </div>

                        <div className="px-6 py-4 space-y-6">
                            <form onSubmit={handleSavePackage} className="space-y-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Tên gói *
                                </label>
                                <input
                                            type="text"
                                            name="name"
                                            value={packageForm.name}
                                            onChange={handlePackageFormChange}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ví dụ: Standard, VIP"
                                />
                            </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Giá (₫ / ngày) *
                                        </label>
                                    <input
                                            type="number"
                                            name="price"
                                            value={packageForm.price}
                                            onChange={handlePackageFormChange}
                                            min="0"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ví dụ: 250000"
                                    />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Thời lượng (phút)
                                </label>
                                        <input
                                            type="number"
                                            name="durationMinutes"
                                            value={packageForm.durationMinutes}
                                            onChange={handlePackageFormChange}
                                            min="0"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ví dụ: 60"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 mt-6 md:mt-0">
                                    <input
                                        type="checkbox"
                                            name="isActive"
                                            checked={packageForm.isActive}
                                            onChange={handlePackageFormChange}
                                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Đang hoạt động</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mô tả gói
                                    </label>
                                    <textarea
                                        name="description"
                                        value={packageForm.description}
                                        onChange={handlePackageFormChange}
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Mô tả chi tiết gói"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button type="button" variant="outline" onClick={resetPackageForm}>
                                        Làm mới
                                    </Button>
                                    <Button type="submit">
                                        {editingPackage ? 'Cập nhật gói' : 'Thêm gói'}
                                    </Button>
                            </div>
                            </form>

                            <div className="bg-white dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Danh sách gói dịch vụ</h3>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {packageModalService.packages?.length ? (
                                        packageModalService.packages.map((pkg) => (
                                            <div key={pkg.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{pkg.name}</p>
                                                    {pkg.description && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{pkg.description}</p>
                                                    )}
                                                    <p className="text-sm text-indigo-600 mt-1">{pkg.price.toLocaleString('vi-VN')} ₫ / lượt</p>
                                                    {pkg.durationMinutes != null && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Thời lượng: {pkg.durationMinutes} phút
                                                        </p>
                                                    )}
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold mt-2 ${
                                                            pkg.isActive
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}
                                                    >
                                                        {pkg.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                <button
                                                        onClick={() => handleEditPackage(pkg)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                        title="Chỉnh sửa gói"
                                >
                                                        <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                                        onClick={() => handleDeletePackage(pkg.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                        title="Xóa gói"
                                >
                                                        <TrashIcon className="w-4 h-4" />
                                </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                            Chưa có gói dịch vụ nào. Hãy thêm gói mới ở biểu mẫu phía trên.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Assignment Modal */}
            {showStaffModal && staffModalService && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Phân công nhân viên - {staffModalService.name}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Gán nhân viên dịch vụ cho dịch vụ này
                                </p>
                            </div>
                            <button
                                onClick={closeStaffModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Add Staff Form */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Thêm nhân viên mới
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Chọn nhân viên
                                        </label>
                                        <select
                                            value={selectedStaffId}
                                            onChange={(e) => setSelectedStaffId(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="">-- Chọn nhân viên --</option>
                                            {availableServiceStaff
                                                .filter(staff => !assignedStaff.some(a => a.staffId === staff.id))
                                                .map(staff => (
                                                    <option key={staff.id} value={staff.id}>
                                                        {staff.fullName || staff.username || staff.email || staff.id}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Ghi chú (tùy chọn)
                                        </label>
                                        <input
                                            type="text"
                                            value={assignmentNote}
                                            onChange={(e) => setAssignmentNote(e.target.value)}
                                            placeholder="VD: Chuyên về tắm rửa, cắt tỉa lông..."
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleAssignStaff}
                                        disabled={!selectedStaffId || loadingStaff}
                                        className="w-full"
                                    >
                                        Phân công nhân viên
                                    </Button>
                                </div>
                            </div>

                            {/* Assigned Staff List */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Nhân viên đã được phân công ({assignedStaff.length})
                                </h3>
                                {loadingStaff ? (
                                    <div className="text-center py-8">
                                        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : assignedStaff.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        Chưa có nhân viên nào được phân công
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {assignedStaff.map((assignment) => (
                                            <div
                                                key={assignment.id}
                                                className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {assignment.staffName || assignment.staffEmail || assignment.staffId}
                                                    </p>
                                                    {assignment.note && (
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                            {assignment.note}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        Phân công: {new Date(assignment.createdAt).toLocaleDateString('vi-VN')}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveAssignment(assignment.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                    title="Xóa phân công"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
