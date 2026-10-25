const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function requestGuard(req, res, next) {
  if (MUTATING_METHODS.has(req.method) && req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({ error: 'Cross-site changes are not allowed.' });
  }
  next();
}

module.exports = requestGuard;
