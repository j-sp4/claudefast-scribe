'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  href: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    title: 'Getting Started',
    href: '/getting-started',
    children: [
      { title: 'Overview', href: '/getting-started' },
      { title: 'Installation', href: '/getting-started/installation' },
      { title: 'Quick Start', href: '/getting-started/quick-start' },
    ],
  },
  {
    title: 'Architecture',
    href: '/architecture',
    children: [
      { title: 'Overview', href: '/architecture' },
      { title: 'MCP Protocol', href: '/architecture/mcp-protocol' },
      { title: 'Data Flow', href: '/architecture/data-flow' },
      { title: 'Knowledge Base', href: '/architecture/knowledge-base' },
    ],
  },
  {
    title: 'API Reference',
    href: '/api',
    children: [
      { title: 'MCP Tools', href: '/api/mcp-tools' },
      { title: 'REST Endpoints', href: '/api/rest-endpoints' },
      { title: 'Authentication', href: '/api/authentication' },
    ],
  },
  {
    title: 'Development',
    href: '/development',
    children: [
      { title: 'Setup', href: '/development/setup' },
      { title: 'Contributing', href: '/development/contributing' },
      { title: 'Testing', href: '/development/testing' },
      { title: 'Deployment', href: '/development/deployment' },
    ],
  },
  {
    title: 'Features',
    href: '/features',
    children: [
      { title: 'AI-Powered Search', href: '/features/ai-search' },
      { title: 'Duplicate Detection', href: '/features/duplicate-detection' },
      { title: 'Knowledge Validation', href: '/features/validation' },
      { title: 'Streaming Updates', href: '/features/streaming' },
    ],
  },
];

export default function Navigation() {
  const pathname = usePathname();

  const navStyle: React.CSSProperties = {
    width: '280px',
    minWidth: '280px',
    backgroundColor: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border)',
    height: '100vh',
    overflowY: 'auto',
    position: 'sticky',
    top: 0,
    boxShadow: 'var(--shadow)',
    flexShrink: 0
  };

  const containerStyle: React.CSSProperties = {
    padding: '2rem 1.5rem'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: '800',
    marginBottom: '2rem',
    display: 'block',
    color: 'var(--text-primary)',
    textDecoration: 'none'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '1.5rem'
  };

  const mainLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'block',
    fontWeight: '600',
    fontSize: '0.9rem',
    marginBottom: '0.5rem',
    color: isActive ? 'var(--accent)' : 'var(--text-primary)',
    textDecoration: 'none',
    padding: '0.5rem 0',
    borderRadius: '0.25rem',
    transition: 'color 0.2s ease'
  });

  const childListStyle: React.CSSProperties = {
    marginLeft: '1rem',
    paddingLeft: '1rem',
    borderLeft: '2px solid var(--border)',
    marginTop: '0.5rem'
  };

  const childLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'block',
    fontSize: '0.85rem',
    padding: '0.4rem 0',
    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
    textDecoration: 'none',
    fontWeight: isActive ? '500' : '400',
    transition: 'color 0.2s ease'
  });

  return (
    <nav style={navStyle}>
      <div style={containerStyle}>
        <Link href="/" style={titleStyle}>
          📚 Scribe Docs
        </Link>
        
        <div>
          {navigationItems.map((item) => (
            <div key={item.href} style={sectionStyle}>
              <Link
                href={item.href}
                style={mainLinkStyle(pathname === item.href)}
              >
                {item.title}
              </Link>
              
              {item.children && (
                <ul style={childListStyle}>
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        style={childLinkStyle(pathname === child.href)}
                      >
                        {child.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}