import { cn, initials } from '@/lib/utils';

const PALETTE = [
  'from-lavender-300 to-lavender-500',
  'from-peach-200 to-peach-400',
  'from-butter-200 to-butter-400',
  'from-sky-200 to-sky-400',
  'from-emerald-200 to-emerald-400',
];

function paletteFor(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface AvatarProps {
  name?: string | null;
  image?: string | null;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
  className?: string;
}

const SIZES = { sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-14 w-14 text-base' };

export function Avatar({ name, image, size = 'md', online, className }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name ?? ''} className={cn('rounded-full object-cover ring-2 ring-white', SIZES[size])} />
      ) : (
        <span
          aria-hidden
          className={cn(
            'grid place-items-center rounded-full bg-gradient-to-br font-extrabold text-white ring-2 ring-white',
            paletteFor(name ?? '?'),
            SIZES[size],
          )}
        >
          {initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white',
            online ? 'bg-emerald-400' : 'bg-ink-muted/60',
          )}
        />
      )}
    </span>
  );
}
