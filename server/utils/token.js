const crypto = require('crypto');

/**
 * Generate a cryptographically signed HMAC-SHA256 Auth Token
 * @param {Object} user - User document or object with _id
 * @returns {string} Base64url encoded token with signature
 */
function generateToken(user) {
    if (!user || (!user._id && !user.id)) return null;
    const userId = (user._id || user.id).toString();
    const payload = JSON.stringify({
        id: userId,
        ts: Date.now()
    });
    const b64 = Buffer.from(payload).toString('base64url');
    const secret = process.env.COOKIE_KEY || 'greenroute-secret-key-2025';
    const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
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
    const secret = process.env.COOKIE_KEY || 'greenroute-secret-key-2025';
    const expectedSig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
    
    // Constant time comparison to prevent timing attacks
    if (sig !== expectedSig) return null;
    
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
