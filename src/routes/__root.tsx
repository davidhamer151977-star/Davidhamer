import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { IdentityProvider } from '../lib/identity-context'
import { CallbackHandler } from '../components/CallbackHandler'
import '../styles.css'

const siteName = 'David Hamer — The Common Room'
const siteDescription = 'A thoughtful social space for sharing ideas, finding people, and keeping good conversations going.'

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'icon', href: '/yorkshire-rose.svg', type: 'image/svg+xml' }],
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <IdentityProvider><CallbackHandler>{children}</CallbackHandler></IdentityProvider>
        <Scripts />
      </body>
    </html>
  )
}
