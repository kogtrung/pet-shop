import React from 'react';

const baseStyles =
    'inline-flex items-center justify-center rounded-button font-heading font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

const variants = {
    primary: 'bg-primary text-white hover:bg-primary-600 focus:ring-primary shadow-soft hover:shadow-soft-lg',
    secondary: 'bg-secondary text-white hover:bg-secondary-600 focus:ring-secondary shadow-soft hover:shadow-soft-lg',
    accent: 'bg-primary text-white hover:bg-primary-600 focus:ring-primary shadow-soft hover:shadow-soft-lg',
    success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 shadow-soft hover:shadow-soft-lg',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-soft hover:shadow-soft-lg',
    outline: 'bg-transparent text-primary hover:bg-softBlue border-2 border-primary focus:ring-primary',
    ghost: 'bg-transparent text-textDark hover:bg-softGray focus:ring-textDark/20',
    white: 'bg-white text-textDark hover:bg-softGray border border-textDark/20 focus:ring-primary shadow-soft',
};

const sizes = {
    xs: 'text-xs px-3 py-1.5',
    sm: 'text-sm px-4 py-2',
    md: 'text-base px-5 py-2.5',
    lg: 'text-lg px-6 py-3',
    xl: 'text-xl px-8 py-4',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    leadingIcon: LeadingIcon,
    trailingIcon: TrailingIcon,
    isLoading = false,
    className = '',
    ...props
}) {
    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;
    
    return (
        <button className={classes} disabled={isLoading || props.disabled} {...props}>
            {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                </>
            ) : (
                <>
                    {LeadingIcon && <LeadingIcon className="-ml-1 mr-2 h-5 w-5" />}
                    {children}
                    {TrailingIcon && <TrailingIcon className="ml-2 -mr-1 h-5 w-5" />}
                </>
            )}
        </button>
    );
}
