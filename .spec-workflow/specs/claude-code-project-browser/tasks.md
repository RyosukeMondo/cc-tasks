# Tasks Document

- [x] 1. Create project data types in lib/types/project.ts
  - File: lib/types/project.ts
  - Define TypeScript interfaces for Project, SessionMetadata, and ProjectMeta
  - Follow existing type patterns from lib/types/task.ts
  - Purpose: Establish type safety for project discovery feature
  - _Leverage: lib/types/task.ts_
  - _Requirements: Requirement 1, Requirement 2_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer specializing in type systems and interfaces | Task: Create comprehensive TypeScript interfaces for Project, SessionMetadata, and ProjectMeta following Requirements 1 and 2, extending existing type patterns from lib/types/task.ts | Restrictions: Do not modify existing type files, maintain backward compatibility, follow project naming conventions | _Leverage: Follow StatusToken pattern from lib/types/task.ts, use similar structure and naming conventions | _Requirements: Requirement 1 (project visibility), Requirement 2 (project metadata display) | Success: All interfaces compile without errors, proper TypeScript typing, compatible with existing codebase patterns | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 2. Create project service in lib/services/projectService.ts
  - File: lib/services/projectService.ts
  - Implement file system scanning and project metadata extraction
  - Follow service patterns from lib/services/taskService.ts
  - Purpose: Provide data access layer for Claude Code project discovery
  - _Leverage: lib/services/taskService.ts_
  - _Requirements: Requirement 1, Requirement 2_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in Node.js file system operations and service architecture | Task: Implement projectService with file system scanning and metadata extraction following Requirements 1 and 2, using service patterns from lib/services/taskService.ts | Restrictions: Read-only access to ~/.claude/projects/, no write operations, graceful error handling for missing directories | _Leverage: Follow interface pattern from taskService.ts, use Node.js fs/promises for file operations | _Requirements: Requirement 1 (project discovery), Requirement 2 (metadata extraction) | Success: Service can scan projects directory, extract metadata, handle errors gracefully, follows existing service patterns | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 3. Create session service in lib/services/sessionService.ts
  - File: lib/services/sessionService.ts
  - Implement session file metadata extraction (no content parsing)
  - Handle JSONL file discovery and basic file information
  - Purpose: Provide session-level metadata for project details view
  - _Leverage: lib/services/taskService.ts, Node.js fs/promises_
  - _Requirements: Requirement 3_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in file system operations and metadata extraction | Task: Implement sessionService for session file metadata extraction following Requirement 3, handling JSONL file discovery and file information | Restrictions: No content parsing of JSONL files, metadata only (file size, dates), read-only access | _Leverage: Follow service patterns from taskService.ts, use Node.js fs/promises for file stats | _Requirements: Requirement 3 (session navigation and metadata) | Success: Service can list session files, extract file metadata, handle corrupted/missing files gracefully | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 4. Create ProjectCard component in components/projects/ProjectCard.tsx
  - File: components/projects/ProjectCard.tsx
  - Display individual project summary with session count and activity status
  - Reuse StatusBadge patterns for project activity indication
  - Purpose: Provide consistent project representation in list view
  - _Leverage: components/shared/StatusBadge.tsx_
  - _Requirements: Requirement 1, Requirement 2_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in React component architecture and reusable UI patterns | Task: Create ProjectCard component following Requirements 1 and 2, displaying project summary with session counts and activity status using StatusBadge patterns | Restrictions: Must use existing component patterns, maintain design consistency, ensure responsive design | _Leverage: Adapt StatusBadge.tsx for project activity status, follow card layout patterns from existing components | _Requirements: Requirement 1 (project display), Requirement 2 (metadata visibility) | Success: Component renders project information clearly, reuses existing styling patterns, responsive and accessible | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 5. Create ProjectList component in components/projects/ProjectList.tsx
  - File: components/projects/ProjectList.tsx
  - Render grid/list of ProjectCard components with loading and error states
  - Handle empty states when no projects found
  - Purpose: Main container for project discovery interface
  - _Leverage: components/projects/ProjectCard.tsx, existing loading patterns_
  - _Requirements: Requirement 1, Requirement 4_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in React list rendering and state management | Task: Create ProjectList component following Requirements 1 and 4, rendering ProjectCard components with proper loading/error/empty states | Restrictions: Must handle loading states gracefully, provide clear empty state messaging, maintain performance with large project lists | _Leverage: Use ProjectCard component, follow existing loading and error handling patterns from the codebase | _Requirements: Requirement 1 (project listing), Requirement 4 (responsive interface) | Success: Component renders project lists efficiently, handles all states properly, user-friendly empty states | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 6. Create SessionCard component in components/projects/SessionCard.tsx
  - File: components/projects/SessionCard.tsx
  - Display session file metadata (name, size, date) in card format
  - Handle file access errors and missing metadata gracefully
  - Purpose: Session representation in project detail view
  - _Leverage: existing card component patterns_
  - _Requirements: Requirement 3_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in data display components and file metadata presentation | Task: Create SessionCard component following Requirement 3, displaying session file metadata with proper error handling for inaccessible files | Restrictions: Display metadata only (no content), handle missing/corrupted files gracefully, maintain consistent styling | _Leverage: Follow existing card component patterns, use file size and date formatting utilities | _Requirements: Requirement 3 (session metadata display) | Success: Component displays session information clearly, handles errors gracefully, consistent with design system | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 7. Create SessionList component in components/projects/SessionList.tsx
  - File: components/projects/SessionList.tsx
  - Render list of SessionCard components for project detail view
  - Handle empty sessions case and loading states
  - Purpose: Container for session display within project details
  - _Leverage: components/projects/SessionCard.tsx_
  - _Requirements: Requirement 3_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer with expertise in list components and project navigation | Task: Create SessionList component following Requirement 3, rendering SessionCard components with empty state handling for projects without sessions | Restrictions: Must provide clear messaging for empty sessions, maintain loading performance, handle session list updates | _Leverage: Use SessionCard component, follow existing list rendering patterns | _Requirements: Requirement 3 (session navigation within projects) | Success: Component renders session lists properly, clear empty state messaging, efficient rendering | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 8. Create projects page in app/projects/page.tsx
  - File: app/projects/page.tsx
  - Main page component for project browser interface
  - Integrate ProjectList component with project service data
  - Purpose: Primary entry point for Claude Code project discovery
  - _Leverage: components/projects/ProjectList.tsx, lib/services/projectService.ts_
  - _Requirements: Requirement 1, Requirement 4_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer with expertise in Next.js App Router and component integration | Task: Create main projects page following Requirements 1 and 4, integrating ProjectList component with projectService for project discovery | Restrictions: Must follow Next.js App Router patterns, handle async data loading, provide error boundaries | _Leverage: Use ProjectList component and projectService, follow existing page patterns from app/ directory | _Requirements: Requirement 1 (project listing), Requirement 4 (responsive interface) | Success: Page loads and displays projects correctly, proper error handling, follows Next.js patterns | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 9. Create project detail page in app/projects/[id]/page.tsx
  - File: app/projects/[id]/page.tsx
  - Dynamic route for individual project detail view
  - Integrate SessionList component with session service data
  - Purpose: Detailed view of project sessions and metadata
  - _Leverage: components/projects/SessionList.tsx, lib/services/sessionService.ts_
  - _Requirements: Requirement 3_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer with expertise in Next.js dynamic routing and project navigation | Task: Create project detail page following Requirement 3, implementing dynamic routing for project-specific session display using SessionList and sessionService | Restrictions: Must handle invalid project IDs, provide navigation back to project list, handle loading states | _Leverage: Use SessionList component and sessionService, follow Next.js dynamic routing patterns | _Requirements: Requirement 3 (project session navigation) | Success: Page displays project sessions correctly, handles invalid routes, proper navigation flow | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 10. Add navigation component in components/projects/ProjectNavigation.tsx
  - File: components/projects/ProjectNavigation.tsx
  - Breadcrumb navigation between project list and project details
  - Handle back navigation and current location indication
  - Purpose: Clear navigation structure for project browsing
  - _Leverage: Next.js router utilities_
  - _Requirements: Requirement 4_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in navigation components and user experience | Task: Create ProjectNavigation component following Requirement 4, implementing breadcrumb navigation between project views with clear location indication | Restrictions: Must follow accessibility guidelines, provide clear navigation cues, maintain responsive design | _Leverage: Use Next.js router utilities, follow existing navigation patterns | _Requirements: Requirement 4 (intuitive interface navigation) | Success: Navigation is clear and functional, proper breadcrumbs, accessible and responsive | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 11. Add error handling utilities in lib/utils/projectUtils.ts
  - File: lib/utils/projectUtils.ts
  - File path validation and sanitization utilities
  - Error formatting for project/session access failures
  - Purpose: Centralized utility functions for project operations
  - _Leverage: Node.js path utilities_
  - _Requirements: All requirements (error handling)_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in file system security and error handling | Task: Create utility functions for file path validation and error handling covering all requirements, ensuring secure file system access limited to Claude projects directory | Restrictions: Must prevent directory traversal attacks, validate all file paths, provide meaningful error messages | _Leverage: Use Node.js path utilities for safe path operations | _Requirements: All requirements (comprehensive error handling) | Success: Utilities prevent security issues, provide clear error messages, handle all edge cases | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_

- [ ] 12. Integration testing and final polish
  - Files: All components and services
  - End-to-end testing of project discovery flow
  - Performance optimization and error boundary testing
  - Purpose: Ensure complete feature reliability and user experience
  - _Leverage: All created components and services_
  - _Requirements: All requirements_
  - _Prompt: Implement the task for spec claude-code-project-browser, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in integration testing and performance optimization | Task: Perform comprehensive integration testing covering all requirements, testing project discovery flow from end-to-end with performance validation | Restrictions: Must test real file system scenarios, validate error handling, ensure responsive performance | _Leverage: All implemented components and services for comprehensive testing | _Requirements: All requirements (complete feature validation) | Success: All user scenarios work correctly, performance meets requirements, comprehensive error handling validated | Instructions: Set this task to in-progress in tasks.md before starting, mark as complete when done_