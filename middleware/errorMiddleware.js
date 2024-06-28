const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
}

const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    res.status(error.code || 500).json({ message: error.message || "An unknown error" });
}

module.exports = {
    notFound,
    errorHandler
}
