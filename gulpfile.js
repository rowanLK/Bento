var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var addsrc = require('gulp-add-src');
var exec = require('gulp-exec');
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
    });
});

gulp.task('default', ['webgl'], function () {
    // place code for your default task here
    return gulp.src([
            'js/lib/audia.js',
            'js/lib/fpsmeter.js',
            'js/**/main.js',
            'js/**/*.js'
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

gulp.task('doc', function () {
    gulp.src('./js/**/*.js')
        .pipe(exec('jsdoc -r -c conf.json ./readme.md -d documentation -t ./node_modules/minami'))
});

gulp.task('docwatch', function () {
    gulp.watch(['js/**/*.js', './readme.md'], ['doc']);
});