import express from 'express';
import { Category } from '../../../server/model/category';
import { validateCate } from '../../../server/validations/category';
import adminAuth from '../utils/admin';
import tokenAuth from '../utils/auth';
import loginAuth from '../utils/isLogin';
import ifLogin from '../utils/ifLogin';
import { authId } from '../utils/validateId';

const router = express.Router();

router.post('/', [ tokenAuth, adminAuth ], async (req, res) => {
	//user should be logged in
	//user must be an admin,
	//valdation of category, return 400 if error
	const { error } = validateCate(req.body);
	if (error) return res.status(404).send({ Error: 404, message: 'Invalid title format' });

	//if duplication error return 400(dulicate error)
  //create category 201
  let category = new Category({
    title: req.body.title
  })
  await category.save()
	res.status(201).send(category);
});

//CREATE CATEGORY
//GET ALL CATEGORIES
//GET CATEGORY BY ID
//DELETE CATEGORY

module.exports = router;
