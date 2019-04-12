module.exports = function(req, res, next) {
	const token = req.header('x-auth-token');
	if (token) return res.status(401).send({ Error: 401, message: 'Already Log in' });
	next();
};
