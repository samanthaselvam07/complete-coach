"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Settings, UserCircle } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import { isActivePath, navigationItems } from "./navigation";

interface SidebarNavProps {
  currentPath: string;
}

function createGroupId(href: string) {
  const slug = href === "/" ? "root" : href.replace(/[^a-z0-9]+/gi, "-");

  return `sidebar-group-${slug}`;
}

function createInitialOpenGroups() {
  return {};
}

export function SidebarNav({ currentPath }: SidebarNavProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(createInitialOpenGroups);
  const [coachMenuOpen, setCoachMenuOpen] = useState(false);
  const { data: session } = useSession();
  const coachName = session?.user?.name ?? "Coach Marcus";
  const coachTitle = session?.user?.email ?? "Head Curator";

  const toggleGroup = (href: string) => {
    setOpenGroups((current) => ({
      ...current,
      [href]: !(current[href] ?? currentPath === href)
    }));
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-sidebar-border p-5">
        <Link href="/" className="flex items-center gap-3" aria-label="Complete Coach dashboard">
          <Image
            src="/brand/favicon.svg"
            alt="Complete Coach icon"
            width={40}
            height={40}
            className="size-10 shrink-0"
            priority
          />
          <span>
            <span className="block text-base font-bold tracking-tight">Complete Coach</span>
            <span className="block text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Business OS for Fitness Professionals
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary navigation">
        {navigationItems.map((item) => {
          const active = isActivePath(currentPath, item.href);
          const Icon = item.icon;
          const hasChildren = Boolean(item.children);
          const open = openGroups[item.href] ?? currentPath === item.href;
          const groupId = createGroupId(item.href);

          return (
            <div key={item.href}>
              <div className="flex items-center gap-1">
                {hasChildren ? (
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    aria-controls={groupId}
                    aria-expanded={open}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    onClick={() => {
                      toggleGroup(item.href);
                    }}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ) : (
                  <Link
                    href={item.href as Route}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )}

                {hasChildren ? (
                  <button
                    type="button"
                    aria-controls={groupId}
                    aria-expanded={open}
                    aria-label={`${open ? "Collapse" : "Expand"} ${item.label} menu`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    onClick={() => {
                      toggleGroup(item.href);
                    }}
                  >
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform",
                        open ? "rotate-0" : "-rotate-90"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
              </div>

              {item.children && open ? (
                <div
                  id={groupId}
                  className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3"
                >
                  {item.children.map((child) => {
                    const childActive = isActivePath(currentPath, child.href);
                    const ChildIcon = child.icon;

                    return (
                      <Link
                        key={child.href}
                        href={child.href as Route}
                        aria-current={childActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          childActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <ChildIcon className="size-4" aria-hidden="true" />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="relative">
          {coachMenuOpen ? (
            <div
              id="sidebar-coach-menu"
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-sidebar-border bg-white p-2 shadow-lg"
              aria-label="Coach module links"
            >
              <Link
                href={"/coach-profile" as Route}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActivePath(currentPath, "/coach-profile")
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                aria-current={isActivePath(currentPath, "/coach-profile") ? "page" : undefined}
              >
                <UserCircle className="size-4" aria-hidden="true" />
                <span>Coach Profile</span>
              </Link>
              <Link
                href={"/settings" as Route}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActivePath(currentPath, "/settings")
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                aria-current={isActivePath(currentPath, "/settings") ? "page" : undefined}
              >
                <Settings className="size-4" aria-hidden="true" />
                <span>Individual Coach Settings</span>
              </Link>
            </div>
          ) : null}
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-white p-3 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              (isActivePath(currentPath, "/coach-profile") || isActivePath(currentPath, "/settings")) &&
                "border-indigo-200 bg-indigo-50"
            )}
            aria-expanded={coachMenuOpen}
            aria-controls="sidebar-coach-menu"
            aria-label={`Open coach module for ${coachName}`}
            onClick={() => setCoachMenuOpen((open) => !open)}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              {getInitials(coachName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{coachName}</span>
              <span className="block truncate text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {coachTitle}
              </span>
            </span>
            <ChevronDown
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", coachMenuOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </aside>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";
}
