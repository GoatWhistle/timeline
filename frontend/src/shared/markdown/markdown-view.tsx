import type { ReactNode } from 'react'
import { cn } from '@/shared/styling/class-names/class-names'
import { ExternalLink } from '@/shared/ui/navigation/external-link/external-link'
import { type BlockNode, type ListItem, parseMarkdown } from './block'
import type { InlineNode } from './inline'

const HEADING_CLASS: Record<1 | 2 | 3, string> = {
  1: 'text-section font-semibold text-foreground',
  2: 'text-copy font-semibold text-foreground',
  3: 'text-copy font-medium text-foreground',
}

const INDENT_CLASS = ['', 'ml-5', 'ml-10']

function inlineKey(node: InlineNode, at: string): string {
  if (node.kind === 'text' || node.kind === 'code') return `${at}:${node.kind}:${node.value}`
  if (node.kind === 'link') return `${at}:link:${node.href}`
  return `${at}:${node.kind}`
}

function renderOne(node: InlineNode, key: string): ReactNode {
  switch (node.kind) {
    case 'text':
      return <span key={key}>{node.value}</span>
    case 'strong':
      return <strong key={key}>{renderInline(node.children, key)}</strong>
    case 'emphasis':
      return <em key={key}>{renderInline(node.children, key)}</em>
    case 'code':
      return (
        <code key={key} className="rounded-badge bg-muted px-1 py-0.5 font-mono text-caption">
          {node.value}
        </code>
      )
    default:
      return (
        <ExternalLink key={key} href={node.href} className="underline underline-offset-2">
          {renderInline(node.children, key)}
        </ExternalLink>
      )
  }
}

function renderInline(nodes: InlineNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => renderOne(node, inlineKey(node, `${keyPrefix}-${index}`)))
}

function renderItems(items: ListItem[], ordered: boolean, key: string): ReactNode {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag
      key={key}
      className={cn('flex flex-col gap-1 text-copy', ordered ? 'list-decimal' : 'list-disc')}
    >
      {items.map((item, index) => {
        const itemKey = `${key}-${index}-${item.depth}`
        return (
          <li key={itemKey} className={cn('ml-5', INDENT_CLASS[item.depth] ?? INDENT_CLASS[0])}>
            {renderInline(item.children, itemKey)}
          </li>
        )
      })}
    </Tag>
  )
}

function renderBlock(block: BlockNode, key: string): ReactNode {
  switch (block.kind) {
    case 'heading': {
      const Tag = `h${block.level + 2}` as 'h3' | 'h4' | 'h5'
      return (
        <Tag key={key} className={HEADING_CLASS[block.level]}>
          {renderInline(block.children, key)}
        </Tag>
      )
    }
    case 'paragraph':
      return (
        <p key={key} className="text-copy [text-wrap:pretty]">
          {renderInline(block.children, key)}
        </p>
      )
    case 'quote':
      return (
        <blockquote
          key={key}
          className="border-border border-l-2 pl-3 text-copy text-muted-foreground"
        >
          {renderInline(block.children, key)}
        </blockquote>
      )
    case 'code':
      return (
        <pre
          key={key}
          className="overflow-x-auto rounded-control bg-muted p-3 font-mono text-caption"
        >
          <code>{block.value}</code>
        </pre>
      )
    case 'list':
      return renderItems(block.items, block.ordered, key)
    case 'rule':
      return <hr key={key} className="border-border" />
  }
}

export function MarkdownView({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source)
  if (blocks.length === 0) return null
  return (
    <div className={cn('flex max-w-prose flex-col gap-3', className)}>
      {blocks.map((block, index) => renderBlock(block, `b${index}`))}
    </div>
  )
}
