import { PropsWithChildren } from 'react';

// Basic structural component — flex column (PREFERRED over raw <div>).
export default function Col(props: PropsWithChildren & { className?: string | undefined }) {
  return (
    <div data-component="Col" className={`flex flex-col ${props.className || ''}`}>
      {props.children}
    </div>
  );
}
