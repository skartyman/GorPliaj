const crypto = require('crypto');

const HUTKO_API_BASE = 'https://pay.hutko.org';

function getConfig() {
  const merchantId = process.env.FONDY_MERCHANT_ID || '';
  const secretKey = process.env.FONDY_SECRET_KEY || '';
  return { merchantId, secretKey, isConfigured: !!(merchantId && secretKey) };
}

function generateSignature(params, secretKey) {
  const keys = Object.keys(params).filter((k) => k !== 'signature').sort();
  const parts = [secretKey, ...keys.map((k) => String(params[k] ?? ''))];
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex');
}

function verifySignature(payload, secretKey) {
  if (!payload || !payload.signature) return false;
  const expected = generateSignature(
    { ...payload, signature: undefined },
    secretKey
  );
  return expected === payload.signature;
}

function prepareRequest(params) {
  const { merchantId, secretKey } = getConfig();
  if (!merchantId || !secretKey) {
    throw new Error('Hutko: FONDY_MERCHANT_ID and FONDY_SECRET_KEY must be set');
  }

  const request = {
    ...params,
    merchant_id: merchantId
  };

  request.signature = generateSignature(request, secretKey);
  return request;
}

function parseResponse(response) {
  if (!response || !response.response) {
    return { success: false, error: 'Invalid response from Hutko API' };
  }

  const { response: resp } = response;

  if (resp.response_status !== 'success') {
    return {
      success: false,
      error: resp.error_message || resp.response_status || 'Unknown error',
      errorCode: resp.error_code,
      raw: resp
    };
  }

  return { success: true, data: resp, raw: resp };
}

module.exports = {
  HUTKO_API_BASE,
  getConfig,
  generateSignature,
  verifySignature,
  prepareRequest,
  parseResponse
};
