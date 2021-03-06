import express from 'express';
import _ from 'lodash';
import bcrypt from 'bcrypt';
import faker from 'faker';
import mongoose from 'mongoose'

const router = express.Router();
import { User } from '../server/model/user';
import { Role } from '../server/model/role';
import { Document } from '../server/model/document';
import {Category} from '../server/model/category'
//SEEDS USERS' DATA TO DATABASE
router.post('/users', async (req, res) => {
	await User.deleteMany({});
	let adminRole = await Role.findOne({ title: 'admin' });
	let regularRole = await Role.findOne({ title: 'regular' });
	let adminSeed = req.query.adminSeed || 4;
	let regularSeed = req.query.regularSeed || 16;
	const salt = await bcrypt.genSalt(10);
	let adminPassword = await bcrypt.hash('adminPassword', salt);
	let regularPassword = await bcrypt.hash('regularPassword', salt);
	// console.log('start')
	for (let i = 0; i < adminSeed; i++) {
		await User.create({
			username : faker.internet.userName(),
			name     : {
				firstName : faker.name.firstName(),
				lastName  : faker.name.lastName(),
			},
			email    : faker.internet.email(),
			password : adminPassword,
      roleId   : adminRole._id,
      avatar: faker.lorem.sentence(4,8)
		});
	}
	for (let i = 0; i < regularSeed; i++) {
		await User.create({
			username : faker.internet.userName(),
			name     : {
				firstName : faker.name.firstName(),
				lastName  : faker.name.lastName(),
			},
			email    : faker.internet.email(),
			password : regularPassword,
      roleId   : regularRole._id,
      avatar: faker.lorem.sentence(6,8)
		});
  }
  let admin = await User.find({roleId: adminRole._id})
	res.status(201).send(_.pick(admin[0], [ '_id', 'username', 'email' ]));
});


//SEEDS DOCUMENTS' DATA TO DATABASE

router.post('/documents', async (req, res) => {
	await Document.deleteMany({});
  let users = await User.find({});
  let category = await Category.find({})
	let publicAccess = req.query.public || 20;
	let privateAccess = req.query.private || 12;
  let role = req.query.role || 8;
  let docAccess = ['private', 'public','role']

  //creating public
  let i = 0
  while(i < publicAccess){
    let categoryIndex = Math.floor(Math.random() * category.length)
    let userIndex = Math.floor(Math.random() * users.length)
    let titleText = Math.floor(Math.random() * 5) + 1
    let paragraghCount = Math.floor(Math.random() * 3) + 1
    let accessIndex = Math.floor(Math.random() * docAccess.length)
    let date = faker.date.between('9-9-2018', '5-7-2019')
    //console.log(faker.date.between('9-9-2018', '5-7-2019'))
    //console.log(faker.lorem.paragraphs(paragraghCount,'./n'))
    await Document.create({
      title: faker.lorem.sentence(titleText,5),
      content: faker.lorem.paragraphs(paragraghCount,'.\n'),
      creatorId: users[userIndex]._id,
      access: 'public',
      categoryId: category[categoryIndex]._id,
      createdAt: date,
      publishDate: date
    })
    i++
  }
  //creating private
  i = 0
  while(i < privateAccess){
    let categoryIndex = Math.floor(Math.random() * category.length)
    let userIndex = Math.floor(Math.random() * users.length)
    let titleText = Math.floor(Math.random() * 5) + 1
    let paragraghCount = Math.floor(Math.random() * 3) + 1
    let accessIndex = Math.floor(Math.random() * docAccess.length)
    let date = faker.date.between('9-9-2018', '5-7-2019')
    //console.log(faker.date.between('9-9-2018', '5-7-2019'))
    //console.log(faker.lorem.paragraphs(paragraghCount,'./n'))
    await Document.create({
      title: faker.lorem.sentence(titleText,8),
      content: faker.lorem.paragraphs(paragraghCount,'.\n'),
      creatorId: users[userIndex]._id,
      access: 'private',
      categoryId: category[categoryIndex]._id,
      createdAt: date,
      publishDate: date
    })
    i++
  }
  //creating role based documents
  i = 0
  while(i < role){
    let categoryIndex = Math.floor(Math.random() * category.length)
    let userIndex = Math.floor(Math.random() * users.length)
    let titleText = Math.floor(Math.random() * 5) + 1
    let paragraghCount = Math.floor(Math.random() * 3) + 1
    let accessIndex = Math.floor(Math.random() * docAccess.length)
    let date = faker.date.between('9-9-2018', '5-7-2019')
    await Document.create({
      title: faker.lorem.sentence(titleText,8),
      content: faker.lorem.paragraphs(paragraghCount,'.\n'),
      creatorId: users[userIndex]._id,
      access: 'role',
      categoryId: category[categoryIndex]._id,
      createdAt: date,
      publishDate: date,
      role: users[userIndex].roleId
    })
    i++
  }


	res.status(201).send({Error: null, message: 'Documents Created'});
});
//should recieve specifications by query

module.exports = router;
