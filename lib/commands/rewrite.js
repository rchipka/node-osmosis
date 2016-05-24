module.exports.rewrite = function (context, data, next, done) {
    console.error('DEPRECATED. Use .find(selector).get(callback) instead.');
    next(context, data);
    done();
};
