module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const hasSupabaseUrl = !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const hasAnonKey = !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const hasServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE);

  res.status(200).json({
    ok: hasSupabaseUrl && hasAnonKey,
    hasSupabaseUrl,
    hasAnonKey,
    hasServiceRole,
    source: {
      urlFrom: process.env.SUPABASE_URL ? 'SUPABASE_URL' : (process.env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL' : null),
      anonFrom: process.env.SUPABASE_ANON_KEY ? 'SUPABASE_ANON_KEY' : (process.env.VITE_SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : null),
    },
  });
};