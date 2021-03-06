var gulp = require("gulp");
var gutil = require("gulp-util");
var gulpif = require("gulp-if");
var streamify = require("gulp-streamify");
var cssmin = require("gulp-cssmin");
var concat = require("gulp-concat");
var source = require("vinyl-source-stream");
var babelify = require("babelify");
var browserify = require("browserify");
var watchify = require("watchify");
var uglify = require("gulp-uglify");

var production = process.env.NODE_ENV === "production";

const dependencies = [
    "alt",
    "react",
    "react-dom",
    "react-router",
    "underscore"
];

const compressOptions = {
    unused: true,
    booleans: true,
    loops: true,
    properties: true,
    comparisons: true,
    conditionals: true,
    dead_code: true,
    drop_debugger: true
};

/*
 |--------------------------------------------------------------------------
 | Combine all JS libraries into a single file for fewer HTTP requests.
 |--------------------------------------------------------------------------
 */
gulp.task("vendor", function() {
    return gulp
        .src([])
        .pipe(concat("vendor.js"))
        .pipe(
            gulpif(
                production,
                uglify({
                    mangle: true,
                    compress: compressOptions
                })
            )
        )
        .pipe(gulp.dest("public/js"));
});

/*
 |--------------------------------------------------------------------------
 | Compile third-party dependencies separately for faster performance.
 |--------------------------------------------------------------------------
 */
gulp.task("browserify-vendor", function() {
    return browserify()
        .require(dependencies)
        .bundle()
        .pipe(source("vendor.bundle.js"))
        .pipe(
            gulpif(
                production,
                streamify(
                    uglify({
                        mangle: true,
                        compress: compressOptions
                    })
                )
            )
        )
        .pipe(gulp.dest("public/js"));
});

/*
 |--------------------------------------------------------------------------
 | Compile only project files, excluding all third-party dependencies.
 |--------------------------------------------------------------------------
 */
gulp.task("browserify", ["browserify-vendor"], function() {
    return browserify("app/main.js")
        .external(dependencies)
        .transform(babelify)
        .bundle()
        .pipe(source("bundle.js"))
        .pipe(
            gulpif(
                production,
                streamify(
                    uglify({
                        mangle: true,
                        compress: compressOptions
                    })
                )
            )
        )
        .pipe(gulp.dest("public/js"));
});

/*
 |--------------------------------------------------------------------------
 | Same as browserify task, but will also watch for changes and re-compile.
 |--------------------------------------------------------------------------
 */
gulp.task("browserify-watch", ["browserify-vendor"], function() {
    var bundler = watchify(browserify("app/main.js", watchify.args));
    bundler.external(dependencies);
    bundler.transform(babelify);
    bundler.on("update", rebundle);
    return rebundle();

    function rebundle() {
        var start = Date.now();
        return bundler
            .bundle()
            .on("error", function(err) {
                gutil.log(gutil.colors.red(err.toString()));
            })
            .on("end", function() {
                gutil.log(
                    gutil.colors.green(
                        "Finished rebundling in",
                        Date.now() - start + "ms."
                    )
                );
            })
            .pipe(source("bundle.js"))
            .pipe(
                gulpif(
                    production,
                    streamify(
                        uglify({
                            mangle: true,
                            compress: compressOptions
                        })
                    )
                )
            )
            .pipe(gulp.dest("public/js/"));
    }
});

gulp.task("default", ["vendor", "browserify-watch"]);
gulp.task("build", ["vendor", "browserify"]);
