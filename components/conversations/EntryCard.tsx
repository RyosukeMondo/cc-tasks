"use client";

import { forwardRef, type HTMLAttributes, type KeyboardEvent } from "react";

import { ConversationEntry } from "@/lib/types/conversation";

import { AssistantMessage } from "./AssistantMessage";
import { ToolResult } from "./ToolResult";
import { ToolUse } from "./ToolUse";
import { UserMessage } from "./UserMessage";

type EntryCardProps = HTMLAttributes<HTMLDivElement> & {
  entry: ConversationEntry;
  onClick?: () => void;
};

type EntryComponent = (props: { entry: ConversationEntry; className?: string }) => JSX.Element | null;

const ENTRY_COMPONENTS: Record<ConversationEntry["type"], EntryComponent> = {
  user: UserMessage,
  assistant: AssistantMessage,
  tool_use: ToolUse,
  tool_result: ToolResult,
};

export const EntryCard = forwardRef<HTMLDivElement, EntryCardProps>(function EntryCard(
  { entry, onClick, className = "", onKeyDown, role, tabIndex, ...rest },
  ref
) {
  const Component = ENTRY_COMPONENTS[entry.type];
  const interactiveClasses = onClick
    ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    : "";

  const handleKeyDown: HTMLAttributes<HTMLDivElement>["onKeyDown"] = onClick
    ? (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }
    : onKeyDown;

  const wrapperRole = onClick ? "button" : role;
  const wrapperTabIndex = onClick ? 0 : tabIndex;
  const wrapperClassName = `${interactiveClasses} ${className}`.trim();

  return (
    <div
      {...rest}
      ref={ref}
      data-entry-id={entry.id ?? undefined}
      data-entry-type={entry.type}
      role={wrapperRole}
      tabIndex={wrapperTabIndex as number | undefined}
      className={wrapperClassName || undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <Component entry={entry} className={onClick ? "transition-colors duration-150 hover:border-white/10" : undefined} />
    </div>
  );
});
