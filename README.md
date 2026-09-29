# David Hamer — The Common Room

A thoughtful social network for sharing ideas, meeting people, and keeping worthwhile conversations going. Members can create accounts, publish short notes by topic, search the feed, like posts, reply, and discover people in a responsive editorial interface.

## Technology

The app uses React 19 and TanStack Start, Netlify Identity for accounts, Netlify Functions for the protected social API, and Netlify Database with Drizzle ORM for profiles, posts, likes, and comments. Styling is custom CSS with Tailwind available through the Vite integration.

## Run locally

Install dependencies with `pnpm install`, then run `pnpm dev`. The interface and public feed work locally, while account flows require a deployed Netlify environment. Database migrations are applied automatically during deployment.
