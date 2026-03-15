import React from 'react';

export default function Input({
    label,
    error,
    helperText,
    className = '',
    wrapperClassName = '',
    ...props
}) {
    const baseStyles = 'w-full px-4 py-2.5 text-textDark bg-white border rounded-image transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const stateStyles = error
        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
        : 'border-textDark/20 focus:border-primary focus:ring-primary/20';

    return (
        <div className={wrapperClassName}>
            {label && (
                <label className="block text-sm font-heading font-medium text-textDark mb-2">
                    {label}
                </label>
            )}
            <input
                className={`${baseStyles} ${stateStyles} ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-1.5 text-sm text-red-600">{error}</p>
            )}
            {helperText && !error && (
                <p className="mt-1.5 text-sm text-textDark/70">{helperText}</p>
            )}
        </div>
    );
}
