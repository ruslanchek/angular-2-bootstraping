var gulp = require('gulp'),
    watch = require('gulp-watch'),
    stylus = require('gulp-stylus'),
    sourcemaps = require('gulp-sourcemaps'),
    autoprefixer = require('gulp-autoprefixer'),
    jeet = require('jeet'),
    jade = require('gulp-jade'),
    nib = require('nib'),
    livereload = require('gulp-livereload'),
    concat = require('gulp-concat'),
    plumber = require('gulp-plumber'),
    jsonminify = require('gulp-jsonminify'),
    rimraf = require('rimraf'),
    svgSprite = require('gulp-svg-sprite'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    stripDebug = require('gulp-strip-debug'),
    uglify = require('gulp-uglify'),
    minifyCss = require('gulp-minify-css'),
    ts = require('gulp-typescript'),
    fs = require('fs');

var stylDest = './styles',
    cssDest = './public/css';

function startExpress() {
    var express = require('express'),
        app = express();

    app.use(express.static(__dirname + '/public'));

    app.listen(3000);
}

gulp.task('default', function() {
    startExpress();
});

gulp.task('compress', function() {
    return gulp.src('./public/js/app.js')
        .pipe(plumber())
        .pipe(stripDebug())
        .pipe(uglify())
        .pipe(gulp.dest('./public/js'));
});

gulp.task('minify-css', function() {
    return gulp.src('public/css/**/*.css')
        .pipe(minifyCss())
        .pipe(gulp.dest('public/css'));
});

gulp.task('stylus', function() {
    gulp.src(stylDest + '/main.styl')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(stylus({
            use: [
                jeet(),
                nib()
            ]
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(cssDest))
        .pipe(livereload());
});

gulp.task('ts', function() {
    return gulp.src('./ts/app.ts')
        .pipe(ts({
            module: false,
            noImplicitAny: false,
            target: 'ES6',
            experimentalDecorators: true,
            noEmitOnError: false,
            out: './public/js/app.js'
        }))
        .pipe(livereload());
});

gulp.task('templates', function() {
    gulp.src('./templates/**/*.jade')
        .pipe(plumber())
        .pipe(jade())
        .pipe(gulp.dest('./public/'))
        .pipe(livereload());
});

gulp.task('i18n', function() {
    gulp.src('./i18n/*.json')
        .pipe(jsonminify())
        .pipe(gulp.dest('./public/i18n/'));
});

gulp.task('svg', function() {
    rimraf('./assets/images/sprites/*', function() {
        gulp.src('./assets/images/svg/*.svg')
            .pipe(svgSprite({
                mode: {
                    css: {
                        sprite: 'sprite.svg',
                        dest: '.',
                        prefix: '.icon-svg-%s',
                        render: {
                            styl: true
                        },
                        example: true
                    }
                }
            }))
            .pipe(gulp.dest('./assets/images/sprites'));
    });
});

gulp.task('one', function() {
    gulp.start([
        'assets',
        'stylus',
        'ts',
        'templates',
        'i18n'
    ]);
});

gulp.task('assets', function() {
    gulp.src([
        './assets/**/*',
        '!./assets/**/*.styl',
        '!./assets/**/*.html'
    ]).pipe(gulp.dest('./public/'));

    gulp.src([
        './assets/images/sprites/*.styl',
    ]).pipe(gulp.dest('./styles/'));
});

gulp.task('image-min', function() {
    return gulp.src([
            'public/images/**/*.*'
        ])
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{
                removeViewBox: false
            }],
            use: [pngquant()]
        }))
        .pipe(gulp.dest('public/images'));
});

gulp.task('deploy', function() {
    gulp.src([
        './public/**/*',
    ]).pipe(gulp.dest('../public/travel'));
});

gulp.task('default', function() {
    livereload.listen({
        start: true
    });

    startExpress();

    gulp.start('one');

    gulp.watch(stylDest + '/*.styl', [
        'stylus'
    ]);

    gulp.watch('./ts/**/*.ts', [
        'ts'
    ]);

    gulp.watch('./templates/**/*.jade', [
        'templates'
    ]);

    gulp.watch('./i18n/*.json', [
        'i18n'
    ]);
});

gulp.task('prod', function() {
    startExpress();

    gulp.start([
        'compress',
        'minify-css',
        'image-min'
    ]);
});
