"use client";

import { Bell, CheckCircle2, ClipboardCheck, FileText, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { initialNotifications } from "./notifications";
import { useCloseOnOutsideClick } from "./use-close-on-outside-click";

const notificationIconClass = {
  "check-in": "bg-green-50 text-green-700",
  message: "bg-blue-50 text-blue-700",
  form: "bg-indigo-50 text-indigo-700",
  task: "bg-orange-50 text-orange-700"
};

const notificationIcons = {
  "check-in": ClipboardCheck,
  message: MessageCircle,
  form: FileText,
  task: CheckCircle2
};

export function NotificationMenu() {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notificationSource, setNotificationSource] = useState<"api" | "fixture">("fixture");
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((notification) => notification.unread).length;
  const closeMenu = useCallback(() => setIsOpen(false), []);

  useCloseOnOutsideClick(menuRef, isOpen, closeMenu);

  useEffect(() => {
    let isActive = true;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/v1/notifications?limit=20");

        if (!response.ok) {
          throw new Error("Notifications API unavailable.");
        }

        const payload = (await response.json()) as { data: ApiNotification[] };

        if (!isActive) {
          return;
        }

        setNotificationSource("api");
        setNotifications(payload.data.map(mapApiNotification));
      } catch {
        if (isActive) {
          setNotificationSource("fixture");
          setNotifications(initialNotifications);
        }
      }
    }

    void loadNotifications();

    return () => {
      isActive = false;
    };
  }, []);

  const markAllAsRead = async () => {
    const previousNotifications = notifications;

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({ ...notification, unread: false }))
    );

    if (notificationSource !== "api") {
      return;
    }

    try {
      const response = await fetch("/api/v1/notifications/read", { method: "POST" });

      if (!response.ok) {
        throw new Error("Notifications API unavailable.");
      }
    } catch {
      setNotifications(previousNotifications);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={isOpen}
        aria-controls="notification-menu"
        aria-label={`Notifications: ${unreadCount} unread`}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="relative rounded-xl"
      >
        <Bell className="size-5" aria-hidden="true" />
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-indigo-700 px-1 text-xs text-white">
          {unreadCount}
        </span>
      </Button>

      {isOpen ? (
        <section
          id="notification-menu"
          role="region"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-50 w-96 rounded-2xl border border-border bg-white p-4 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Notifications</h2>
              <p className="text-xs text-muted-foreground">{unreadCount} unread updates</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          </div>

          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type];

              return (
                <article
                  key={notification.id}
                  className={cn(
                    "flex gap-3 rounded-xl border p-3",
                    notification.unread ? "border-indigo-100 bg-indigo-50/40" : "border-border bg-white"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                      notificationIconClass[notification.type]
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{notification.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {notification.message}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{notification.time}</span>
                  </span>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface ApiNotification {
  id: string;
  type: "check-in" | "message" | "form" | "task";
  title: string;
  message: string;
  unread: boolean;
  createdAt: string;
}

function mapApiNotification(notification: ApiNotification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    time: formatNotificationTime(notification.createdAt),
    unread: notification.unread
  };
}

function formatNotificationTime(value: string) {
  const createdAt = new Date(value).getTime();

  if (Number.isNaN(createdAt)) {
    return "Just now";
  }

  const elapsedMinutes = Math.max(Math.round((Date.now() - createdAt) / 60_000), 0);

  if (elapsedMinutes < 1) {
    return "Just now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
  }

  const elapsedDays = Math.round(elapsedHours / 24);
  return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
}
