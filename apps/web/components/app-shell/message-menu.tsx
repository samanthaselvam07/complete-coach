"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { conversations } from "@/fixtures/operations";

interface ApiConversation {
  id: string;
  clientName: string | null;
  title: string | null;
  latestMessage: ApiMessage | null;
  updatedAt: string;
}

interface ApiMessage {
  id: string;
  senderType: "user" | "client";
  body: string;
  createdAt: string;
}

interface UiConversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  initials: string;
}

const fixtureConversations = conversations.slice(0, 4);

export function MessageMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationList, setConversationList] = useState<UiConversation[]>(fixtureConversations);
  const messageCount = conversationList.reduce((total, conversation) => total + conversation.unread, 0) || conversationList.length;

  useEffect(() => {
    let isActive = true;

    async function loadConversations() {
      try {
        const response = await fetch("/api/v1/conversations?limit=20");

        if (!response.ok) {
          throw new Error("Conversations API unavailable.");
        }

        const payload = (await response.json()) as { data?: ApiConversation[] };
        const apiConversations = payload.data?.map(mapApiConversation) ?? [];

        if (isActive && apiConversations.length > 0) {
          setConversationList(apiConversations);
        }
      } catch {
        if (isActive) {
          setConversationList(fixtureConversations);
        }
      }
    }

    void loadConversations();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={isOpen}
        aria-controls="message-menu"
        aria-label={`Messages: ${messageCount} recent`}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="relative rounded-xl"
      >
        <MessageSquare className="size-5" aria-hidden="true" />
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-xs text-white">
          {messageCount}
        </span>
      </Button>

      {isOpen ? (
        <section
          id="message-menu"
          role="region"
          aria-label="Messages"
          className="absolute right-0 top-12 z-50 w-96 rounded-2xl border border-border bg-white p-4 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Messages</h2>
              <p className="text-xs text-muted-foreground">Recent client conversations</p>
            </div>
            <Link href="/messages" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Open full inbox
            </Link>
          </div>

          <div className="space-y-2">
            {conversationList.slice(0, 4).map((conversation) => (
              <Link
                key={conversation.id}
                href={`/messages?conversation=${encodeURIComponent(conversation.id)}`}
                className="flex gap-3 rounded-xl border border-border bg-white p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {conversation.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-gray-900">{conversation.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{conversation.time}</span>
                  </span>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">{conversation.lastMessage}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function mapApiConversation(conversation: ApiConversation): UiConversation {
  const name = conversation.clientName || conversation.title || "Client conversation";

  return {
    id: conversation.id,
    name,
    lastMessage: conversation.latestMessage?.body || "No messages yet",
    time: formatConversationTime(conversation.latestMessage?.createdAt || conversation.updatedAt),
    unread: 1,
    initials: getInitials(name)
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatConversationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
