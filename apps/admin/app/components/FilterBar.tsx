'use client';
import { useEffect, useState } from 'react';

export type Scope = 'global'|'region'|'store';
export type Filters = { scope: Scope; storeId?: string; country?: string; region?: string; };

export default function FilterBar({ onChange }: { onChange: (f: Filters)=>void }) {
  const [f, setF] = useState<Filters>(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('kpiFilters') : null;
    return raw ? JSON.parse(raw) : { scope: 'global' };
  });
  useEffect(() => { localStorage.setItem('kpiFilters', JSON.stringify(f)); onChange(f); }, [f]);

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="text-sm">Scope
        <select className="ml-2 rounded bg-card border border-white/10 px-2 py-1"
                value={f.scope}
                onChange={e=>setF({ ...f, scope: e.target.value as Scope, /* reset */ storeId: undefined, country: undefined, region: undefined })}>
          <option value="global">Global</option>
          <option value="region">Region</option>
          <option value="store">Store</option>
        </select>
      </label>
      {f.scope === 'region' && (
        <>
          <input placeholder="Country (full name, e.g. France)" className="rounded bg-card border border-white/10 px-2 py-1"
                 value={f.country || ''} onChange={e=>setF({ ...f, country: e.target.value || undefined })}/>
          <input placeholder="Region e.g. EMEA (optional)" className="rounded bg-card border border-white/10 px-2 py-1"
                 value={f.region || ''}  onChange={e=>setF({ ...f, region: e.target.value || undefined })}/>
        </>
      )}
      {f.scope === 'store' && (
        <input placeholder="Store ID" className="rounded bg-card border border-white/10 px-2 py-1"
               value={f.storeId || ''} onChange={e=>setF({ ...f, storeId: e.target.value || undefined })}/>
      )}
    </div>
  );
}
