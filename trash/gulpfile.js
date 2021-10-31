import gulp from 'gulp'
import babelify from 'babelify'
import browserify from 'browserify'
import source from 'vinyl-source-stream'
import buffer from 'vinyl-buffer'

// gulp.task('bundle', () => {
//     browserify(['js/client/run.js'])
//         .transform(babelify)
//         .bundle()
//         .pipe(source('bundle.js'))
//         .pipe(gulp.dest('dist/scripts'))
//         .pipe(buffer())
// })

function defaultTask(cb) {
    // place code for your default task here
    browserify(['js/client/run.js'])
        .transform(babelify)
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(gulp.dest('dist/scripts'))
        .pipe(buffer())

    cb();
}
  
exports.default = defaultTask