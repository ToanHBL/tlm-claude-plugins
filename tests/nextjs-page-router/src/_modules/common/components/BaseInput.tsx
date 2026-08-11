import { forwardRef, InputHTMLAttributes } from 'react';
import Col from '@/_modules/common/components/Col';
import Text from '@/_modules/common/components/Text';

// In-house primitive styled with Tailwind CSS. Forwards ref so register() binds
// directly to the DOM input (register-first pattern).
interface BaseInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  isInvalid?: boolean;
  errorMessage?: string;
}

const BaseInput = forwardRef<HTMLInputElement, BaseInputProps>(function BaseInput(
  { label, isInvalid, errorMessage, className, ...props },
  ref,
) {
  return (
    <Col className="gap-1">
      {label ? <Text text={label} className="text-sm font-medium text-gray-700" /> : null}
      <input
        ref={ref}
        className={`h-10 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
          isInvalid ? 'border-red-500' : 'border-gray-300'
        } ${className || ''}`}
        {...props}
      />
      {isInvalid && errorMessage ? <Text text={errorMessage} className="text-sm text-red-500" /> : null}
    </Col>
  );
});

export default BaseInput;
