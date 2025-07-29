/**
 * Created by montymccune on 5/9/18.
 */
import gulp from 'gulp';
import merge from 'merge-stream';
import changedInPlace from 'gulp-changed-in-place';
import project from '../aurelia.json';

export default function preparePackery() {
  const source = 'node_modules/packery/dist';

  console.log('running prepare packery');

  const taskJs = gulp.src(`${source}/packery.pkgd.min.js`)
    //.pipe(changedInPlace({ firstPass: true }))
    .pipe(gulp.dest(`${project.platform.output}`));

  return merge(taskJs);
}
