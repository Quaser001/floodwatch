'use client';

import { useState, ReactNode, useRef, useLayoutEffect, useCallback } from 'react';

interface CollapsiblePanelProps {
    title: string;
    subtitle?: string;
    icon: ReactNode;
    badge?: ReactNode;
    children: ReactNode;
    defaultExpanded?: boolean;
}

export default function CollapsiblePanel({
    title,
    subtitle,
    icon,
    badge,
    children,
    defaultExpanded = false
}: CollapsiblePanelProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [height, setHeight] = useState<number | 'auto'>(defaultExpanded ? 'auto' : 0);
    const [isAnimating, setIsAnimating] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Get the actual height of the content
    const getContentHeight = useCallback(() => {
        return contentRef.current?.scrollHeight || 0;
    }, []);

    // Handle click with proper height animation
    const handleToggle = () => {
        if (isAnimating) return;

        const contentHeight = getContentHeight();

        if (isExpanded) {
            // Collapsing: set explicit height first, then animate to 0
            setHeight(contentHeight);
            setIsAnimating(true);

            // Force reflow, then animate to 0
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setHeight(0);
                    setIsExpanded(false);
                });
            });
        } else {
            // Expanding: set to 0, then animate to full height
            setIsExpanded(true);
            setHeight(0);
            setIsAnimating(true);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setHeight(contentHeight);
                });
            });
        }
    };

    // Handle transition end
    const handleTransitionEnd = () => {
        setIsAnimating(false);
        if (isExpanded) {
            // Set to auto so content can resize naturally
            setHeight('auto');
        }
    };

    // Set initial height on mount
    useLayoutEffect(() => {
        if (defaultExpanded && contentRef.current) {
            setHeight('auto');
        }
    }, [defaultExpanded]);

    return (
        <div className="glass-card overflow-hidden will-change-auto">
            {/* Header - Always visible */}
            <div
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-white/[0.03] transition-colors duration-150 select-none"
                onClick={handleToggle}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xl shadow-lg flex-shrink-0">
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
                        {subtitle && (
                            <p className="text-xs text-slate-500 truncate">{subtitle}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {badge}
                    <div
                        className="text-slate-400 text-xs transition-transform duration-200 ease-out"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                        ▼
                    </div>
                </div>
            </div>

            {/* Content - Clean height animation */}
            <div
                ref={contentRef}
                className="transition-[height,opacity] duration-250 ease-out overflow-hidden"
                style={{
                    height: height === 'auto' ? 'auto' : `${height}px`,
                    opacity: isExpanded ? 1 : 0,
                }}
                onTransitionEnd={handleTransitionEnd}
            >
                <div className="px-4 pb-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
