/**
 * Reusable JSON-LD structured data components.
 *
 * Inject as a React component anywhere — they render a <script type="application/ld+json">.
 * Keeps schema generation co-located with the page that owns it.
 */

interface Props {
  data: Record<string, unknown>
}

function StructuredData({ data }: Props) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://critical.bike'

// ─── Organization ───────────────────────────────────────────────────────────

export function OrganizationSchema() {
  return (
    <StructuredData
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Critical',
        url: SITE_URL,
        logo: `${SITE_URL}/icon`,
        sameAs: [
          // Add when available
          // "https://twitter.com/critical_bike",
          // "https://www.youtube.com/@critical",
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'Customer Service',
          email: 'support@critical.bike',
          availableLanguage: ['zh', 'en'],
        },
      }}
    />
  )
}

// ─── WebSite (with SearchAction) ────────────────────────────────────────────

export function WebSiteSchema() {
  return (
    <StructuredData
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Critical',
        url: SITE_URL,
        description: '风·光·声·雾 四维沉浸式骑行体验',
        publisher: {
          '@type': 'Organization',
          name: 'Critical',
        },
      }}
    />
  )
}

// ─── Breadcrumb ─────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string
  url: string
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  return (
    <StructuredData
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
        })),
      }}
    />
  )
}

// ─── FAQ Page ───────────────────────────────────────────────────────────────

export interface FAQItem {
  question: string
  answer: string
}

export function FAQSchema({ items }: { items: FAQItem[] }) {
  return (
    <StructuredData
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }}
    />
  )
}

// ─── Article (for blog) ─────────────────────────────────────────────────────

export interface ArticleProps {
  title: string
  description: string
  publishedTime: string
  modifiedTime?: string
  author?: string
  image?: string
  url: string
}

export function ArticleSchema(props: ArticleProps) {
  return (
    <StructuredData
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: props.title,
        description: props.description,
        datePublished: props.publishedTime,
        dateModified: props.modifiedTime ?? props.publishedTime,
        author: {
          '@type': props.author ? 'Person' : 'Organization',
          name: props.author ?? 'Critical',
        },
        image: props.image ?? `${SITE_URL}/opengraph-image`,
        url: props.url.startsWith('http') ? props.url : `${SITE_URL}${props.url}`,
        publisher: {
          '@type': 'Organization',
          name: 'Critical',
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon` },
        },
      }}
    />
  )
}
