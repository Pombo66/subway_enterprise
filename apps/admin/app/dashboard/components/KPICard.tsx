import { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  accentColor: 'green' | 'yellow' | 'blue';
}

const accentClasses = {
  green: 's-accentGreen',
  yellow: 's-accentYellow',
  blue: 's-accentBlue',
} as const;

const blobClasses = {
  green: 's-blob',
  yellow: 's-blob s-blob--y',
  blue: 's-blob s-blob--b',
} as const;

export default function KPICard({ title, value, subtitle, icon, accentColor }: KPICardProps) {
  return (
    <div className="s-card">
      <div className={`s-cardAccent ${accentClasses[accentColor]}`} />
      <p className="s-k">
        <span className={blobClasses[accentColor]} aria-hidden="true">
          {icon}
        </span>
        {title}
      </p>
      <p className="s-v">{value}</p>
      <p className="s-sub">{subtitle}</p>
    </div>
  );
}