const fs = require('fs');

const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');

// let DUMMY_PLACES = [
//     {
//         id: 'p1',
//         title: 'HK IFC',
//         description: 'One of the highest building in the world!',
//         location: {
//             lat: 22.28588,
//             lng: 114.158131
//         },
//         address: '8 Finance St, Central',
//         creator: 'u1'
//     }
// ];

const checkValidation = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new HttpError('Invalid information.', 422);
        return next(error);
    }
};

const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid; // { pid: 'p1' }
    let place;

    try {
        place = await Place.findById(placeId);
    } catch (err) {
        const error = new HttpError('Cannot find a place.', 500);
        return next(error);
    }

    if (!place) {
        const error = new HttpError(
            "Couldn't find a place for the provided place id.",
            404
        );
        return next(error);
    }

    res.json({ place: place.toObject({ getters: true }) }); // => { place } => { place: place }
};

const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    let userWithPlaces;

    try {
        userWithPlaces = await Place.find({ creator: userId });
        // Alternative
        userWithPlaces = await User.findById(userId).populate('places');
    } catch (err) {
        const error = new HttpError('Fetching places failed.', 500);
        return next(error);
    }

    // Alternative
    // if (!places || places.length === 0) {
    if (!userWithPlaces || userWithPlaces.places.length === 0) {
        const error = new HttpError(
            "Couldn't find a place for the provided user id.",
            404
        );
        return next(error);
    }

    // Alternative
    res.json({
        places: userWithPlaces.places.map((place) => place.toObject({ getters: true }))
    });
    // res.json({ places: places.map(place => place.toObject({ getters: true })) });
};

// Ex. Postman as a temporary server
const createPlace = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Invalid information.', 422));
    }

    const { title, description, address } = req.body;

    let coordinates;
    try {
        coordinates = await getCoordsForAddress(address);
        console.log(coordinates);
    } catch (error) {
        return next(error);
    }

    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image: req.file.path,
        creator: req.userData.userId
    });

    let user;

    try {
        user = await User.findById(req.userData.userId);
    } catch (err) {
        const error = new HttpError('Creating place failed.', 500);
        return next(error);
    }

    if (!user) {
        const error = new HttpError('Cannot find user for provided id.', 404);
        return next(error);
    }

    try {
        // await createdPlace.save();
        const session = await mongoose.startSession();
        session.startTransaction();
        await createdPlace.save({ session: session });
        user.places.push(createdPlace);
        await user.save({ session: session });
        await session.commitTransaction();
    } catch (err) {
        const error = new HttpError('Creating place failed.', 500);
        return next(error);
    }

    res.status(201).json({ place: createPlace });
};

const updatePlace = async (req, res, next) => {
    checkValidation(req);

    const { title, description } = req.body;
    const pid = req.params.pid;
    let place;

    try {
        place = await Place.findById(pid);
    } catch (err) {
        const error = new HttpError('Cannot update data.', 500);
        return next(error);
    }

    if(place.creator.toString() !== req.userData.userId) {
        const error = new HttpError('You are not allowed to edit.', 401);
        return next(error);
    }

    place.title = title;
    place.description = description;

    try {
        await place.save();
    } catch (err) {
        const error = new HttpError('Something went wrong.', 500);
        return next(error);
    }

    res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
    const pid = req.params.pid;
    let place;

    try {
        place = await Place.findById(pid).populate('creator');
    } catch (err) {
        const error = new HttpError('Something went wrong.', 500);
        return next(error);
    }

    
    if(place.creator.id !== req.userData.userId) {
        const error = new HttpError('You are not allowed to delete.', 401);
        return next(error);
    }

    const imagePath = place.image;

    try {
        const session = await mongoose.startSession();
        session.startTransaction();
        await place.remove({ session: session });
        place.creator.places.pull(place);
        await place.creator.save({ session: session });
        await session.commitTransaction();
    } catch (err) {
        const error = new HttpError(
            'Something went wrong. Cannot delete the place.',
            500
        );
        return next(error);
    }

    fs.unlink(imagePath, (err) => {
        console.log(err);
    });

    res.status(200).json({ message: 'Deleted place.' });
};

module.exports = {
    getPlaceById: getPlaceById,
    getPlacesByUserId: getPlacesByUserId,
    createPlace: createPlace,
    updatePlace: updatePlace,
    deletedPlace: deletePlace
};
