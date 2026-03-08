import { getAvatarFallback } from '@/lib/avatar';

type UserAvatarProps = {
  name?: string | null;
  image?: string | null;
  sizeClassName?: string;
  textClassName?: string;
  className?: string;
};

export function UserAvatar({
  name,
  image,
  sizeClassName = 'h-8 w-8',
  textClassName = 'text-sm',
  className = '',
}: UserAvatarProps) {
  const { initial, colorClass } = getAvatarFallback(name);
  const baseClass = `inline-flex shrink-0 items-center justify-center rounded-full font-semibold overflow-hidden ${sizeClassName} ${textClassName} ${className}`;

  if (image && image.trim().length > 0) {
    return (
      <span
        className={baseClass}
        style={{
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-label={`${name || 'User'} avatar`}
      />
    );
  }

  return <span className={`${baseClass} ${colorClass}`}>{initial}</span>;
}
