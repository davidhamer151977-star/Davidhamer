# Project guide

David Hamer’s Common Room is a social publishing app built with TanStack Start and deployed on Netlify. The interface is intentionally editorial and warm, using a paper-and-ink visual system rather than a conventional dashboard.

## Architecture

- `src/routes/index.tsx` contains the responsive feed, composer, discovery, search, and account experience.
- `src/routes/__root.tsx` owns metadata and the application-wide Identity provider.
- `src/lib/identity-context.tsx` exposes Netlify Identity state to client components.
- `netlify/functions/social.mts` is the authenticated social API for posts, likes, comments, and profile creation.
- `db/schema.ts` defines the Drizzle/Postgres model. Every schema change requires a generated migration in `netlify/database/migrations`.
- `src/styles.css` contains the visual system and responsive behavior.

## Conventions

Use TypeScript, functional React components, and browser-native APIs. Keep database access in server code and authenticate mutations with `@netlify/identity`. Use snake_case for Postgres columns and camelCase in TypeScript. Preserve the warm neutral design tokens. Include accessible labels, keyboard behavior, loading states, empty states, and inline errors with new interactions.

## Local development

Run `pnpm dev` for interface work. Authentication requires a real Netlify deploy because Identity depends on the deployment cookie. Store durable state in Netlify Database and generate migrations with `pnpm exec drizzle-kit generate --name <imperative_name>`.
