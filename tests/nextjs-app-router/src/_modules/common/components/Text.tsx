import { PropsWithChildren } from 'react';

// Basic typography component (PREFERRED over raw <p>/<span>).
export default function Text(
  props: PropsWithChildren & {
    className?: string | undefined;
    text: string | null | undefined;
    colon?: boolean | undefined;
    uppercase?: boolean | undefined;
    reactNodeSuffix?: React.ReactNode | undefined;
  },
) {
  const computedText = () => {
    if (props.uppercase) {
      return props.text?.toUpperCase();
    }
    return props.text;
  };

  return (
    <p className={`${props.className || ''}`}>
      {computedText()}
      {props.colon ? ': ' : ''}
      {!!props.reactNodeSuffix && props.reactNodeSuffix}
    </p>
  );
}
