import React from 'react';

export default function Select({
    label,
    error,
    helperText,
    children,
    className = '',
    wrapperClassName = '',
    ...props
}) {
    const baseStyles = 'w-full px-4 py-2.5 text-textDark bg-white border rounded-image transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer';
    
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
            <div className="relative">
                <select
                    className={`${baseStyles} ${stateStyles} ${className}`}
                    {...props}
                >
                    {children}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-textDark/50">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
            {error && (
                <p className="mt-1.5 text-sm text-red-600">{error}</p>
            )}
            {helperText && !error && (
                <p className="mt-1.5 text-sm text-textDark/70">{helperText}</p>
            )}
        </div>
    );
}
