import type { Metadata } from "next";

/**
 * Checkout is transactional, not marketing. A layout carries the metadata
 * because `checkout/page.tsx` is a client component and can't export it —
 * and this keeps `/checkout/success` out of the index too.
 */
export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false, nocache: true },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
