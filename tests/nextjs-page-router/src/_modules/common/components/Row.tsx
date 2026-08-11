import { PropsWithChildren } from 'react';

// Basic structural component — flex row (PREFERRED over raw <div>).
export default function Row(props: PropsWithChildren & { className?: string | undefined }) {
  return (
    <div data-component="Row" className={`flex flex-row ${props.className || ''}`}>
      {props.children}
    </div>
  );
}
