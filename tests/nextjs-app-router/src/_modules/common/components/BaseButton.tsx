import { ButtonHTMLAttributes } from 'react';
import cn from '@/_modules/common/utils/cn';

type BaseButtonColor = 'primary' | 'secondary' | 'danger' | 'white';
type BaseButtonVariant = 'solid' | 'bordered' | 'light';
type BaseButtonSize = 'sm' | 'md' | 'lg';

interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: BaseButtonColor;
  variant?: BaseButtonVariant;
  size?: BaseButtonSize;
  isLoading?: boolean;
}

const colorClasses: Record<BaseButtonColor, string> = {
  primary: 'bg-primary text-white hover:opacity-90',
  secondary: 'bg-secondary text-white hover:opacity-90',
  danger: 'bg-danger text-white hover:opacity-90',
  white: 'bg-white text-primary border border-gray-200 hover:bg-gray-50',
};

const variantClasses: Record<BaseButtonVariant, string> = {
  solid: '',
  bordered: 'bg-transparent border border-primary text-primary hover:bg-primary/5',
  light: 'bg-transparent text-primary hover:bg-primary/5',
};

const sizeClasses: Record<BaseButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5 rounded-small',
  md: 'text-base px-4 py-2 rounded-small',
  lg: 'text-lg px-6 py-3 rounded-small',
};

// In-house primitive styled with Tailwind CSS (no external UI kit).
export default function BaseButton({
  color = 'primary',
  variant = 'solid',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: BaseButtonProps) {
  const isBordered = variant !== 'solid';

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        isBordered ? variantClasses[variant] : colorClasses[color],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
