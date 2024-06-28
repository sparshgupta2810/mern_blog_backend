const jwt = require("jsonwebtoken");
const HttpError = require('../models/errorModels');

const authMiddleware = async (req, res, next) => {
    const authorization = req.headers.authorization;

    if (authorization && authorization.startsWith("Bearer")) {
        const token = authorization.split(' ')[1];
        jwt.verify(token, process.env.PRIVATE_KEY, (err, info) => {
            if (err) {
                return next(new HttpError("Unauthorized. Invalid token", 401));
            }

            req.user = info;
            next();
        });
    } else {
        return next(new HttpError("Unauthorized. No token", 401));
    }
};

module.exports = authMiddleware;
