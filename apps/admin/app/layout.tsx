import './globals.css';

export const metadata = {
  title: 'Subway Admin',
  description: 'Admin dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0f172a] text-white">
        <div className="container mx-auto">{children}</div>
      </body>
    </html>
  );
}
