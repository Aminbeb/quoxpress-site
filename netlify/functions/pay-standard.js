// netlify/functions/pay-standard.js

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

exports.handler = async (event) => {
  // Preflight / kesihatan endpoint
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors() };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors(), body: 'Method Not Allowed' };
  }

  const {
    TOYYIB_SECRET,
    TOYYIB_CATEGORY,
    RETURN_URL,
    CALLBACK_URL,
  } = process.env;

  // Semak ENV
  if (!TOYYIB_SECRET || !TOYYIB_CATEGORY || !RETURN_URL || !CALLBACK_URL) {
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({
        ok: false,
        step: 'env',
        message: 'Missing environment variables (TOYYIB_SECRET / TOYYIB_CATEGORY / RETURN_URL / CALLBACK_URL)',
      }),
    };
  }

  // Baca input dari client
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    body = {};
  }
  const { coupon = '', email = '', phone = '', name = '' } = body;

  // Harga dalam SEN (ToyyibPay perlukan sen, bukannya RM)
  const BASE = 14900; // RM149.00 -> 14900 sen
  const amount =
    String(coupon).toUpperCase() === 'TES20'
      ? Math.round(BASE * 0.8) // 20% diskaun
      : BASE;

  // Bina form-urlencoded
  const form = new URLSearchParams({
    userSecretKey: TOYYIB_SECRET,
    categoryCode: TOYYIB_CATEGORY,
    billName: 'QuoXpress Standard (Tahunan)',
    billDescription:
      String(coupon).toUpperCase() === 'TES20'
        ? 'Standard (20% Testimoni)'
        : 'Standard (Tahunan)',
    billAmount: String(amount),
    billReturnUrl: RETURN_URL,
    billCallbackUrl: CALLBACK_URL,
    billTo: name || '',
    billEmail: email || '',
    billPhone: phone || '',
    billPayorInfo: '1',
    billExternalReferenceNo: `QXSTD-${Date.now()}`,
  });

  // Panggil ToyyibPay
  let resp;
  try {
    resp = await fetch('https://toyyibpay.com/index.php/api/createBill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
  } catch (err) {
    return {
      statusCode: 502,
      headers: cors(),
      body: JSON.stringify({ ok: false, step: 'fetch', message: err.message }),
    };
  }

  // ToyyibPay kadang hantar array JSON, kadang text string; cuba parse dua-dua.
  const raw = await resp.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch (_) {
    data = null;
  }

  const billCode = Array.isArray(data) ? data[0]?.BillCode : undefined;

  if (!resp.ok || !billCode) {
    return {
      statusCode: 502,
      headers: cors(),
      body: JSON.stringify({
        ok: false,
        step: 'createBill',
        status: resp.status,
        response: data || raw, // tunjuk apa yang ToyyibPay balas untuk debug
      }),
    };
  }

  const billUrl = `https://toyyibpay.com/${billCode}`;
  return {
    statusCode: 200,
    headers: cors(),
    body: JSON.stringify({ ok: true, billUrl, amount }),
  };
};
