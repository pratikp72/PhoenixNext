/**
 * Created by montymccune on 5/9/18.
 */
import gulp from 'gulp';
import merge from 'merge-stream';
import changedInPlace from 'gulp-changed-in-place';
import project from '../aurelia.json';

export default function prepareDateTimePicker() {
  const source = 'node_modules/eonasdan-bootstrap-datetimepicker/build';

  const taskCss = gulp.src(`${source}/css/bootstrap-datetimepicker.min.css`)
    .pipe(changedInPlace({ firstPass: true }))
    .pipe(gulp.dest(`${project.platform.output}/css`));

  return merge(taskCss);
}
