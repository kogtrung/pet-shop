import React from 'react';

export function SkeletonCard() {
    return (
        <div className="bg-white rounded-card shadow-soft overflow-hidden animate-pulse">
            <div className="h-56 bg-softGray"></div>
            <div className="p-l space-y-3">
                <div className="h-4 bg-softGray rounded w-1/3"></div>
                <div className="h-6 bg-softGray rounded w-3/4"></div>
                <div className="flex justify-between items-center">
                    <div className="h-8 bg-softGray rounded w-1/3"></div>
                    <div className="h-10 bg-softGray rounded w-1/3"></div>
                </div>
            </div>
        </div>
    );
}

export function SkeletonTable({ rows = 5 }) {
    return (
        <div className="bg-white rounded-card shadow-soft overflow-hidden animate-pulse">
            <div className="p-4 border-b border-softGray">
                <div className="h-6 bg-softGray rounded w-1/4"></div>
            </div>
            <div className="divide-y divide-softGray">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="p-4 flex gap-4">
                        <div className="h-5 bg-softGray rounded flex-1"></div>
                        <div className="h-5 bg-softGray rounded flex-1"></div>
                        <div className="h-5 bg-softGray rounded flex-1"></div>
                        <div className="h-5 bg-softGray rounded w-20"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonText({ lines = 3 }) {
    return (
        <div className="space-y-3 animate-pulse">
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="h-4 bg-softGray rounded"
                    style={{ width: `${100 - (i * 10)}%` }}
                ></div>
            ))}
        </div>
    );
}
