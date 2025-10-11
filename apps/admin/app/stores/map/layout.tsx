import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Store Map - Subway Enterprise',
  description: 'Interactive map view of all store locations with real-time activity indicators and filtering capabilities.',
  keywords: 'stores, map, locations, activity, filters, geographic, visualization',
};

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}