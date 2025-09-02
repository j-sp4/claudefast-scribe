import Navigation from './Navigation';

interface ContentLayoutProps {
  children: React.ReactNode;
}

export default function ContentLayout({ children }: ContentLayoutProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)'
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    padding: '2rem 3rem',
    backgroundColor: 'var(--bg-primary)',
    overflowX: 'auto'
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '900px',
    margin: '0 auto',
    lineHeight: '1.7'
  };

  return (
    <div style={containerStyle}>
      <Navigation />
      <main style={mainStyle}>
        <div style={contentStyle}>
          {children}
        </div>
      </main>
    </div>
  );
}