"use client";

import { MessageSquare, MoreVertical, Paperclip, Phone, Search, Send, Smile, Video } from "lucide-react";
import { useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/operations/message-models";
import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";

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
  online: boolean;
  initials: string;
}

export function MessagesPage() {
  const [conversationList, setConversationList] = useState<UiConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessage[]>>({});
  const [messageError, setMessageError] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadConversations() {
      try {
        const response = await fetch("/api/v1/conversations?limit=100");

        if (!response.ok) {
          throw new Error("Conversations API unavailable.");
        }

        const payload = (await response.json()) as { data: ApiConversation[] };
        const apiConversations = payload.data.map(mapApiConversation);
        const firstConversationId = apiConversations[0]?.id ?? "";
        let firstMessages: ChatMessage[] = [];

        if (firstConversationId) {
          const messagesResponse = await fetch(`/api/v1/conversations/${firstConversationId}/messages?limit=100`);

          if (messagesResponse.ok) {
            const messagesPayload = (await messagesResponse.json()) as { data?: ApiMessage[] };
            firstMessages = (messagesPayload.data ?? []).map(mapApiMessage);
          }
        }

        if (!isActive) {
          return;
        }

        setConversationList(apiConversations);
        setSelectedConversation(firstConversationId);
        setMessagesByConversation(firstConversationId ? { [firstConversationId]: firstMessages } : {});
      } catch {
        if (!isActive) {
          return;
        }

        setConversationList([]);
        setSelectedConversation("");
        setMessagesByConversation({});
      } finally {
        if (isActive) {
          setLoadingConversations(false);
        }
      }
    }

    void loadConversations();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    let isActive = true;

    async function loadMessages() {
      try {
        const response = await fetch(`/api/v1/conversations/${selectedConversation}/messages?limit=100`);

        if (!response.ok) {
          throw new Error("Messages API unavailable.");
        }

        const payload = (await response.json()) as { data: ApiMessage[] };

        if (!isActive) {
          return;
        }

        setMessagesByConversation((current) => ({
          ...current,
          [selectedConversation]: payload.data.map(mapApiMessage)
        }));
      } catch {
        if (!isActive) {
          return;
        }

        setMessagesByConversation((current) => ({
          ...current,
          [selectedConversation]: []
        }));
      }
    }

    void loadMessages();

    return () => {
      isActive = false;
    };
  }, [selectedConversation]);

  const filteredConversations = conversationList.filter((conversation) =>
    conversation.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const currentConversation = conversationList.find((conversation) => conversation.id === selectedConversation);
  const currentMessages = messagesByConversation[selectedConversation] ?? [];

  async function sendMessage() {
    const text = messageInput.trim();
    if (!text) {
      return;
    }

    if (!selectedConversation) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/conversations/${selectedConversation}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text })
      });

      if (!response.ok) {
        throw new Error("Message API unavailable.");
      }

      const payload = (await response.json()) as { data: ApiMessage };
      appendMessage(selectedConversation, mapApiMessage(payload.data));
      setConversationList((current) => updateConversationPreview(current, selectedConversation, text));
      setMessageInput("");
      setMessageError("");
    } catch {
      setMessageError("Message could not be sent. Please try again once the database connection is available.");
    }
  }

  function appendMessage(conversationId: string, message: ChatMessage) {
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: [...(current[conversationId] ?? []), message]
    }));
  }

  return (
    <main className="flex h-[calc(100vh-88px)] min-h-[720px] overflow-hidden">
      {loadingConversations ? (
        <CompleteCoachLoadingScreen
          title="Preparing messages"
          label="Preparing messages."
        />
      ) : null}
      <aside className="flex w-full max-w-sm flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h1 className="mb-4 text-2xl font-black">Messages</h1>
          {messageError ? <p role="alert" className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{messageError}</p> : null}
          <label className="relative block">
            <span className="sr-only">Search conversations</span>
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              aria-label={`Open conversation with ${conversation.name}`}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition ${
                selectedConversation === conversation.id ? "border-l-4 border-l-indigo-600 bg-indigo-50" : "hover:bg-slate-50"
              }`}
            >
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-black text-white">
                {conversation.initials}
                {conversation.online ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-black">{conversation.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{conversation.time}</span>
                </span>
                <span className="block truncate text-sm text-slate-600">{conversation.lastMessage}</span>
              </span>
              {conversation.unread > 0 ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {conversation.unread}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex flex-1 flex-col bg-slate-50">
        {currentConversation ? (
          <>
            <header className="flex items-center justify-between border-b border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-xs font-black text-white">
                  {currentConversation.initials}
                  {currentConversation.online ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" /> : null}
                </span>
                <div>
                  <h2 className="font-black">{currentConversation.name}</h2>
                  <p className="text-xs text-slate-500">{currentConversation.online ? "Active now" : "Offline"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button aria-label="Start phone call" className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100">
                  <Phone className="h-5 w-5" />
                </button>
                <button aria-label="Start video call" className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100">
                  <Video className="h-5 w-5" />
                </button>
                <button aria-label="Conversation actions" className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div role="log" aria-label={`Conversation with ${currentConversation.name}`} className="flex-1 space-y-4 overflow-y-auto p-6">
              {currentMessages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === "coach" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-md rounded-2xl px-4 py-3 ${
                      message.sender === "coach"
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className={`mt-1 text-xs ${message.sender === "coach" ? "text-indigo-200" : "text-slate-500"}`}>{message.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <footer className="border-t border-slate-200 bg-white p-4">
              <div className="flex items-end gap-3">
                <button aria-label="Attach file" className="shrink-0 rounded-xl p-2 text-slate-600 transition hover:bg-slate-100">
                  <Paperclip className="h-5 w-5" />
                </button>
                <label className="relative flex-1">
                  <span className="sr-only">Type a message</span>
                  <textarea
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="button" aria-label="Open emoji picker" className="absolute bottom-3 right-3 rounded-lg p-1 text-slate-600 transition hover:bg-slate-100">
                    <Smile className="h-5 w-5" />
                  </button>
                </label>
                <button
                  type="button"
                  aria-label="Send message"
                  onClick={() => void sendMessage()}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-500">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <p>No conversations loaded from Neon yet.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function mapApiConversation(conversation: ApiConversation): UiConversation {
  const name = conversation.clientName || conversation.title || "Client conversation";

  return {
    id: conversation.id,
    name,
    lastMessage: conversation.latestMessage?.body || "No messages yet",
    time: formatConversationTime(conversation.latestMessage?.createdAt || conversation.updatedAt),
    unread: 0,
    online: false,
    initials: getInitials(name)
  };
}

function mapApiMessage(message: ApiMessage): ChatMessage {
  return {
    id: message.id,
    sender: message.senderType === "user" ? "coach" : "client",
    text: message.body,
    time: formatMessageTime(message.createdAt)
  };
}

function updateConversationPreview(conversationsToUpdate: UiConversation[], conversationId: string, text: string) {
  return conversationsToUpdate.map((conversation) =>
    conversation.id === conversationId ? { ...conversation, lastMessage: text, time: "Now" } : conversation
  );
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

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
