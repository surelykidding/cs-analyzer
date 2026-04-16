import type { ReactNode } from 'react';
import React from 'react';
import { rewriteLegacyAppUrl } from 'csdm/common/branding';

type Props = {
  children: ReactNode;
  href: string;
};

export function ExternalLink({ href, children }: Props) {
  return (
    <a
      className="text-blue-500 no-underline hover:underline"
      href={rewriteLegacyAppUrl(href)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
