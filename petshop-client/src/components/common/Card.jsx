import React from 'react';

export default function Card({
    children,
    className = '',
    padding = true,
    hover = false,
    ...props
}) {
    const baseStyles = 'bg-white rounded-card shadow-soft';
    const hoverStyles = hover ? 'transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1' : '';
    const paddingStyles = padding ? 'p-l' : '';

    return (
        <div
            className={`${baseStyles} ${hoverStyles} ${paddingStyles} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
