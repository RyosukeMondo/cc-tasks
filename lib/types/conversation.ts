export type ConversationEntry = {
  id?: string;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result';
  content: string;
  timestamp: string;
  metadata?: EntryMetadata;
  toolName?: string;
  toolUseId?: string;
  parameters?: Record<string, any>;
  isError?: boolean;
};

export type EntryMetadata = {
  index?: number;
  duration?: number;
  tokenCount?: number;
  model?: string;
  [key: string]: any;
};

export type SessionStats = {
  totalEntries: number;
  userMessages: number;
  assistantMessages: number;
  toolInvocations: number;
  totalTokens?: number;
  duration?: number;
  firstTimestamp: string;
  lastTimestamp: string;
};