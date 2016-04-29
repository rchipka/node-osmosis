module.exports.fail = module.exports.failure =
    function (context, data, next, done) {
        console.log("Fail is deprecated. Please use filter('not()') instead.");
        next(context, data);
        done();
    };
