import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  fullWidth,
  children, 
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 rounded-md';
  
  const variants = {
    primary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 shadow-sm',
    outline: 'border border-zinc-800 bg-transparent text-zinc-100 hover:bg-zinc-800 hover:text-white',
    ghost: 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50',
    danger: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-transparent'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
