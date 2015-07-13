var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var addsrc = require('gulp-add-src');
var jsdoc = require("gulp-jsdoc");
var exec = require('gulp-exec');

gulp.task('default', function () {
    // place code for your default task here
    return gulp.src([
            'js/lib/fpsmeter.js',
            'js/lib/gl-sprites.js',
            'js/**/main.js',
            'js/**/*.js'
        ])
        // check for mistakes
        /*.pipe(jshint({
            newcap: false
        }))
        .pipe(jshint.reporter())*/
        // add bower components
        .pipe(addsrc.prepend('bower_components/requirejs/require.js'))
        .pipe(addsrc.prepend('bower_components/howler/howler.js'))
        // output rice.js
        .pipe(concat('bento.js'))
        .pipe(gulp.dest('build'))
        // output rice.min.js
        .pipe(uglify())
        .pipe(rename('bento.min.js'))
        .pipe(gulp.dest('build'));
});

gulp.task('light', function () {
    // place code for your default task here
    return gulp.src([
            '!js/lib/fpsmeter.js',
            '!js/lib/gl-sprites.js',
            'js/**/main.js',
            'js/**/*.js'
        ])
        // check for mistakes
        /*.pipe(jshint({
            newcap: false
        }))
        .pipe(jshint.reporter())*/
        // add bower components
        .pipe(addsrc.prepend('bower_components/requirejs/require.js'))
        .pipe(addsrc.prepend('bower_components/howler/howler.js'))
        // output rice.js
        .pipe(concat('bento-light.js'))
        .pipe(gulp.dest('build'))
        // output rice.min.js
        .pipe(uglify())
        .pipe(rename('bento-light.min.js'))
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
    // ??
    // gulp.src('js/**/*.js')
    //     .pipe(jsdoc.generator('documentation', {
    //         path: './node_modules/minami',
    //         footer: "Bento game engine",
    //         copyright: "LuckyKat",
    //         navType: "vertical",
    //         theme: "journal",
    //         linenums: true,
    //         collapseSymbols: false,
    //         inverseNav: false
    //     }));

    gulp.src('./**/**')
    .pipe(exec('jsdoc -c conf.json -r ./readme.md -d documentation -t ./node_modules/minami'));
});

gulp.task('docwatch', function () {
    gulp.watch(['js/**/*.js', './readme.md'], ['doc']);
});