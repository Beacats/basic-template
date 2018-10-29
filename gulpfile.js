const gulp = require('gulp');

// html
const pug = require('gulp-pug');
const fs = require('fs');
const data = require('gulp-data');
const path = require('path');

// css
const sass = require('gulp-sass');
const sassGlob = require('gulp-sass-glob');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssDeclarationSorter = require('css-declaration-sorter');
const mqpacker = require('css-mqpacker');
const cssnano = require('cssnano');
const stylelint = require('stylelint');
const postcssReporter = require('postcss-reporter');
const postcssScss = require('postcss-scss');

// js
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');

// utility
const browserSync = require('browser-sync').create();
const sourcemaps = require('gulp-sourcemaps');
const plumber = require('gulp-plumber');
const runSequence = require('run-sequence');
const rimraf = require('rimraf');
const connectSSI = require('connect-ssi');

var src = {
  'root': 'src',
  'pug': ['src/pug/**/*.pug', '!src/pug/**/_*.pug'],
  'watchpug': 'src/pug/**/*.pug',
  'html': 'public/**/*.html',
  'json': 'src/config/',
  'scss': ['src/scss/**/*.scss', '!src/scss/lib.scss', '!src/scss/vendor/**/*.scss'],
  'js': ['src/js/**/*.js', '!src/js/vendor/**/*.js'],
  'image': 'src/img/**/*.{png,jpg,gif,svg}',
  'vendorcss': ['src/scss/lib.scss', 'src/scss/vendor/**/*.scss'],
  'vendorjs': ['src/js/vendor/jquery/**/*.js', 'src/js/vendor/jquery-migrate/**/*.js', 'src/js/vendor/**/*.js'],
  'public': 'public/**/*'
};

var dest = {
  'root': 'htdocs/',
  'css': 'htdocs/css/',
  'image': 'htdocs/img/',
  'js': 'htdocs/js/'
};

// pugのコンパイル
gulp.task('pug', function () {
  var locals = {
    'meta': JSON.parse(fs.readFileSync(src.json + 'meta.json'))
  };
  return gulp.src(src.pug)
    .pipe(plumber())
    .pipe(data(function (file) {
      locals.pageAbsolutePath = '/' + path.relative(file.base, file.path.replace(/.pug$/, '.html')).replace(/index\.html$/, ''); // 各ページのルート相対パスを格納
      locals.pageAbsolutePath = locals.pageAbsolutePath.replace(/\\/g, '/'); // 「\」を「/」に置換
      return locals;
    }))
    .pipe(pug({
      locals: locals, // localsに渡したデータをPugファイルで取得
      //basedir: 'src', // includeをルート相対パスで使用
      pretty: true
    }))
    .pipe(gulp.dest(dest.root))
    .pipe(browserSync.reload({
      stream: true
    }));
});

// プレーンHTMLファイルの監視
gulp.task('html', function () {
  return gulp.src(src.html)
    .pipe(browserSync.reload({
      stream: true
    }));
});

// ライブラリ、プラグイン系css（scss）の結合
gulp.task('vendorcss', function () {
  return gulp.src(src.vendorcss)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sassGlob())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(dest.css))
    .pipe(browserSync.reload({
      stream: true
    }));
});

// scssのコンパイル、最小化等
gulp.task('sass', function () {
  return gulp.src(src.scss)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sassGlob())
    .pipe(postcss([
      stylelint(),
      postcssReporter({
        clearMessages: true
      })
    ], {
      syntax: postcssScss
    }))
    .pipe(sass({
      outputStyle: 'expanded'
    }).on('error', sass.logError))
    .pipe(postcss([
      autoprefixer({
        browsers: [
          'last 2 versions'
        ]
      }),
      cssDeclarationSorter({
        order: 'smacss'
      }),
      mqpacker(),
      cssnano({
        autoprefixer: false
      })
    ]))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(dest.css))
    .pipe(browserSync.reload({
      stream: true
    }));
});

// imgの書き出し
gulp.task('image', function () {
  return gulp.src(src.image)
    .pipe(gulp.dest(dest.image))
    .pipe(browserSync.reload({
      stream: true
    }));
});

// ライブラリ、プラグイン系jsの結合
gulp.task('vendorjs', function () {
  return gulp.src(src.vendorjs)
    .pipe(plumber())
    .pipe(concat('lib.js'))
    //.pipe(uglify())
    .pipe(gulp.dest(dest.js))
    .pipe(browserSync.reload({
      stream: true
    }));
});

// jsの結合と最小化
gulp.task('js', function () {
  return gulp.src(src.js)
    .pipe(plumber())
    .pipe(concat('script.js'))
    .pipe(uglify())
    .pipe(gulp.dest(dest.js))
    .pipe(browserSync.reload({
      stream: true
    }));
});

// public配下ファイルをrootに格納（gulpの処理はしない）
gulp.task('public', function () {
  return gulp.src(src.public)
    .pipe(gulp.dest(dest.root))
});

// htdocsの削除
gulp.task('clean:dest', function (cb) {
  return rimraf(dest.root, cb);
});

// タスク処理
gulp.task('build', function () {
  runSequence(
    ['html', 'public', 'pug', 'vendorcss', 'sass', 'image', 'vendorjs', 'js']
  );
});

// ブラウザの自動更新
gulp.task('browser-sync', function () {
  browserSync.init({
    server: {
      baseDir: dest.root,
      middleware: [
        connectSSI({
          baseDir: dest.root,
          ext: '.html'
        })
      ]
    },
    notify: false
  });
});

// ファイルの監視
gulp.task('watch', ['build'], function () {
  gulp.watch(src.html, ['html']);
  gulp.watch(src.public, ['public']);
  gulp.watch(src.watchpug, ['pug']);
  gulp.watch(src.vendorcss, ['vendorcss']);
  gulp.watch(src.scss, ['sass']);
  gulp.watch(src.image, ['image']);
  gulp.watch(src.vendorjs, ['vendorjs']);
  gulp.watch(src.js, ['js']);
});

// gulpコマンドで実行
gulp.task('default', ['clean:dest'], function () {
  runSequence(
    'watch',
    'browser-sync'
  );
});