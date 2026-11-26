"use client";

import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  MapPin,
  Menu,
  Search,
  Settings,
  UserCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LocationSelectorDialog, useLocationSelector } from "./LocationSelector";

function publishSearch(value: string) {
  window.dispatchEvent(new CustomEvent("vistrah:search", { detail: value }));
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const locationSelector = useLocationSelector();

  useEffect(() => {
    setLoggedIn(Boolean(window.localStorage.getItem("vistrah_token")));
    try {
      const rawUser = window.localStorage.getItem("vistrah_user");
      const currentUser = rawUser ? JSON.parse(rawUser) : null;
      setIsAdmin(currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN");
    } catch {
      setIsAdmin(false);
    }
  }, [pathname]);

  useEffect(() => {
    const onStorage = () => {
      setLoggedIn(Boolean(window.localStorage.getItem("vistrah_token")));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setOpen(false);
    setSearch(pathname === "/" ? new URLSearchParams(window.location.search).get("q") || "" : "");
  }, [pathname]);

  const openLocationSelector = () => {
    setOpen(false);
    locationSelector.openSelector();
  };

  const submitSearch = () => {
    publishSearch(search);
    if (pathname === "/") {
      document.getElementById("category-results")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else if (/^\/service\/[^/]+$/.test(pathname)) {
      document.getElementById("services")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else if (search.trim()) {
      router.push(`/?q=${encodeURIComponent(search.trim())}#category-results`);
    }
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    publishSearch(value);
  };

  const servicesHref = "/#category-results";

  return (
    <>
      <div className="siteHeader" role="banner">
        <div className="siteHeaderInner">
          <button
            className="siteMenuButton"
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-navigation-menu"
          >
            {open ? <X size={21} strokeWidth={2} /> : <Menu size={21} strokeWidth={2} />}
          </button>

          <Link className="siteBrand siteBrandLockup" href="/" onClick={() => setOpen(false)} aria-label="VISTRAH home">
            <svg className="siteBrandMark" viewBox="0 0 100 100" role="img" aria-label="VISTRAH mark">
              <rect width="100" height="100" rx="24" fill="#0B1F5B"/>
              <path d="M20 22 L47 22 L70 58 L82 36 L91 36 L72 78 L58 78 Z" fill="#fff"/>
              <path d="M70 18 H91 L82 36 H73 Z" fill="#FF8A00"/>
              <path d="M48 22 L59 39 L50 53 L40 36 Z" fill="#fff" opacity=".72"/>
            </svg>
            <span className="siteBrandWord"><span className="brandV">V</span>ISTRAH</span>
          </Link>

          <nav className="siteDesktopNav" aria-label="Main navigation">
            {pathname !== "/" && <Link href={servicesHref}>Services</Link>}
            <Link href="/how-it-works">How It Works</Link>
            <Link href="/for-business">For Business</Link>
            <Link href="/about">About</Link>
          </nav>

          <div className="siteHeaderActions">
            <button
              className="siteLocationButton"
              type="button"
              onClick={openLocationSelector}
              aria-haspopup="dialog"
            >
              <MapPin size={16} aria-hidden="true" />
              <span>{locationSelector.location}</span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>

            <label className="siteSearch">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search services"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitSearch();
                }}
                placeholder="Search for any service..."
              />
            </label>

            <Link
              className="siteHeaderIcon"
              href="/applications"
              aria-label="My Applications"
              title="My Applications"
            >
              <ClipboardCheck size={19} strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <Link
              className="siteHeaderIcon"
              href="/notifications"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={19} strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <Link
              className="siteHeaderIcon"
              href="/profile"
              aria-label="Profile"
              title="Profile"
            >
              <UserCircle size={20} strokeWidth={1.8} aria-hidden="true" />
            </Link>
            {isAdmin && (
              <Link
                className="siteHeaderIcon"
                href="/admin"
                aria-label="Admin Dashboard"
                title="Admin Dashboard"
              >
                <Settings size={20} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        {open && (
          <nav className="siteNavigationMenu" id="site-navigation-menu" aria-label="Menu">
            <label className="siteMenuSearch">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search services"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitSearch();
                    setOpen(false);
                  }
                }}
                placeholder="Search for any service..."
              />
            </label>
            <button className="siteMenuLocation" type="button" onClick={openLocationSelector}>
              <MapPin size={17} aria-hidden="true" />
              {locationSelector.location}
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            <Link href={servicesHref} onClick={() => setOpen(false)}>Services</Link>
            <Link href="/how-it-works" onClick={() => setOpen(false)}>How It Works</Link>
            <Link href="/for-business" onClick={() => setOpen(false)}>For Business</Link>
            <Link href="/about" onClick={() => setOpen(false)}>About VISTRAH</Link>
            {loggedIn ? (
              <>
                <div className="siteMenuDivider" />
                <Link href="/profile" onClick={() => setOpen(false)}>Profile</Link>
                <Link href="/applications" onClick={() => setOpen(false)}>My Applications</Link>
                <Link href="/refer" onClick={() => setOpen(false)}>Refer &amp; Earn</Link>
                <button
                  className="siteLogoutButton"
                  type="button"
                  onClick={() => {
                    window.localStorage.removeItem("vistrah_token");
                    window.localStorage.removeItem("vistrah_user");
                    setLoggedIn(false);
                    setOpen(false);
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <div className="siteMenuDivider" />
                <Link href="/login" onClick={() => setOpen(false)}>Login</Link>
                <Link href="/signup" onClick={() => setOpen(false)}>Create Account</Link>
              </>
            )}
          </nav>
        )}
      </div>

      <LocationSelectorDialog
        isOpen={locationSelector.isOpen}
        location={locationSelector.location}
        search={locationSelector.search}
        filteredLocations={locationSelector.filteredLocations}
        onSearchChange={locationSelector.setSearch}
        onSelect={locationSelector.selectLocation}
        onClose={locationSelector.closeSelector}
      />
    </>
  );
}
