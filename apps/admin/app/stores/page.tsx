import { bff } from '@/lib/api';

type StoreRow = {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  createdAt: string;
};

export default async function StoresPage() {
  const data = await bff<StoreRow[]>('/stores');

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0f1115',
        color: '#e6e6e6',
        padding: '32px',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji',
      }}
    >
      <style>{`
        .card { border:1px solid #1c212b; border-radius:10px; overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,0.03) inset; background:#121621; }
        .thead { background:#161b26; }
        .th { padding:12px 14px; font-size:13px; font-weight:600; color:#b8c0cc; border-bottom:1px solid #1c212b; position:sticky; top:0; zIndex:1; }
        .td { padding:12px 14px; border-bottom:1px solid #1c212b; }
        .row0 { background:#121621; }
        .row1 { background:#141a25; }
        tr:hover { background:#1a2230; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, margin: '0 0 16px 0', fontWeight: 600 }}>
          Stores
        </h1>

        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead className="thead">
              <tr>
                {['ID', 'Name', 'Country', 'Region', 'Created'].map((h) => (
                  <th key={h} className="th" align="left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((s, idx) => (
                <tr key={s.id} className={idx % 2 === 0 ? 'row0' : 'row1'}>
                  <td className="td" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.id}</td>
                  <td className="td">{s.name}</td>
                  <td className="td">{s.country ?? '—'}</td>
                  <td className="td">{s.region ?? '—'}</td>
                  <td className="td">{new Date(s.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
