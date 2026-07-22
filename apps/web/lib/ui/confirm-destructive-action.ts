interface ConfirmDestructiveActionOptions {
  action?: "archive" | "delete" | "remove";
  itemName?: string | null;
  itemType?: string;
}

export function confirmDestructiveAction({
  action = "delete",
  itemName,
  itemType = "item"
}: ConfirmDestructiveActionOptions = {}) {
  if (typeof window === "undefined") {
    return false;
  }

  const actionLabel = action === "archive" ? "archive" : action === "remove" ? "remove" : "delete";
  const target = itemName?.trim() ? `"${itemName.trim()}"` : `this ${itemType}`;

  return window.confirm(
    `Are you sure you want to ${actionLabel} ${target}? This prevents anything from disappearing by mistake.`
  );
}
