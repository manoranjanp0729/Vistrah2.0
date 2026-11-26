import Link from "next/link";
import type { ReactNode } from "react";

type AccountPageLayoutProps = {
  title: string;
  description: string;
  activeHref: string;
  children: ReactNode;
};

const accountLinks = [
  { href: "/profile", label: "Profile" },
  { href: "/applications", label: "Applications" },
  { href: "/membership", label: "Membership" },
  { href: "/notifications", label: "Notifications" },
  { href: "/refer", label: "Refer & Earn" },
];

export default function AccountPageLayout({
  title,
  description,
  activeHref,
  children,
}: AccountPageLayoutProps) {
  return (
    <main className="accountShell">
      <div className="accountLayout">
        <Link href="/" className="accountBackLink">
          <span aria-hidden="true">←</span>
          Back to VISTRAH
        </Link>

        <section className="accountHero">
          <span className="accountEyebrow">YOUR ACCOUNT</span>
          <h1 className="accountTitle">{title}</h1>
          <p className="accountDescription">{description}</p>
        </section>

        <nav className="accountNavigation" aria-label="Account pages">
          {accountLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={link.href === activeHref ? "isActive" : undefined}
              aria-current={link.href === activeHref ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="accountContent">{children}</div>
      </div>
    </main>
  );
}
