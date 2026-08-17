const crypto = require('crypto');

const TOKEN_SECRET = process.env.TOKEN_SECRET;
if (!TOKEN_SECRET || TOKEN_SECRET.length < 32) {
    throw new Error('TOKEN_SECRET environment variable is not set or is shorter than 32 characters.');
}

function generateToken(user) {
    if (!user || (!user._id && !user.id)) return null;
    const userId = (user._id || user.id).toString();
    const payload = JSON.stringify({
        id: userId,
        ts: Date.now()
    });
    const b64 = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64).digest('base64url');
    return `${b64}.${sig}`;
}

/**
 * Verify and decode an HMAC-SHA256 Auth Token
 * @param {string} token - The token string to verify
 * @returns {Object|null} Decoded payload { id, ts } or null if invalid/expired
 */
function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.trim().split('.');
    if (parts.length !== 2) return null;

    const [b64, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64).digest('base64url');

    // Constant-time comparison to prevent timing attacks.
    // Both buffers must be the same byte length for timingSafeEqual.
    const sigBuf      = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
    }

    try {
        const jsonStr = Buffer.from(b64, 'base64url').toString('utf8');
        const data = JSON.parse(jsonStr);
        if (!data || !data.id) return null;

        // 30 days token expiration
        const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - data.ts > MAX_AGE) {
            return null;
        }

        return data;
    } catch {
        return null;
    }
}

module.exports = {
    generateToken,
    verifyToken
};
