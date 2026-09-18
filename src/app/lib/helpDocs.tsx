import type { ReactNode } from "react";

export interface HelpDoc {
  id: string;
  title: string;
  content: ReactNode;
}

export const HELP_DOCS: HelpDoc[] = [
  {
    id: "label-printer-settings",
    title: "Label Printers Settings",
    content: <p>Content coming soon.</p>,
  },
];

export function helpDocPath(id: string): string {
  return `/docs/${id}`;
}

export function getHelpDocFromPath(pathname: string): HelpDoc | null {
  const match = pathname.match(/^\/docs\/([^/]+)\/?$/);
  return HELP_DOCS.find((d) => d.id === match?.[1]) ?? null;
}
