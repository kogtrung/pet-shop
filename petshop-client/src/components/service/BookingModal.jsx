import React, { useState } from 'react';
import Button from '../common/Button';
import {
    XMarkIcon,
    CalendarDaysIcon,
    ClockIcon
} from '@heroicons/react/24/outline';

export default function BookingModal({ product, onClose, onConfirm }) {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        
        if (!selectedDate) {
            newErrors.date = 'Vui lòng chọn ngày';
        } else {
            const selectedDateTime = new Date(`${selectedDate}T${selectedTime || '00:00'}`);
            const now = new Date();
            if (selectedDateTime < now) {
                newErrors.date = 'Ngày giờ phải từ hiện tại trở đi';
            }
        }
        
        if (!selectedTime) {
            newErrors.time = 'Vui lòng chọn giờ';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConfirm = () => {
        if (validateForm()) {
            const bookingDateTime = new Date(`${selectedDate}T${selectedTime}`);
            onConfirm(bookingDateTime);
        }
    };

    // Generate time options (every 30 minutes from 8:00 to 18:00)
    const timeOptions = [];
    for (let hour = 8; hour <= 18; hour++) {
        for (let minute of [0, 30]) {
            if (hour === 18 && minute === 30) continue; // Skip 18:30
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            timeOptions.push(timeString);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Đặt lịch dịch vụ
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {product?.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Vui lòng chọn ngày và giờ để đặt lịch dịch vụ
                        </p>
                    </div>

                    {/* Date Picker */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <CalendarDaysIcon className="w-4 h-4 inline mr-1" />
                            Chọn ngày
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className={`w-full px-4 py-3 rounded-lg border ${
                                errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500`}
                        />
                        {errors.date && (
                            <p className="mt-1 text-sm text-red-500">{errors.date}</p>
                        )}
                    </div>

                    {/* Time Picker */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <ClockIcon className="w-4 h-4 inline mr-1" />
                            Chọn giờ
                        </label>
                        <select
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                                errors.time ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500`}
                        >
                            <option value="">Chọn giờ</option>
                            {timeOptions.map(time => (
                                <option key={time} value={time}>
                                    {time}
                                </option>
                            ))}
                        </select>
                        {errors.time && (
                            <p className="mt-1 text-sm text-red-500">{errors.time}</p>
                        )}
                    </div>

                    {/* Confirm Button */}
                    <Button
                        onClick={handleConfirm}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg"
                    >
                        Xác nhận đặt lịch
                    </Button>
                </div>
            </div>
        </div>
    );
}