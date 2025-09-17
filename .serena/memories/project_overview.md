# CC-Manager Project Overview

## Purpose
CC-Manager is a Next.js web application for managing Claude Code tasks and sessions. It appears to be a project management tool specifically designed for Claude Code workflows, with features for viewing projects, sessions, conversations, and task management.

## Tech Stack
- **Framework**: Next.js 15.5.3 with App Router
- **Runtime**: React 19.1.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Build Tool**: Turbopack (Next.js built-in)
- **Package Manager**: pnpm (based on pnpm-lock.yaml)

## Project Structure
- `/app` - Next.js App Router pages and layouts
  - `/projects/[id]/sessions/[sessionId]` - Dynamic routing for project sessions
- `/components` - React components organized by feature
  - `/conversations` - Chat/conversation UI components
  - `/projects` - Project management components
  - `/shared` - Reusable UI components
  - `/tasks` - Task management components
- `/lib` - Utility libraries and services
- `/hooks` - Custom React hooks
- `/public` - Static assets
- `/scripts` - Development/build scripts
- `/.spec-workflow` - Specification workflow management