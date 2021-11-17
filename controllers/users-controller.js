const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');

// const DUMMY_USERS = [
//     {
//         id: 'u1',
//         name: 'Peter Wu',
//         email: 'test@test.com',
//         password: 'test123'
//     }
// ];

const checkValidation = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new HttpError('Invalid information.', 422);
        return next(error);
    }
};

const getUsers = async (req, res, next) => {
    let users;
    try {
        users = await User.find({}, '-password');
    } catch (err) {
        const error = new HttpError('Fetching users failed.', 500);
        next(error);
    }

    res.json({ users: users.map((u) => u.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
    checkValidation(req);

    const { name, email, password } = req.body;
    let hasUser;

    try {
        hasUser = await User.findOne({ email: email });
    } catch (err) {
        const error = new HttpError('Signing up failed.', 500);
        return next(error);
    }

    if (hasUser) {
        const error = new HttpError('User exists already.', 422);
        return next(error);
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
        const error = new HttpError('Could not create user, try again.', 500);
        next(error);
    }

    const createdUser = new User({
        name,
        email,
        password: hashedPassword,
        image: req.file.path,
        places: []
    });

    try {
        await createdUser.save();
    } catch (err) {
        const error = new HttpError('Signing up failed.', 500);
        return next(error);
    }

    let token;
    try {
        token = jwt.sign(
            { userId: createdUser.id, email: createdUser.email },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );
    } catch (err) {
        const error = new HttpError('Signing up failed.', 500);
        return next(error);
    }

    res.status(201).json({
        userId: createdUser.id,
        email: createdUser.email,
        token: token
    });
    // res.status(201).json({ user: createdUser.toObject({ getters: true }) });
};

const login = async (req, res, next) => {
    checkValidation(req);

    const { email, password } = req.body;

    let existingUser;

    try {
        existingUser = await User.findOne({ email: email });
    } catch (err) {
        const error = new HttpError('Logging in failed.', 500);
        return next(error);
    }

    if (!existingUser) {
        const error = new HttpError('Wrong email or password.', 403);
        return next(error);
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    } catch (err) {
        const error = new HttpError('Could not login, email or password is wrong.', 500);
        next(error);
    }

    if (!isValidPassword) {
        const error = new HttpError('Invalid email or password, please try again.', 500);
        return next(error);
    }

    let token;
    try {
        token = jwt.sign(
            { userId: existingUser.id, email: existingUser.email },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );
    } catch (err) {
        const error = new HttpError('Logging in failed.', 500);
        return next(error);
    }

    res.json({ userId: existingUser.id, email: existingUser.email, token: token });
    // res.json({ message: 'Logged in!', user: existingUser.toObject({ getters: true }) });
};

module.exports = {
    getUsers: getUsers,
    signup: signup,
    login: login
};
