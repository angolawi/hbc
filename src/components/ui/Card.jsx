import { cn } from './Button';

export function Card({ className, children, ...props }) {
  return (
    <div 
      className={cn(
        "bg-zinc-950/50 border border-zinc-800 rounded-xl overflow-hidden",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({ variant = 'default', className, children, ...props }) {
  const variants = {
    default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    cyan: 'bg-zinc-800/80 text-zinc-300 border-zinc-700',
    fuchsia: 'bg-zinc-800/80 text-zinc-300 border-zinc-700',
    rose: 'bg-zinc-800/80 text-zinc-300 border-zinc-700',
  };

  return (
    <span 
      className={cn(
        "px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
