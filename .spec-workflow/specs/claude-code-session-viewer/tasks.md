# Tasks Document

- [x] 1. Create conversation data types in lib/types/conversation.ts
  - File: lib/types/conversation.ts
  - Define TypeScript interfaces for ConversationEntry, EntryMetadata, and SessionStats
  - Extend existing type patterns from lib/types/project.ts
  - Purpose: Establish type safety for conversation parsing and display
  - _Leverage: lib/types/project.ts, lib/types/task.ts_
  - _Requirements: Requirement 1, Requirement 2_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer specializing in type systems and conversation data modeling | Task: Create comprehensive TypeScript interfaces for ConversationEntry, EntryMetadata, and SessionStats following Requirements 1 and 2, extending existing type patterns from project and task types | Restrictions: Do not modify existing type files, maintain compatibility with JSONL parsing, follow project naming conventions | _Leverage: Follow patterns from lib/types/project.ts and lib/types/task.ts for consistent naming and structure | _Requirements: Requirement 1 (session content display), Requirement 2 (entry type distinction) | Success: All interfaces compile without errors, support all conversation entry types, compatible with JSONL structure | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [x] 2. Create conversation service in lib/services/conversationService.ts
  - File: lib/services/conversationService.ts
  - Implement JSONL parsing and conversation entry extraction
  - Follow service patterns from lib/services/projectService.ts
  - Purpose: Provide secure JSONL parsing and content validation
  - _Leverage: lib/services/projectService.ts, lib/services/sessionService.ts_
  - _Requirements: Requirement 1, Requirement 5_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in file parsing and content validation | Task: Implement conversationService with secure JSONL parsing and content validation following Requirements 1 and 5, using service patterns from existing project services | Restrictions: Must handle malformed JSONL gracefully, prevent XSS attacks, limit memory usage for large files | _Leverage: Follow validation patterns from projectService.ts and sessionService.ts, use Node.js fs/promises for file operations | _Requirements: Requirement 1 (conversation parsing), Requirement 5 (content formatting) | Success: Service can parse JSONL safely, handle corrupted files, extract conversation entries with metadata | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [x] 3. Create entry card component in components/conversations/EntryCard.tsx
  - File: components/conversations/EntryCard.tsx
  - Polymorphic component for rendering different conversation entry types
  - Handle user, assistant, tool_use, and tool_result entries with distinct styling
  - Purpose: Unified component for conversation entry display with type-specific rendering
  - _Leverage: components/shared/StatusBadge.tsx_
  - _Requirements: Requirement 2_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in polymorphic React components and conversation UI | Task: Create EntryCard component following Requirement 2, implementing polymorphic rendering for different conversation entry types with distinct visual styling | Restrictions: Must use existing design patterns, ensure accessibility, handle all entry types safely | _Leverage: Adapt StatusBadge patterns for entry type indication, follow existing card layout patterns | _Requirements: Requirement 2 (visual entry type distinction) | Success: Component renders all entry types correctly, visual distinction clear, reusable and accessible | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [x] 4. Create user message component in components/conversations/UserMessage.tsx
  - File: components/conversations/UserMessage.tsx
  - Display user input messages with proper styling and metadata
  - Handle content sanitization and timestamp formatting
  - Purpose: Specialized component for user message display
  - _Leverage: existing typography and spacing patterns_
  - _Requirements: Requirement 2, Requirement 5_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in message display components and content formatting | Task: Create UserMessage component following Requirements 2 and 5, displaying user input with proper styling, content preservation, and metadata | Restrictions: Must sanitize content safely, preserve formatting, maintain consistent styling with design system | _Leverage: Use existing typography patterns and responsive text layout | _Requirements: Requirement 2 (user message distinction), Requirement 5 (content formatting) | Success: Component displays user messages clearly, content properly formatted, safe rendering | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [x] 5. Create assistant message component in components/conversations/AssistantMessage.tsx
  - File: components/conversations/AssistantMessage.tsx
  - Display Claude assistant responses with markdown and code block support
  - Preserve formatting while maintaining security and readability
  - Purpose: Specialized component for assistant response display
  - _Leverage: existing content formatting patterns_
  - _Requirements: Requirement 2, Requirement 5_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in markdown rendering and code display | Task: Create AssistantMessage component following Requirements 2 and 5, displaying assistant responses with markdown support and code block preservation | Restrictions: Must preserve code formatting, handle markdown safely, prevent XSS while maintaining readability | _Leverage: Follow existing code display patterns and content formatting utilities | _Requirements: Requirement 2 (assistant message distinction), Requirement 5 (content preservation) | Success: Component renders assistant responses with proper formatting, code blocks preserved, secure content handling | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [x] 6. Create tool use component in components/conversations/ToolUse.tsx
  - File: components/conversations/ToolUse.tsx
  - Display tool invocation details including tool name and parameters
  - Format parameters as readable JSON with syntax highlighting
  - Purpose: Specialized component for tool use entry display
  - _Leverage: existing structured data formatting patterns_
  - _Requirements: Requirement 2_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in structured data display and JSON formatting | Task: Create ToolUse component following Requirement 2, displaying tool invocations with clear tool names and formatted parameters | Restrictions: Must format JSON parameters safely, ensure readability, handle complex parameter structures | _Leverage: Use existing code display patterns for JSON formatting and syntax highlighting | _Requirements: Requirement 2 (tool use entry distinction) | Success: Component displays tool uses clearly, parameters properly formatted, tool names prominent | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [x] 7. Create tool result component in components/conversations/ToolResult.tsx
  - File: components/conversations/ToolResult.tsx
  - Display tool execution results and link to corresponding tool use
  - Handle success and error states with appropriate styling
  - Purpose: Specialized component for tool result display with state indication
  - _Leverage: existing error display patterns_
  - _Requirements: Requirement 2_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in result display and error state handling | Task: Create ToolResult component following Requirement 2, displaying tool results with clear success/error indication and linking to corresponding tool use | Restrictions: Must handle both success and error states, provide clear visual feedback, link results to tool use entries | _Leverage: Follow existing error display patterns and result formatting utilities | _Requirements: Requirement 2 (tool result entry distinction) | Success: Component displays tool results clearly, error states obvious, proper linking to tool use | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [x] 8. Create conversation viewer component in components/conversations/ConversationViewer.tsx
  - File: components/conversations/ConversationViewer.tsx
  - Main container for conversation display with scrolling and navigation
  - Handle loading states and conversation entry rendering
  - Purpose: Primary container for session content display
  - _Leverage: components/conversations/EntryCard.tsx_
  - _Requirements: Requirement 1, Requirement 3_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in scrollable content and conversation UI | Task: Create ConversationViewer component following Requirements 1 and 3, implementing main conversation display container with efficient scrolling and navigation | Restrictions: Must handle large conversations efficiently, maintain scroll performance, provide smooth user experience | _Leverage: Use EntryCard component for entry rendering, follow existing list rendering patterns | _Requirements: Requirement 1 (conversation display), Requirement 3 (navigation through conversations) | Success: Component renders conversations smoothly, handles large content efficiently, navigation controls functional | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [x] 9. Create conversation navigation component in components/conversations/ConversationNavigation.tsx
  - File: components/conversations/ConversationNavigation.tsx
  - Navigation controls for jumping to conversation positions and progress indication
  - Handle scroll position management and conversation stats display
  - Purpose: Navigation aids for long conversation browsing
  - _Leverage: Next.js router utilities, scroll management patterns_
  - _Requirements: Requirement 3, Requirement 4_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in navigation components and scroll management | Task: Create ConversationNavigation component following Requirements 3 and 4, implementing navigation controls for conversation positioning and progress tracking | Restrictions: Must maintain scroll position accurately, provide intuitive navigation, ensure accessibility compliance | _Leverage: Use existing navigation patterns and scroll management utilities | _Requirements: Requirement 3 (conversation navigation), Requirement 4 (clear navigation between views) | Success: Navigation controls work smoothly, progress indication accurate, scroll position maintained | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [x] 10. Create session content page in app/projects/[id]/sessions/[sessionId]/page.tsx
  - File: app/projects/[id]/sessions/[sessionId]/page.tsx
  - Dynamic route for individual session content viewing
  - Integrate ConversationViewer with conversation service data
  - Purpose: Main page for session content display with routing integration
  - _Leverage: components/conversations/ConversationViewer.tsx, lib/services/conversationService.ts_
  - _Requirements: Requirement 1, Requirement 4_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer with expertise in Next.js dynamic routing and conversation display | Task: Create session content page following Requirements 1 and 4, implementing dynamic routing for conversation content display using ConversationViewer and conversationService | Restrictions: Must handle invalid session IDs, provide proper error boundaries, implement loading states | _Leverage: Use ConversationViewer component and conversationService, follow Next.js dynamic routing patterns | _Requirements: Requirement 1 (session content viewing), Requirement 4 (navigation integration) | Success: Page displays session content correctly, handles routing errors, proper loading and error states | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 11. Enhance session card with view action in components/projects/SessionCard.tsx
  - File: components/projects/SessionCard.tsx (modify existing)
  - Add "View Content" action button to existing session cards
  - Integrate navigation to session content page
  - Purpose: Connect session discovery with content viewing
  - _Leverage: existing SessionCard component, Next.js navigation_
  - _Requirements: Requirement 4_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in component enhancement and navigation integration | Task: Enhance existing SessionCard component following Requirement 4, adding "View Content" action that navigates to session content page | Restrictions: Must not break existing functionality, maintain consistent styling, ensure proper navigation flow | _Leverage: Extend existing SessionCard component, use Next.js router for navigation | _Requirements: Requirement 4 (navigation between session list and content) | Success: Session cards have view action, navigation works correctly, maintains existing functionality | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 12. Add content sanitization utilities in lib/utils/contentUtils.ts
  - File: lib/utils/contentUtils.ts
  - Content sanitization and formatting utilities for conversation display
  - Handle XSS prevention, markdown processing, and code block formatting
  - Purpose: Centralized utilities for safe content rendering
  - _Leverage: Node.js built-in security utilities_
  - _Requirements: Requirement 5, all security requirements_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Security-focused Developer with expertise in content sanitization and XSS prevention | Task: Create content sanitization utilities following Requirement 5 and security requirements, implementing safe content processing for conversation display | Restrictions: Must prevent XSS attacks, preserve legitimate formatting, handle edge cases safely | _Leverage: Use Node.js built-in security utilities and safe content processing patterns | _Requirements: Requirement 5 (content formatting), all security requirements | Success: Utilities prevent security issues, preserve content formatting, handle all content types safely | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 13. Integration testing and performance optimization
  - Files: All conversation components and services
  - End-to-end testing of session content viewing flow
  - Performance validation for large JSONL files and long conversations
  - Purpose: Ensure complete feature reliability and performance requirements
  - _Leverage: All created conversation components and services_
  - _Requirements: All requirements_
  - _Prompt: Implement the task for spec claude-code-session-viewer, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in performance testing and conversation UI validation | Task: Perform comprehensive integration testing covering all requirements, validating session content viewing flow with performance optimization for large files | Restrictions: Must test with real JSONL files, validate performance requirements (5s load, smooth scrolling), ensure memory efficiency | _Leverage: All implemented conversation components and services for comprehensive testing | _Requirements: All requirements (complete feature validation) | Success: All user scenarios work correctly, performance meets requirements (50MB files, 1000+ entries), memory usage optimized | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_