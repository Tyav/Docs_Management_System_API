import express from 'express';
import _ from 'lodash';
import bcrypt from 'bcrypt';

const router = express.Router();
import { User } from '../../../server/model/user';
import { Role } from '../../../server/model/role';
import { validateCreateUser, validateLogin, validateEditUser } from '../../../server/validations/user';
import { authId as idAuth } from '../utils/validateId';
import adminAuth from '../utils/admin';
import tokenAuth from '../utils/auth';
import loginAuth from '../utils/isLogin';
import ifLogin from '../utils/ifLogin';

//GETS
//ALL USERS [GET /users/]
router.get('/', [ tokenAuth, adminAuth ], async (req, res) => {
	const token = req.header('x-auth-token');

	//do some authorization if user is admin
	let deleted = req.query.deleteduser || false;
	const users = await User.find({ deleted: deleted }).select('_id username email name createdAt roleId modifiedAt verified avatar').populate({path: 'roleId', select:'_id title'});
	res.status(200).send({token, result:users});
});

//SINGLE USER [GET /users/<id>]
router.get('/:id', [ tokenAuth, idAuth ], async (req, res) => {
	const token = req.header('x-auth-token'); //get token
	//get user from database
	const user = await User.findById(req.params.id);
	//return a 404 if user is deleted or not in database
	if (!user || user.deleted) return res.status(404).send({token, Error: 404, message: 'User not found' });
	res.status(200).send({token, result:_.pick(user, [ '_id', 'username', 'email', 'name', 'createdAt', 'roleId', 'modifiedAt', 'verified', 'avatar' ])});
});

//CREATE USER [POST /users/]
router.post('/', async (req, res) => {
	//validate body content valid for usser creation
	const { error } = validateCreateUser(req.body);
	if (error) return res.status(400).send({ Error: 400, message: error.details[0].message });
	//validate roleId has already be created else reject user creation
	let role = null;
	if (req.body.roleId) {
		role = await Role.findById(req.body.roleId).select('_id title');
		if (!role) return res.status(400).send({ Error: 400, message: 'Invalid Role Id' });
	} else {
		role = await Role.findOne({ title: 'regular' }).select('_id title');
	}
	let roleId = role._id;
	//check if email has been taken
	let checkEmail = await User.findOne({ email: req.body.email });
	//frontEnd engineer checks for this to redirect to forgot or login page.
	if (checkEmail) return res.status(400).send({ Error: 400, message: 'Email is already in use' });
	//check if username has been taken
	let checkUsername = await User.findOne({ username: req.body.username });
	if (checkUsername) return res.status(400).send({ Error: 400, message: 'Username is taken' });
	let { username, name, email, password, avatar} = req.body;
	//CREATE USER
	const user = new User({ username, name, email, password, roleId, avatar });
	// user = new User(_.pick(req.body, ['name', 'email', 'password']));
	//encrypt password
	const salt = await bcrypt.genSalt(10);
	user.password = await bcrypt.hash(user.password, salt);
	await user.save();
	//generate a token for user.
	//first parameter for isLogin and
	//second for isAdmin which will be set to true if role.publicWrite is set to true
	const token = user.generateAuthToken(true, role.publicWrite);
	let userOut = _.pick(user, [ '_id', 'username', 'email', 'name', 'createdAt', 'modifiedAt', 'verified', 'avatar' ])
	userOut.roleId = { _id: role._id, title: role.title }
	//set the key 'x-auth-token' with generated token in the header
	res.status(201).send({token, result:userOut});
});

//LOGIN USER [POST /users/login]
router.post('/login', [ ifLogin ], async (req, res) => {
	//check if user is not logged in [ifLogin]
	//validate the login input :400
	const { error } = validateLogin(req.body);
	if (error) return res.status(400).send({ Error: 400, message: 'Bad Request (Invalid Input)' });
	//check if user exist by email :400
	const user = await User.findOne({ username: req.body.username, deleted: false })
		.select('_id username email name createdAt roleId modifiedAt verified avatar password')
		.populate({path: 'roleId', select:'_id title publicWrite'});
	if (!user) return res.status(400).send({ Error: 400, message: 'Wrong Username or Password' });
	//check for password :400
	//perform bcrypt check and if you need to change the salt,
	//please do so too in the signup of users

	const password = await bcrypt.compare(req.body.password, user.password);
	if (!password) return res.status(400).send({ Error: 400, message: 'Wrong Username or Password' });
	//get role of user
	const role = await Role.findOne({ _id: user.roleId._id });
	//create a token for user
	//user true as first parameter to make login valid, and
	//role.publicWrite as second parameter which decides if user is admin
	const token = user.generateAuthToken(true, user.roleId.publicWrite);
	
	//keep the user logged in = 200
	res.status(200).header('x-auth-token', token).send({token, result:_.pick(user, [ '_id', 'username', 'email', 'roleId._id','roleId.title', 'name', 'createdAt', 'modifiedAt', 'verified', 'avatar' ])});
});

