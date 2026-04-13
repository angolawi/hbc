import { cn } from './Button';

export function Input({ className, ...props }) {
  return (
    <input 
      className={cn(
        "flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 text-white",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select 
      className={cn(
        "flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 text-white appearance-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea 
      className={cn(
        "flex min-h-[100px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 text-white resize-y",
        className
      )}
      {...props}
    />
  );
}
