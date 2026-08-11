import { forwardRef, SelectHTMLAttributes } from 'react';
import cn from '@/_modules/common/utils/cn';
import Col from '@/_modules/common/components/Col';

export interface BaseSelectOption {
  value: string;
  label: string;
}

interface BaseSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: BaseSelectOption[];
  isInvalid?: boolean;
  errorMessage?: string;
  isRequired?: boolean;
}

// In-house primitive styled with Tailwind CSS. Native <select> forwards its ref so
// register() binds directly — no Controller needed (register-first).
const BaseSelect = forwardRef<HTMLSelectElement, BaseSelectProps>(function BaseSelect(
  { label, options, isInvalid, errorMessage, isRequired, className, id, name, ...props },
  ref,
) {
  const selectId = id || name;

  return (
    <Col className="gap-1">
      {!!label && (
        <label htmlFor={selectId} className="text-sm font-medium text-secondary">
          {label}
          {isRequired && <span className="text-danger"> *</span>}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        ref={ref}
        aria-invalid={isInvalid}
        className={cn(
          'h-10 rounded-small border bg-white px-3 text-base outline-none transition-colors',
          'focus:border-primary focus:ring-1 focus:ring-primary',
          isInvalid ? 'border-danger' : 'border-gray-300',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isInvalid && !!errorMessage && <span className="text-sm text-danger">{errorMessage}</span>}
    </Col>
  );
});

export default BaseSelect;
