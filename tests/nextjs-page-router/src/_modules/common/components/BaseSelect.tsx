import { forwardRef, SelectHTMLAttributes } from 'react';
import Col from '@/_modules/common/components/Col';
import Text from '@/_modules/common/components/Text';
import { EnumOption } from '@/_modules/config/enums';

// In-house primitive styled with Tailwind CSS. Forwards ref for register().
interface BaseSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  isInvalid?: boolean;
  errorMessage?: string;
  options: EnumOption[];
}

const BaseSelect = forwardRef<HTMLSelectElement, BaseSelectProps>(function BaseSelect(
  { label, isInvalid, errorMessage, options, className, ...props },
  ref,
) {
  return (
    <Col className="gap-1">
      {label ? <Text text={label} className="text-sm font-medium text-gray-700" /> : null}
      <select
        ref={ref}
        className={`h-10 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
          isInvalid ? 'border-red-500' : 'border-gray-300'
        } ${className || ''}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isInvalid && errorMessage ? <Text text={errorMessage} className="text-sm text-red-500" /> : null}
    </Col>
  );
});

export default BaseSelect;
