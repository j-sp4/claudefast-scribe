import ContentLayout from '@/components/ContentLayout';
import Link from 'next/link';

export default function HomePage() {
  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '3rem'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '3rem',
    fontWeight: '800',
    marginBottom: '1rem',
    color: 'var(--text-primary)',
    lineHeight: '1.2'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    color: 'var(--text-secondary)',
    marginBottom: '2rem',
    lineHeight: '1.5'
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem'
  };

  const cardStyle: React.CSSProperties = {
    display: 'block',
    padding: '2rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '0.75rem',
    border: '1px solid var(--border)',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    boxShadow: 'var(--shadow)'
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.75rem',
    color: 'var(--text-primary)'
  };

  const cardDescStyle: React.CSSProperties = {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.6'
  };

  const infoBoxStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    padding: '2rem',
    borderRadius: '0.75rem',
    border: '1px solid var(--border)',
    marginTop: '2rem',
    boxShadow: 'var(--shadow)'
  };

  const infoTitleStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: 'var(--text-primary)'
  };

  const listStyle: React.CSSProperties = {
    paddingLeft: '1.5rem',
    marginTop: '1rem'
  };

  const listItemStyle: React.CSSProperties = {
    marginBottom: '0.75rem',
    lineHeight: '1.6'
  };

  return (
    <ContentLayout>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Scribe Documentation</h1>
        <p style={subtitleStyle}>
          A crowd-sourced documentation system powered by MCP (Model Context Protocol)
        </p>
      </div>

      <div style={gridStyle}>
        <Link
          href="/getting-started"
          style={cardStyle}
        >
          <h3 style={cardTitleStyle}>🚀 Getting Started</h3>
          <p style={cardDescStyle}>
            Learn how to install and configure Scribe for your development workflow.
          </p>
        </Link>

        <Link
          href="/architecture"
          style={cardStyle}
        >
          <h3 style={cardTitleStyle}>🏗️ Architecture</h3>
          <p style={cardDescStyle}>
            Understand the MCP protocol, data flow, and knowledge base structure.
          </p>
        </Link>

        <Link
          href="/api"
          style={cardStyle}
        >
          <h3 style={cardTitleStyle}>📚 API Reference</h3>
          <p style={cardDescStyle}>
            Complete reference for MCP tools, REST endpoints, and authentication.
          </p>
        </Link>

        <Link
          href="/development"
          style={cardStyle}
        >
          <h3 style={cardTitleStyle}>⚙️ Development</h3>
          <p style={cardDescStyle}>
            Setup guides, contribution guidelines, and deployment instructions.
          </p>
        </Link>

        <Link
          href="/features"
          style={cardStyle}
        >
          <h3 style={cardTitleStyle}>✨ Features</h3>
          <p style={cardDescStyle}>
            Explore AI-powered search, duplicate detection, and validation features.
          </p>
        </Link>
      </div>

      <div style={infoBoxStyle}>
        <h2 style={infoTitleStyle}>What is Scribe?</h2>
        <p>
          Scribe is an innovative crowd-sourced documentation system that leverages the Model Context Protocol (MCP) 
          to provide AI coding assistants with direct access to searchable, editable documentation. It combines:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}><strong>AI-Powered Search:</strong> Intelligent knowledge base queries using Claude AI</li>
          <li style={listItemStyle}><strong>Duplicate Detection:</strong> Advanced semantic similarity detection for Q&A pairs</li>
          <li style={listItemStyle}><strong>Real-time Updates:</strong> Live streaming updates and validation</li>
          <li style={listItemStyle}><strong>MCP Integration:</strong> Seamless integration with Claude Code and other MCP clients</li>
        </ul>
      </div>
    </ContentLayout>
  );
}
