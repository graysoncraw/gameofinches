"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- navigation intentionally uses full-page links. */

import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function LeagueNavigation({
  activePage,
  leagueId,
}: {
  activePage: string;
  leagueId: string;
}) {
  const [openNavMenu, setOpenNavMenu] = useState<string | null>(null);
  const activeNav =
    activePage === "profile" ? "teams" : activePage.split("-")[0];
  const navigation: Array<{
    key: string;
    href: string;
    label: string;
    items?: Array<{ href: string; label: string; page: string }>;
  }> = [
    { key: "overview", href: "/", label: "Overview" },
    {
      key: "teams",
      href: "/teams",
      label: "Teams",
      items: [
        { href: "/teams", label: "Active teams", page: "teams" },
        {
          href: "/teams/retired",
          label: "Retired teams",
          page: "teams-retired",
        },
      ],
    },
    {
      key: "history",
      href: "/history",
      label: "History",
      items: [
        { href: "/history", label: "All-time table", page: "history" },
        {
          href: "/history/seasons",
          label: "Season archive",
          page: "history-seasons",
        },
        {
          href: "/history/playoffs",
          label: "Playoff history",
          page: "history-playoffs",
        },
      ],
    },
    {
      key: "records",
      href: "/records",
      label: "Records",
      items: [
        { href: "/records", label: "Money ledger", page: "records" },
        {
          href: "/records/rivalries",
          label: "Rivalries",
          page: "records-rivalries",
        },
        {
          href: "/records/performances",
          label: "Top performances",
          page: "records-performances",
        },
        {
          href: "/records/superlatives",
          label: "Superlatives",
          page: "records-superlatives",
        },
        {
          href: "/records/book",
          label: "Record book",
          page: "records-book",
        },
        {
          href: "/records/elo",
          label: "Elo rankings",
          page: "records-elo",
        },
      ],
    },
    { key: "drafts", href: "/drafts", label: "Drafts" },
    { key: "moves", href: "/moves", label: "Moves" },
    {
      key: "keepers",
      href: "/keepers",
      label: "Keepers",
      items: [
        { href: "/keepers", label: "Official board", page: "keepers" },
        {
          href: "/keepers/rules",
          label: "Keeper rules",
          page: "keepers-rules",
        },
        {
          href: "/keepers/lab",
          label: "Keeper Lab",
          page: "keepers-lab",
        },
      ],
    },
  ];
  const openNavigation = navigation.find((item) => item.key === openNavMenu);

  return (
    <nav className="topbar" aria-label="Primary navigation">
      <a className="brand" href="/" aria-label="Game of Inches home">
        <span className="brand-mark">
          G<span>/</span>I
        </span>
        <span>
          Game of Inches
          <small>Fantasy Football League</small>
        </span>
      </a>
      <div
        className="nav-links"
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpenNavMenu(null);
        }}
      >
        {navigation.map((item) => (
          <div
            className={`nav-item ${item.items ? "has-dropdown" : ""}`}
            key={item.key}
          >
            <a
              className={`nav-link ${activeNav === item.key ? "active" : ""}`}
              href={item.href}
              onClick={() => setOpenNavMenu(null)}
            >
              {item.label}
            </a>
            {item.items && (
              <>
                <button
                  aria-controls={`nav-menu-${item.key}`}
                  aria-expanded={openNavMenu === item.key}
                  aria-haspopup="menu"
                  aria-label={`Show ${item.label} pages`}
                  className="nav-dropdown-toggle"
                  onClick={() =>
                    setOpenNavMenu((current) =>
                      current === item.key ? null : item.key,
                    )
                  }
                  type="button"
                >
                  <ChevronDown size={13} aria-hidden="true" />
                </button>
                <div
                  className="nav-dropdown"
                  id={`nav-menu-${item.key}`}
                  role="menu"
                >
                  {item.items.map((child) => (
                    <a
                      className={activePage === child.page ? "active" : ""}
                      href={child.href}
                      key={child.href}
                      role="menuitem"
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {openNavigation?.items && (
        <div className="mobile-nav-dropdown" role="menu">
          {openNavigation.items.map((child) => (
            <a
              className={activePage === child.page ? "active" : ""}
              href={child.href}
              key={child.href}
              role="menuitem"
            >
              {child.label}
            </a>
          ))}
        </div>
      )}
      <a
        className="sleeper-link"
        href={`https://sleeper.com/leagues/${leagueId}`}
        target="_blank"
        rel="noreferrer"
      >
        Open Sleeper <ArrowUpRight size={15} aria-hidden="true" />
      </a>
    </nav>
  );
}
