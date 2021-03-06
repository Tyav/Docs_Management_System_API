const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function(req, res, next) {
	const token = req.header('x-auth-token');
	if (!token) return res.status(401).send({ token, result:{Error: 401, message: 'Access denied, Log in' }});

	try {
		const decoded = jwt.verify(token, config.get('jwtPrivateKey'));
		req.user = decoded;
		next();
	} catch (ex) {
		return res.status(400).send({ token: null, result:{Error: 400, message: 'Invalid token' }});
	}
};