//LOGOUT USER [POST /users/logout]
router.post('/logout', [ tokenAuth ], (req, res) => {
	//check if user is logged in, send a 401 if not logged in
	if (!req.user.isLogged) return res.status(401).send({ Error: 401, message: 'Already logged out' });

	res.status(200).send({ Success: 200, message: 'Successfully logged out' });
});

// EDIT USER [PUT /users/<id>]
//[idAuth,tokenAuth, loginAuth],
router.put('/:id', [tokenAuth , idAuth ], async (req, res) => {
	const token = req.header('x-auth-token'); //get token
	//compared id in token with id from parameter. if not same return 403
	if (req.params.id !== req.user._id) return res.status(403).send({ token,Error: 403, message: 'Forbidden' });
	const { error } = validateEditUser(req.body);
	if (error) return res.status(400).send({ token, Error: 400, message: error.details[0].message });
	const user = await User.findById(req.params.id);

	//perform salt and bcrypt
	const passwordCheck = await bcrypt.compare(req.body.password, user.password);
	if (!passwordCheck) return res.status(400).send({ token,Error: 400, message: 'Wrong Password' });

	//SET NEW VALUES TO UNDEFINED
	let newPassword;
	let newFirstname;
	let newLastName;
	if (req.body.name) {
		newFirstname = req.body.name.firstName;
		newLastName = req.body.name.lastName;
	}
	//if new password, hash it
	if (req.body.newPassword) {
		const salt = await bcrypt.genSalt(10);
		newPassword = await bcrypt.hash(req.body.newPassword, salt);
	}

	const firstName = newFirstname || user.name.firstName;
	const lastName = newLastName || user.name.lastName;
	const password = newPassword || user.password;
	const avatar = req.body.avatar || user.avatar; //if new avatar

	const updatedUser = await User.findByIdAndUpdate(
		req.params.id,
		{
			name       : { firstName, lastName },
			password   : password,
			modifiedAt : Date.now(),
			avatar,
		},
		{ new: true },
	)
	.select('_id username email name createdAt roleId modifiedAt verified avatar')
	.populate({path: 'roleId', select:'_id title'});
	res.status(200).send({token, result:_.pick(updatedUser, [ '_id', 'username', 'email', 'roleId', 'name', 'createdAt', 'modifiedAt', 'verified', 'avatar'])});
}); 

//DELETE USER [DELETE /users/<id>]
router.delete('/:id', [ tokenAuth, loginAuth ], async (req, res) => {
	const token = req.header('x-auth-token'); //get token
	//401 if not logged in [done in token and login auth]
	if (req.user.isAdmin) {
		//delete user if user has performed a soft delete
		await User.findOneAndRemove({ _id: req.params.id, deleted: true });
		const token = req.header('x-auth-token');
		return res.status(200).send({ token, Success: 200, message: '4User deleted' });
	}
	//403 if logged but not the owner
	if (req.params.id !== req.user._id) return res.status(403).send({ token,Error: 403, message: 'Forbidden' });

	//get user and edit deleted, username, email
	let deletedUser = await User.findOne({ _id: req.params.id, deleted: false });
	if (!deletedUser) {
		return res.status(404).send({token, Error: 404, message: 'User not found' });
	}
	//chenge user data
	deletedUser.deleted = true;
	deletedUser.email = `${deletedUser.email}-${req.params.id}`;
	deletedUser.username = `${deletedUser.username}-${req.params.id}`;

	//console.log(deletedUser)
	await deletedUser.save();

	//200 should delete user
	res.status(200).send({ token,Success: 200, message: 'User deleted' });
});

module.exports = router;

// module.exports = function(req, res, next) {
// 	if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).send('Invalid ID.');

// 	next();
// };
