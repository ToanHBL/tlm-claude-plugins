import { PropsWithChildren } from 'react';

// Basic structural container (PREFERRED over raw <div>).
export default function Box(props: PropsWithChildren & { className?: string | undefined }) {
  return (
    <div data-component="Box" className={`${props.className || ''}`}>
      {props.children}
    </div>
  );
}
