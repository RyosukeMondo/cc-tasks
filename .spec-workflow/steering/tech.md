# Technology Stack

## Project Type
Web application - React-based dashboard for managing Claude Code task queues and monitoring AI-assisted development sessions in real-time.

## Core Technologies

### Primary Language(s)
- **Language**: TypeScript 5.x
- **Runtime**: Node.js (via Next.js)
- **Language-specific tools**: npm/pnpm for package management, ESLint for code quality

### Key Dependencies/Libraries
- **Next.js 15.5.3**: Full-stack React framework with App Router, server components, and Turbopack
- **React 19.1.0**: Modern UI library with concurrent features and server components
- **Tailwind CSS 4.x**: Utility-first CSS framework with PostCSS integration
- **Geist Fonts**: Vercel's optimized font family (Sans & Mono variants)

### Application Architecture
Client-server architecture with React Server Components:
- **Frontend**: React 19 with Next.js App Router for component-based UI
- **State Management**: React hooks (useState, useCallback) with custom hooks for business logic
- **Real-time Updates**: WebSocket/SSE integration planned for live session monitoring
- **Type Safety**: Full TypeScript coverage across frontend and backend logic

### Data Storage
- **Primary storage**: File system-based (Claude Code JSONL session files at `~/.claude/projects/`)
- **Caching**: Browser-based caching for static assets, potential server-side caching for session data
- **Data formats**: JSON for API communication, JSONL for Claude Code session persistence

### External Integrations
- **APIs**: Claude Code SDK integration for session management and process control
- **Protocols**: HTTP/REST for API communication, WebSocket/SSE for real-time updates
- **Authentication**: Integration with Claude Code's existing authentication system

### Monitoring & Dashboard Technologies
- **Dashboard Framework**: React 19 with Next.js App Router and server components
- **Real-time Communication**: Server-Sent Events (SSE) planned for live session status updates
- **State Management**: Custom React hooks for task queue and session state management
- **Styling**: Tailwind CSS with dark theme (slate-950 background) and responsive design

## Development Environment

### Build & Development Tools
- **Build System**: Next.js with Turbopack for fast development builds and hot reload
- **Package Management**: npm/pnpm with package.json scripts
- **Development workflow**: Hot module replacement via Next.js dev server with Turbopack

### Code Quality Tools
- **Static Analysis**: TypeScript compiler for type checking
- **Formatting**: ESLint 9.x with Next.js configuration
- **Testing Framework**: Not yet implemented (planned for future iterations)
- **Documentation**: JSDoc comments in TypeScript files

### Version Control & Collaboration
- **VCS**: Git with standard branching workflow
- **Branching Strategy**: Feature branch workflow (evidenced by git status showing modified files)
- **Code Review Process**: Standard pull request review process

### Dashboard Development
- **Live Reload**: Next.js hot module replacement with Turbopack for instant updates
- **Port Management**: Default Next.js port (3000) with custom dev origins configuration
- **Multi-Instance Support**: Configurable via Next.js allowedDevOrigins for development

## Deployment & Distribution
- **Target Platform(s)**: Web browsers (desktop-focused dashboard interface)
- **Distribution Method**: Web application deployment (Vercel-ready Next.js application)
- **Installation Requirements**: Modern web browser, Node.js for development
- **Update Mechanism**: Standard web application deployment pipeline

## Technical Requirements & Constraints

### Performance Requirements
- **Response time**: <100ms for UI interactions, <500ms for task queue operations
- **Real-time updates**: WebSocket/SSE latency <50ms for session status changes
- **Memory usage**: Efficient React rendering with minimal re-renders via custom hooks

### Compatibility Requirements
- **Platform Support**: Modern web browsers (Chrome, Firefox, Safari, Edge)
- **Dependency Versions**: Node.js 18+, React 19.x, Next.js 15.x
- **Standards Compliance**: HTML5, CSS3, ES2022+ JavaScript standards

### Security & Compliance
- **Security Requirements**: Integration with Claude Code's existing security model
- **Authentication**: Leverage Claude Code's authentication system
- **Data Protection**: Session data handled in accordance with Claude Code's privacy policies

### Scalability & Reliability
- **Expected Load**: 10-50 concurrent users per team, 100+ tasks in queue
- **Availability Requirements**: High availability during development hours
- **Growth Projections**: Scale to support enterprise teams with 1000+ tasks and multiple concurrent sessions

## Technical Decisions & Rationale

### Decision Log
1. **Next.js App Router**: Chosen for server components, improved performance, and modern React patterns over Pages Router
2. **React 19**: Adopted for concurrent features, server components, and improved developer experience
3. **Tailwind CSS 4.x**: Selected for rapid UI development, consistent design system, and excellent dark theme support
4. **TypeScript**: Mandatory for type safety in complex state management and API integrations
5. **Custom Hooks Pattern**: Implemented for clean separation of business logic from UI components (useTaskQueue, useQueueTaskForm)

## Known Limitations
- **Testing Coverage**: No test suite implemented yet - high priority for production readiness
- **Real-time Updates**: Currently using mock data - WebSocket/SSE integration pending
- **Error Handling**: Basic error handling in place - needs comprehensive error boundary implementation
- **Accessibility**: Limited accessibility features - requires WCAG compliance audit
- **Performance Monitoring**: No performance tracking or analytics implemented yet