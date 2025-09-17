# Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2017
- **Strict mode**: Enabled
- **Path mapping**: `@/*` points to project root
- **JSX**: Preserve (Next.js handles compilation)

## ESLint Configuration
- Uses Next.js recommended configurations: `next/core-web-vitals`, `next/typescript`
- Ignores: node_modules, .next, out, build, next-env.d.ts

## File Organization
- **Components**: Organized by feature domain (conversations, projects, shared, tasks)
- **Pages**: Follow Next.js App Router structure with dynamic routes
- **Naming**: 
  - Components use PascalCase (e.g., ProjectCard.tsx)
  - Files use camelCase for pages (e.g., page.tsx)
  - Directories use kebab-case for features

## React Patterns
- Uses React 19.1.0 (latest)
- Functional components with hooks
- TypeScript for type safety
- Component files organized by feature domains