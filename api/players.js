const crypto = require('node:crypto');

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

function configured() {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.INGEST_SECRET;
}

async function supabase(path, options = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  return fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

function secretMatches(supplied, expected) {
  if (typeof supplied !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function validMetric(value) {
  return value === undefined || value === null || (Number.isSafeInteger(value) && value >= 0);
}

module.exports = async function handler(req, res) {
  if (!configured()) return json(res, 503, { error: 'Player tracking is not configured.' });

  if (req.method === 'GET') {
    try {
      const [onlineResponse, recentResponse] = await Promise.all([
        supabase('player_sessions?select=user_id,player_name,game_name,joined_at,rap,value&order=joined_at.desc&limit=500'),
        supabase('player_events?select=id,user_id,player_name,game_name,event,created_at,rap,value&order=created_at.desc&limit=200')
      ]);
      if (!onlineResponse.ok || !recentResponse.ok) throw new Error('Database read failed');
      const [online, recent] = await Promise.all([onlineResponse.json(), recentResponse.json()]);
      return json(res, 200, { online, recent });
    } catch (_) {
      return json(res, 502, { error: 'Unable to load player activity.' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!secretMatches(req.headers['x-ingest-key'], process.env.INGEST_SECRET)) return json(res, 401, { error: 'Unauthorized.' });

  const { event, userId, playerName, gameName = 'biur.online', rap = null, value = null } = req.body || {};
  const id = String(userId ?? '');
  if (!['join', 'leave'].includes(event) || !/^\d{1,24}$/.test(id) || typeof playerName !== 'string' || !/^[\w .-]{1,32}$/.test(playerName) || typeof gameName !== 'string' || gameName.length > 100 || !validMetric(rap) || !validMetric(value)) {
    return json(res, 400, { error: 'Provide event (join/leave), numeric userId, playerName (1–32 characters), gameName (up to 100 characters), and non-negative integer rap/value or null.' });
  }

  try {
    const record = { user_id: id, player_name: playerName, game_name: gameName, event, rap, value };
    const eventResponse = await supabase('player_events', {
      method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(record)
    });
    if (!eventResponse.ok) throw new Error('Could not save event');

    const sessionResponse = event === 'join'
      ? await supabase('player_sessions?on_conflict=user_id', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ user_id: id, player_name: playerName, game_name: gameName, joined_at: new Date().toISOString(), rap, value })
        })
      : await supabase(`player_sessions?user_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    if (!sessionResponse.ok) throw new Error('Could not update online players');
    return json(res, 200, { ok: true });
  } catch (_) {
    return json(res, 502, { error: 'Unable to record player activity.' });
  }
};
