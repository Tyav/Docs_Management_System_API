import Joi from 'joi';
import obj from 'joi-objectid';
Joi.objectId = obj(Joi);


let validateDoc = (docData) => {
	let schema = Joi.object().keys({
		title: Joi.string().min(1).max(255).required(),
		content: Joi.string().min(1).max(5000).required(),
		creatorId: Joi.objectId(),
		access: Joi.string().valid('private', 'public','role'),
		categoryId: Joi.objectId(),
		createdAt: Joi.date(),
		publishDate: Joi.string(),
		role: Joi.objectId(),
	});
	return Joi.validate(docData, schema);
};


let validateDocEdit = (docData) => {
	let schema = Joi.object().keys({
		title: Joi.string().min(1).max(255),
		content: Joi.string().min(1).max(5000),
		access: Joi.string().valid('private', 'public','role'),
		categoryId: Joi.objectId(),
		role: Joi.objectId(),
	});
	return Joi.validate(docData, schema);
};


export { validateDoc, validateDocEdit };
