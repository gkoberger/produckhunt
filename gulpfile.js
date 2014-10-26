var gulp = require('gulp');
var fs = require('fs');

var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var stylus = require('gulp-stylus');
var nib = require('nib');
var s3 = require('gulp-s3');
var imagemin = require('gulp-imagemin');
var bower = require('gulp-bower');
var jade = require('gulp-jade');
var gulpFilter = require('gulp-filter');
var connect = require('gulp-connect');

var paths = {
  js: ['source/js/**/*.js'],
  css: ['source/css/**/*.css', 'source/css/**/*.styl'],
  images: 'source/img/**/*',
  templates: ['source/**/*.jade'],
};

var uglify_filter = gulpFilter('**/*.js', '!**/*.min.js');

// Copy, minify and concat all JS
gulp.task('scripts', function() {
  console.log(paths.js);
  return gulp.src(paths.js)
    .pipe(concat('all.min.js'))
    .pipe(gulp.dest('build/js'));
});

// Copy, minify and concat all css
gulp.task('css', function() {
  return gulp.src(paths.css)
    .pipe(stylus({use: [nib()]}))
    .pipe(concat('all.min.css'))
    .pipe(gulp.dest('build/css'));
});

// Compile Jade templates
gulp.task('templates', function() {
  var YOUR_LOCALS = {};

  gulp.src(paths.templates)
    .pipe(jade({
      locals: YOUR_LOCALS
    }))
    .pipe(gulp.dest('./build/'))
});

// Copy all static images
gulp.task('images', function() {
  return gulp.src(paths.images)
    // Pass in options to the task
    .pipe(gulp.dest('build/img'));
});

// Bower files
gulp.task('bower', function() {
  bower()
    .pipe(gulp.dest('build/lib'));
});

// Rerun the task when a file changes
gulp.task('watch', ['default'], function() {
  gulp.watch(paths.js, ['scripts']);
  gulp.watch(paths.css, ['css']);
  gulp.watch(paths.images, ['images']);
  gulp.watch(paths.templates, ['templates']);
});

gulp.task('serve', ['watch'], function() {
  connect.server({
    root: 'build',
  });
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['templates', 'scripts', 'images', 'css', 'bower']);

gulp.task('sync', ['default'], function() {
  var aws = JSON.parse(fs.readFileSync('./aws.json'));
  gulp.src('build/**').pipe(s3(aws));
});

