// netlify/functions/toyyib-callback.js
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ToyyibPay biasanya hantar sebagai application/x-www-form-urlencoded
  let payload = {};
  try {
    const ct = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();

    if (ct.includes('application/json')) {
      payload = JSON.parse(event.body || '{}');
    } else {
      const params = new URLSearchParams(event.body || '');
      payload = Object.fromEntries(params.entries());
    }
  } catch (err) {
    payload = { _raw: event.body || null, _parseError: String(err) };
  }

  // TODO: simpan ke DB/Google Sheet/Supabase & aktifkan akses pengguna
  // Contoh lapor ke log Netlify (boleh lihat dalam Site → Functions → toyyib-callback → Logs)
  console.log('ToyyibPay callback received:', payload);

  // Penting: balas 200
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true })
  };
}
