var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var addsrc = require('gulp-add-src');

gulp.task('default', function () {
    // place code for your default task here
    return gulp.src(['js/lib/pixi.js', 'js/lib/gl-sprites.js', 'js/**/main.js', 'js/**/*.js'])
        // check for mistakes
        /*.pipe(jshint({
            newcap: false
        }))
        .pipe(jshint.reporter())*/
        // add bower components
        .pipe(addsrc.prepend('bower_components/requirejs/require.js'))
        // output rice.js
        .pipe(concat('rice.js'))
        .pipe(gulp.dest('build'))
        // output rice.min.js
        .pipe(uglify())
        .pipe(rename('rice.min.js'))
        .pipe(gulp.dest('build'));
});

gulp.task('check', function () {
    // place code for your default task here
    return gulp.src(['js/**/main.js', 'js/**/*.js'])
        .pipe(jshint({
            newcap: false
        }))
        .pipe(jshint.reporter());
});


// task
gulp.task('watch', function () {
    gulp.watch(['js/**/*.js'], ['default']);
});