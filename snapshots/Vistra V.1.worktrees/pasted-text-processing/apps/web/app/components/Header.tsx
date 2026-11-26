"use client";

import Link from "next/link";
import { Menu, X, UserCircle, ClipboardCheck, Bell } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="vHeader">
      <div className="vHeaderInner">
        <Link href="/" className="vBrand" onClick={() => setOpen(false)}>
          VISTRAH
        </Link>

        <nav className="vDesktopNav">
          <Link href="/service/jobs-careers">Jobs</Link>
          <Link href="/service/real-estate">Real Estate</Link>
          <Link href="/service/civil-construction">Construction</Link>
          <Link href="/service/marketing">Marketing</Link>
          <Link href="/service/tax-compliance">Tax & Compliance</Link>
        </nav>

        <div className="vHeaderActions">
          <Link
            href="/applications"
            className="vHeaderIcon"
            aria-label="My Applications"
          >
            <ClipboardCheck size={19} />
          </Link>

          <Link
            href="/notifications"
            className="vHeaderIcon"
            aria-label="Notifications"
          >
            <Bell size={19} />
          </Link>

          <Link
            href="/profile"
            className="vHeaderIcon"
            aria-label="Profile"
          >
            <UserCircle size={20} />
          </Link>

          <button
            type="button"
            className="vMenuButton"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="vMobileMenu">
          <Link href="/profile" onClick={() => setOpen(false)}>
            Profile
          </Link>

          <Link href="/applications" onClick={() => setOpen(false)}>
            My Applications
          </Link>

          <Link href="/refer" onClick={() => setOpen(false)}>
            Refer & Earn
          </Link>

          <Link href="/about" onClick={() => setOpen(false)}>
            About VISTRAH
          </Link>

          <Link href="/how-it-works" onClick={() => setOpen(false)}>
            How It Works
          </Link>

          <Link href="/for-business" onClick={() => setOpen(false)}>
            For Business
          </Link>

          <a href="tel:+918000000000" onClick={() => setOpen(false)}>
            Call VISTRAH
          </a>

          <div className="vMenuDivider" />

          <Link href="/login" onClick={() => setOpen(false)}>
            Login
          </Link>
        </div>
      )}
    </header>
  );
}
