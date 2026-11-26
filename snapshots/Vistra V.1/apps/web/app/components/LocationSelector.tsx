"use client";

import { useEffect, useState } from "react";

const locations = [
  "Bengaluru, Karnataka",
  "Mumbai, Maharashtra",
  "Delhi, Delhi",
  "Hyderabad, Telangana",
  "Chennai, Tamil Nadu",
  "Pune, Maharashtra",
  "Kolkata, West Bengal",
];

export function useLocationSelector() {
  const [location, setLocation] = useState(locations[0]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const filteredLocations = locations.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  const openSelector = () => {
    setSearch("");
    setOpen(true);
  };

  const selectLocation = (nextLocation: string) => {
    setLocation(nextLocation);
    setOpen(false);
  };

  return {
    location,
    search,
    isOpen: open,
    filteredLocations,
    setSearch,
    openSelector,
    closeSelector: () => setOpen(false),
    selectLocation,
  };
}

type LocationSelectorDialogProps = {
  isOpen: boolean;
  location: string;
  search: string;
  filteredLocations: string[];
  onSearchChange: (value: string) => void;
  onSelect: (location: string) => void;
  onClose: () => void;
};

export function LocationSelectorDialog({
  isOpen,
  location,
  search,
  filteredLocations,
  onSearchChange,
  onSelect,
  onClose,
}: LocationSelectorDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="locationDialogBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="locationDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-dialog-title"
      >
        <div className="locationDialogHeader">
          <h2 id="location-dialog-title">Choose your location</h2>
          <button type="button" aria-label="Close location selector" onClick={onClose}>
            ×
          </button>
        </div>
        <label htmlFor="location-search">Search locations</label>
        <input
          id="location-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Enter a city"
          autoFocus
        />
        <div className="locationOptions">
          {filteredLocations.length ? (
            filteredLocations.map((item) => (
              <button
                key={item}
                type="button"
                aria-current={location === item ? "true" : undefined}
                onClick={() => onSelect(item)}
              >
                {item}
              </button>
            ))
          ) : (
            <p role="status">No matching locations.</p>
          )}
        </div>
        <button className="locationCancel" type="button" onClick={onClose}>
          Cancel
        </button>
      </section>
    </div>
  );
}
