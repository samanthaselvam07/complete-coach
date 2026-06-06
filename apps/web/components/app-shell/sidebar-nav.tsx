"use client";

import Link from "next/link";
import { ChevronDown, Zap } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ClientSummary } from "@/fixtures/clients";
import { cn } from "@/lib/utils";
import {
  ClientFormDialog,
  createClientMutationBody,
  emptyClientForm,
  type ClientFormState
} from "@/components/clients/client-form-dialog";
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
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(createInitialOpenGroups);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [savingClient, setSavingClient] = useState(false);

  const toggleGroup = (href: string) => {
    setOpenGroups((current) => ({
      ...current,
      [href]: !(current[href] ?? currentPath === href)
    }));
  };

  const openClientForm = () => {
    setClientForm(emptyClientForm);
    setClientFormError(null);
    setClientFormOpen(true);
  };

  const closeClientForm = () => {
    setClientFormOpen(false);
    setClientForm(emptyClientForm);
    setClientFormError(null);
  };

  const saveClient = async () => {
    setSavingClient(true);
    setClientFormError(null);

    try {
      const response = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createClientMutationBody(clientForm))
      });

      if (!response.ok) {
        throw new Error("Client could not be saved.");
      }

      const payload = (await response.json()) as { data?: ClientSummary };
      const savedClient = payload.data;

      closeClientForm();

      if (savedClient) {
        router.push(`/clients/${savedClient.id}`);
      }
    } catch {
      setClientFormError("Client could not be saved. Check the details and try again.");
    } finally {
      setSavingClient(false);
    }
  };

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-sidebar-border p-5">
        <Link href="/" className="flex items-center gap-3" aria-label="Complete Coach dashboard">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-sm">
            <Zap className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-bold tracking-tight">Complete Coach</span>
            <span className="block text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Elite Performance
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
        <button
          type="button"
          className="mb-4 w-full rounded-xl bg-indigo-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800"
          onClick={openClientForm}
        >
          + New Client
        </button>
        <div className="rounded-xl border border-sidebar-border bg-white p-3">
          <p className="font-semibold">Coach Marcus</p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Head Curator</p>
        </div>
      </div>

      {clientFormOpen ? (
        <ClientFormDialog
          editingClient={null}
          form={clientForm}
          error={clientFormError}
          saving={savingClient}
          onChange={(field, value) => setClientForm((currentForm) => ({ ...currentForm, [field]: value }))}
          onClose={closeClientForm}
          onSubmit={() => void saveClient()}
        />
      ) : null}
    </aside>
  );
}
