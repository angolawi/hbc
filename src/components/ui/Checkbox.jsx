import { Check } from 'lucide-react';
import { cn } from './Button';

export function Checkbox({ checked, onChange, label, className }) {
  return (
    <label className={cn("flex items-center gap-3 cursor-pointer group", className)}>
      <div className="relative flex flex-shrink-0 items-center justify-center">
        <input 
          type="checkbox" 
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <div className="w-4 h-4 border border-zinc-700 rounded bg-zinc-900 peer-checked:bg-zinc-100 peer-checked:border-zinc-100 transition-colors flex items-center justify-center group-hover:border-zinc-500">
          <Check size={12} strokeWidth={4} className="text-zinc-900 opacity-0 peer-checked:opacity-100 transition-opacity" />
        </div>
      </div>
      {label && <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors select-none">{label}</span>}
    </label>
  );
}
