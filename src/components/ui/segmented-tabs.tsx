'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SegmentedTabItem<T extends string = string> = {
  id: T;
  label: ReactNode;
  icon?: React.ElementType;
  count?: number;
  disabled?: boolean;
};

type Size = 'sm' | 'md';

const sizeStyles: Record<
  Size,
  { list: string; trigger: string; icon: string; count: string }
> = {
  sm: {
    list: 'p-0.5',
    trigger: 'h-7 gap-1 px-2.5 text-xs',
    icon: 'h-3 w-3',
    count: 'text-[10px]',
  },
  md: {
    list: 'p-1',
    trigger: 'h-9 gap-1.5 px-3.5 text-sm sm:px-4',
    icon: 'h-3.5 w-3.5',
    count: 'text-xs',
  },
};

export function SegmentedTabs<T extends string>({
  items,
  value,
  onValueChange,
  size = 'md',
  className,
  listClassName,
  'aria-label': ariaLabel = 'Tabs',
}: {
  items: readonly SegmentedTabItem<T>[];
  value: T;
  onValueChange: (id: T) => void;
  size?: Size;
  className?: string;
  listClassName?: string;
  'aria-label'?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const styles = sizeStyles[size];

  const measure = useCallback(() => {
    const list = listRef.current;
    const btn = btnRefs.current.get(value);
    if (!list || !btn) return;
    const listRect = list.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - listRect.left,
      width: btnRect.width,
      ready: true,
    });
  }, [value]);

  useLayoutEffect(() => {
    measure();
  }, [measure, items]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(list);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return (
    <div className={cn('min-w-0', className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          'relative inline-flex w-max max-w-none items-center rounded-full bg-muted',
          styles.list,
          listClassName
        )}
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute z-0 rounded-full bg-card shadow-sm',
            'transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            size === 'sm' ? 'top-0.5 bottom-0.5' : 'top-1 bottom-1',
            indicator.ready ? 'opacity-100' : 'opacity-0'
          )}
          style={{ left: indicator.left, width: indicator.width }}
        />
        {items.map((item) => {
          const active = value === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              ref={(el) => {
                if (el) btnRefs.current.set(item.id, el);
                else btnRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={item.disabled}
              onClick={() => onValueChange(item.id)}
              className={cn(
                'relative z-10 inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors duration-200',
                styles.trigger,
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                item.disabled && 'pointer-events-none opacity-50'
              )}
            >
              {Icon ? <Icon className={styles.icon} /> : null}
              <span>{item.label}</span>
              {typeof item.count === 'number' ? (
                <span
                  className={cn(
                    'tabular-nums text-muted-foreground',
                    styles.count
                  )}
                >
                  ({item.count})
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Compact native select styled to match SegmentedTabs height. */
export function CompactSelect({
  className,
  controlSize = 'sm',
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  controlSize?: Size;
}) {
  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center',
        controlSize === 'sm' ? 'max-w-[10rem]' : 'max-w-[12.5rem]'
      )}
    >
      <select
        {...props}
        className={cn(
          'w-full appearance-none rounded-full border border-border bg-card font-medium text-foreground shadow-sm outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring/40',
          controlSize === 'sm'
            ? 'h-7 truncate py-0 pl-2.5 pr-7 text-xs'
            : 'h-9 truncate py-0 pl-3.5 pr-8 text-sm',
          className
        )}
      />
      <ChevronDown
        aria-hidden
        className={cn(
          'pointer-events-none absolute right-2 text-muted-foreground',
          controlSize === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
        )}
        strokeWidth={2.4}
      />
    </div>
  );
}
