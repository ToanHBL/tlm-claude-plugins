import { PropsWithChildren } from 'react';

// Basic typography component (PREFERRED over raw <p>/<span>).
export default function Text(
  props: PropsWithChildren & {
    className?: string | undefined;
    text: string | null | undefined;
    colon?: boolean | undefined;
    uppercase?: boolean | undefined;
  },
) {
  const computedText = () => {
    if (props.uppercase) {
      return props.text?.toUpperCase();
    }
    return props.text;
  };

  return (
    <p data-component="Text" className={`${props.className || ''}`}>
      {computedText()}
      {props.colon ? ': ' : ''}
    </p>
  );
}
