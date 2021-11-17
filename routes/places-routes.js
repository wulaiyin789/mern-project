const express = require('express');
const { check } = require('express-validator');

const placesControllers = require('../controllers/places-controller');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router({ mergeParams: true });

router.get('/:pid', placesControllers.getPlaceById);

router.get('/user/:uid', placesControllers.getPlacesByUserId);

router.use(checkAuth);

router.post(
    '/',
    fileUpload.single('image'),
    [
        check('title').notEmpty(),
        check('description').isLength({ min: 5 }),
        check('address').notEmpty()
    ],
    placesControllers.createPlace
);

router.patch(
    '/:pid',

    [
        check('title').notEmpty(),
        check('description').isLength({ min: 5 }),
    ],
    placesControllers.updatePlace
);

router.delete('/:pid', placesControllers.deletedPlace);

module.exports = router;
