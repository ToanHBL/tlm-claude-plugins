import { ReactNode } from 'react';

// In-house primitive styled with Tailwind CSS (no external UI kit).
type Color = 'primary' | 'secondary' | 'danger' | 'white';
type Variant = 'solid' | 'bordered' | 'light';
type Size = 'sm' | 'md' | 'lg';

interface BaseButtonProps {
  as?: 'button' | 'span';
  type?: 'button' | 'submit';
  color?: Color;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
  children?: ReactNode;
}

const colorClasses: Record<Color, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
  white: 'bg-white text-gray-800 hover:bg-gray-50 border-gray-300',
};

const variantClasses: Record<Variant, string> = {
  solid: '',
  bordered: '!bg-transparent border',
  light: '!bg-transparent border-transparent',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-2.5 py-1 rounded-md',
  md: 'text-sm px-4 py-2 rounded-md',
  lg: 'text-base px-6 py-3 rounded-md',
};

export default function BaseButton({
  as = 'button',
  type = 'button',
  color = 'primary',
  variant = 'solid',
  size = 'md',
  isLoading = false,
  disabled = false,
  onClick,
  className,
  title,
  children,
}: BaseButtonProps) {
  const textColor = variant === 'solid' ? '' : color === 'danger' ? '!text-red-600' : color === 'secondary' ? '!text-gray-700' : '!text-blue-600';
  const classes = `inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses[color]} ${variantClasses[variant]} ${textColor} ${sizeClasses[size]} ${className || ''}`;
  const content = isLoading ? '…' : children;

  if (as === 'span') {
    return (
      <span className={`${classes} cursor-pointer`} onClick={onClick} title={title}>
        {content}
      </span>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || isLoading} onClick={onClick} title={title}>
      {content}
    </button>
  );
}
