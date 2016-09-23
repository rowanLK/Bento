var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var addsrc = require('gulp-add-src');
// var exec = require('gulp-exec');
var exec = require('child_process').exec;
var fs = require('fs');
var webpack = require("webpack");

gulp.task('webgl', function () {
    fs.writeFileSync(
        'build/bento-webgl.js',
        'window.GlSprites = {};\nGlSprites.SpriteRenderer = require("gl-sprites");\nGlSprites.createTexture2D = require("gl-texture2d");'
    );

    webpack({
        entry: './build/bento-webgl.js',
        output: {
            path: './build',
            filename: 'bento-webgl.js'
        },
    }, function (err, stats) {
        if (err) {
            console.log(err);
        }
        gulp.src([
                'build/bento-webgl.js'
            ])
            .pipe(uglify())
            .pipe(rename('bento-webgl.min.js'))
            .pipe(gulp.dest('build'));
    });
});

gulp.task('default', [], function () {
    // place code for your default task here
    return gulp.src([
            'js/lib/fpsmeter.js',
            'js/**/main.js',
            'js/lib/lzstring.js',
            'js/lib/audia.js',
            'js/**/*.js',
            '!js/lib/bento-require.js'
        ])
        // check for mistakes
        /*.pipe(jshint({
            newcap: false
        }))
        .pipe(jshint.reporter())*/
        // add requirejs
        .pipe(addsrc.prepend('node_modules/requirejs/require.js'))
        // output bento.js
        .pipe(concat('bento.js'))
        .pipe(gulp.dest('build'))
        // output bento.min.js
        .pipe(uglify())
        .pipe(rename('bento.min.js'))
        .pipe(gulp.dest('build'));
});

gulp.task('amdless', [], function () {
    // place code for your default task here
    return gulp.src([
            'js/lib/fpsmeter.js',
            'js/**/main.js',
            'js/lib/lzstring.js',
            'js/lib/audia.js',
            'js/**/*.js',
            '!js/lib/bento-require.js'
        ])
        // add require
        .pipe(addsrc.prepend('js/lib/bento-require.js'))
        // output bento.js
        .pipe(concat('bento-amdless.js'))
        .pipe(gulp.dest('build'));
});

gulp.task('check', function () {
    // place code for your default task here
    return gulp.src(['js/**/main.js', 'js/**/*.js', '!js/lib/*.js'])
        .pipe(jshint({
            newcap: false
        }))
        .pipe(jshint.reporter());
});

gulp.task('watch', function () {
    gulp.watch(['js/**/*.js'], ['default']);
});

gulp.task('doc', function (cb) {
    exec('jsdoc --verbose -r -c conf.json ./readme.md -d docs -t ./node_modules/minami', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

gulp.task('docwatch', function () {
    gulp.watch(['js/**/*.js', './readme.md'], ['doc']);
});