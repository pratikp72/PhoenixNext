/**
 * Created by montymccune on 5/9/18.
 */
import gulp from 'gulp';
import merge from 'merge-stream';
import changedInPlace from 'gulp-changed-in-place';
import project from '../aurelia.json';

export default function prepareNoty() {
  const source = 'node_modules/noty/lib';

  const taskCss = gulp.src(`${source}/noty.css`)
    .pipe(changedInPlace({ firstPass: true }))
    .pipe(gulp.dest(`${project.platform.output}/css`));

  const themeCss = gulp.src(`${source}/themes/*`)
      .pipe(changedInPlace({ firstPass: true }))
      .pipe(gulp.dest(`${project.platform.output}/css/themes`));

  return merge(taskCss, themeCss);
}
