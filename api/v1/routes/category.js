import express from 'express';
import { Category } from '../../../server/model/category';
import { validateCate } from '../../../server/validations/category';
import adminAuth from '../utils/admin';
import tokenAuth from '../utils/auth';
import loginAuth from '../utils/isLogin';
import ifLogin from '../utils/ifLogin';
import { authId } from '../utils/validateId';

const router = express.Router();

//CREATE CATEGORY
router.post('/', [ tokenAuth, adminAuth ], async (req, res) => {
	//user should be logged in
	//user must be an admin,
	//valdation of category, return 400 if error
	const { error } = validateCate(req.body);
	if (error) return res.status(404).send({ Error: 404, message: 'Invalid title format' });

	//if duplication error return 400(dulicate error)
	let duplicate = await Category.findOne({ title: req.body.title });
	if (duplicate) return res.status(400).send({ Error: 400, message: `Cannot create duplicate category of ${req.body.title}` });
	//create category 201
	let category = new Category({
		title : req.body.title,
	});
	await category.save();
	res.status(201).send(category);
});

//GET ALL CATEGORIES
router.get('/', async (req, res) => {
	let data = await Category.find({}); //get all the available categories
	res.status(200).send(data);
});

//GET CATEGORY BY ID
router.get('/:id', [ authId ], async (req, res) => {
	//authId validates Id...
	let category = await Category.findOne({ _id: req.params.id }); //get category from db
	if (!category) return res.status(404).send({ Error: 404, message: 'Not found' }); //return 404 if not found
	res.status(200).send(category);
});
//PUT CATEGORY
router.put('/:id', [ tokenAuth, adminAuth, authId ], async (req, res) => {

	let newCategory = await Category.findByIdAndUpdate(
		req.params.id,
		{
			title : req.body.title,
		},
		{ new: true },
  );
  if (!newCategory) return res.status(404).send({ Error: 404, message: 'Not found' })
	res.status(200).send(newCategory);
});

//DELETE CATEGORY
router.delete('/:id', [ tokenAuth, adminAuth, authId ], async (req, res) => {

	let deletedCategory = await Category.findOneAndRemove(
    {_id: req.params.id}
  );
	res.status(200).send({success: 200, message: 'Category deleted successfully'});
});



module.exports = router;
