# Project Structure

## Directory Organization

```
cc-tasks/
├── app/                     # Next.js App Router directory
│   ├── globals.css         # Global styles and Tailwind imports
│   ├── layout.tsx          # Root layout with fonts and metadata
│   ├── page.tsx            # Home page component
│   └── favicon.ico         # App icon
├── components/              # React component library
│   ├── shared/             # Reusable UI components
│   │   └── StatusBadge.tsx # Task status indicator component
│   └── tasks/              # Task management specific components
│       ├── DesignNotesCard.tsx    # Design documentation display
│       ├── QueueIntroCard.tsx     # Queue introduction/help
│       ├── TaskPipeline.tsx       # Task list and selection UI
│       ├── TaskQueueForm.tsx      # Task creation form
│       └── TaskSessionsPanel.tsx  # Session monitoring interface
├── hooks/                   # Custom React hooks for business logic
│   ├── useQueueTaskForm.ts # Form state management hook
│   └── useTaskQueue.ts     # Task queue state and operations
├── lib/                     # Shared utilities and core logic
│   ├── services/           # Business logic and API abstractions
│   │   └── taskService.ts  # Task CRUD operations and mock data
│   ├── types/              # TypeScript type definitions
│   │   └── task.ts         # Core task and session type definitions
│   └── ui/                 # UI utilities and design tokens
│       └── layout.ts       # Shared CSS classes and design tokens
├── public/                  # Static assets
│   └── *.svg               # Icon assets from Next.js template
├── .spec-workflow/          # Spec workflow documentation system
│   ├── steering/           # Project steering documents
│   └── templates/          # Document templates
└── .serena/                # Serena MCP server project memory
    └── memories/           # Persistent project context
```

## Naming Conventions

### Files
- **Components**: `PascalCase.tsx` (e.g., `TaskPipeline.tsx`, `StatusBadge.tsx`)
- **Hooks**: `camelCase.ts` with `use` prefix (e.g., `useTaskQueue.ts`, `useQueueTaskForm.ts`)
- **Services**: `camelCase.ts` with descriptive suffix (e.g., `taskService.ts`)
- **Types**: `camelCase.ts` with domain grouping (e.g., `task.ts`)
- **Utilities**: `camelCase.ts` with functional naming (e.g., `layout.ts`)

### Code
- **Components**: `PascalCase` for component names and prop types
- **Functions**: `camelCase` for all functions and methods
- **Types/Interfaces**: `PascalCase` for type definitions (e.g., `Task`, `TaskStatus`)
- **Constants**: `camelCase` for exported constants (e.g., `cardSurface`)
- **Props**: `ComponentNameProps` pattern for prop type definitions

## Import Patterns

### Import Order
1. **React/Framework imports**: React hooks, Next.js components
2. **External dependencies**: Third-party libraries (currently minimal)
3. **Internal modules**: Absolute imports using `@/` path mapping
4. **Relative imports**: Component-local dependencies (rare, prefer absolute)

### Module Organization
```typescript
// Standard import pattern in components
"use client";                           // Next.js client directive when needed

import { useCallback, useState } from "react";  // React/framework imports
import { Task } from "@/lib/types/task";        // Type imports
import { taskService } from "@/lib/services/taskService"; // Service imports
import { StatusBadge } from "@/components/shared/StatusBadge"; // Component imports
```

- **Absolute imports**: All internal imports use `@/` path mapping from project root
- **Path mapping**: TypeScript `baseUrl` and `paths` configuration for clean imports
- **Barrel exports**: Not currently used, direct file imports preferred

## Code Structure Patterns

### Component Organization
```typescript
// Standard component file structure:
1. "use client" directive (if needed for client components)
2. React and external imports
3. Internal imports (types, services, components)
4. Type definitions (props, local types)
5. Main component implementation
6. Helper functions (if needed)
7. Default export
```

### Hook Organization
```typescript
// Custom hook pattern:
1. "use client" directive
2. React hooks imports
3. Internal type and service imports
4. Hook return type definition
5. Hook implementation with:
   - State declarations
   - Derived state (useMemo)
   - Event handlers (useCallback)
   - Side effects (useEffect)
   - Return object
```

### Service Organization
```typescript
// Service module pattern:
1. Type imports
2. Implementation constants/mock data
3. Service interface definition
4. Service implementation object
5. Named exports
```

## Code Organization Principles

1. **Feature-Based Grouping**: Components organized by domain (`tasks/`, `shared/`)
2. **Separation of Concerns**: UI components, business logic hooks, and services clearly separated
3. **Single Responsibility**: Each component and hook has one clear purpose
4. **Composition Over Inheritance**: React composition patterns with prop interfaces
5. **Type Safety**: Full TypeScript coverage with explicit interfaces
6. **Client/Server Boundary**: Clear distinction with "use client" directives

## Module Boundaries

### Core Architecture Layers:
- **UI Layer** (`components/`): Pure presentation components with minimal logic
- **State Layer** (`hooks/`): Business logic, state management, and side effects
- **Service Layer** (`lib/services/`): Data operations and external integrations
- **Type Layer** (`lib/types/`): Shared data contracts and interfaces

### Dependency Direction:
```
Components → Hooks → Services → Types
     ↓         ↓        ↓
   UI Utils ← ← ← ← ← ← ←
```

- **UI components** depend on hooks for state and business logic
- **Hooks** depend on services for data operations
- **Services** depend on types for contracts
- **All layers** can use UI utilities and shared types

### Boundary Rules:
- Components should not directly import services (use hooks instead)
- Services should not import React hooks or components
- Types should have no dependencies on other layers
- Shared utilities (`lib/ui/`) can be used by any layer

## Code Size Guidelines

- **Component files**: Maximum 200 lines (current largest ~50 lines)
- **Hook files**: Maximum 150 lines (current largest ~80 lines)
- **Service files**: Maximum 300 lines (current ~120 lines)
- **Function size**: Maximum 50 lines per function/method
- **Nesting depth**: Maximum 4 levels of nesting
- **Props interface**: Maximum 10 properties per component props

## File Organization Principles

### Component Structure:
- **One component per file**: Each `.tsx` file exports one primary component
- **Co-located types**: Component-specific types defined in same file as component
- **Prop interfaces**: Always explicitly defined, never inline
- **Client directives**: Clearly marked at file top when needed

### Hook Structure:
- **Custom hooks only**: No generic utility functions in hook files
- **Clear return types**: Always explicitly typed return interfaces
- **Single concern**: Each hook manages one aspect of state/behavior

### Service Structure:
- **Interface + implementation**: Service interface and implementation in same file
- **Mock data**: Development mock data co-located with service implementation
- **Async by default**: All service methods return Promises for consistency

## Documentation Standards

- **Component props**: JSDoc comments for complex prop interfaces
- **Hook return values**: Clear TypeScript interfaces with descriptive property names
- **Service methods**: Comment complex business logic and mock data structures
- **Type definitions**: Self-documenting type names with union types for clarity
- **README**: Project-level documentation for setup and development workflow

## Development Workflow Structure

### Hot Reload Support:
- Next.js with Turbopack for instant component updates
- TypeScript watch mode for type checking
- CSS hot reload through Tailwind and PostCSS

### State Management Pattern:
- Local component state with `useState`
- Shared state through custom hooks
- No external state management library (Redux, Zustand) currently needed
- Form state managed through dedicated hooks (`useQueueTaskForm`)

### Error Boundaries:
- Error handling through hook return values
- Service layer errors propagated through Promise rejections
- UI error states managed in component state
- No global error boundaries currently implemented