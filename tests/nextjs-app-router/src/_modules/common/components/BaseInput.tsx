import { forwardRef, InputHTMLAttributes } from 'react';
import cn from '@/_modules/common/utils/cn';
import Col from '@/_modules/common/components/Col';

interface BaseInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  isInvalid?: boolean;
  errorMessage?: string;
  isRequired?: boolean;
}

// In-house primitive styled with Tailwind CSS. Forwards the ref so RHF register()
// binds directly to the DOM input (register-first — see shared/05).
const BaseInput = forwardRef<HTMLInputElement, BaseInputProps>(function BaseInput(
  { label, isInvalid, errorMessage, isRequired, className, id, name, ...props },
  ref,
) {
  const inputId = id || name;

  return (
    <Col className="gap-1">
      {!!label && (
        <label htmlFor={inputId} className="text-sm font-medium text-secondary">
          {label}
          {isRequired && <span className="text-danger"> *</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        ref={ref}
        aria-invalid={isInvalid}
        className={cn(
          'h-10 rounded-small border px-3 text-base outline-none transition-colors',
          'focus:border-primary focus:ring-1 focus:ring-primary',
          isInvalid ? 'border-danger' : 'border-gray-300',
          className,
        )}
        {...props}
      />
      {isInvalid && !!errorMessage && <span className="text-sm text-danger">{errorMessage}</span>}
    </Col>
  );
});

export default BaseInput;
