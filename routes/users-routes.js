const express = require('express');
const { check } = require('express-validator');

const usersControllers = require('../controllers/users-controller');
const fileUpload = require('../middleware/file-upload');

const router = express.Router({ mergeParams: true });

router.get('/', usersControllers.getUsers);

router.post(
    '/signup',
    fileUpload.single('image'),
    [
        check('name').notEmpty(), 
        check('email').notEmpty(), 
        check('password').isLength({ min: 6 })
    ],
    usersControllers.signup
);

router.post(
    '/login',
    [
        check('email').notEmpty(), 
        check('password').isLength({ min: 6 })
    ],
    usersControllers.login
);

module.exports = router;
