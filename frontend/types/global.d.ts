// Temporary minimal typings so the editor / TS server don't error
// before full Next.js / React type packages are installed.

declare namespace JSX {
  // Allow any JSX intrinsic elements (div, span, etc.) without type errors.
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module "next/link" {
  import * as React from "react";

  export interface LinkProps
    extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    prefetch?: boolean;
  }

  const Link: React.FC<LinkProps>;
  export default Link;
}


