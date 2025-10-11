'use client';

export default function CommitBadge() {
  const commit = process.env.NEXT_PUBLIC_COMMIT || 'dev';
  
  return (
    <span
      title="Build commit"
      className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200"
      data-testid="commit-badge"
    >
      {commit}
    </span>
  );
}