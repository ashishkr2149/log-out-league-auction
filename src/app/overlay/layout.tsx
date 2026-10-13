export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: 'transparent',
          overflow: 'hidden',
          width: '1920px',
          height: '1080px',
        }}
      >
        {children}
      </body>
    </html>
  );
}
