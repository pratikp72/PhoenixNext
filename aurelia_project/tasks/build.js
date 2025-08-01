import gulp from 'gulp';
import {CLIOptions, build as buildCLI} from 'aurelia-cli';
import transpile from './transpile';
import processMarkup from './process-markup';
import processCSS from './process-css';
import copyFiles from './copy-files';
import watch from './watch';
import project from '../aurelia.json';
import prepareFontAwesome from './prepare-font-awesome'; // Our custom task
import prepareDateTimePicker from './prepare-datetimepicker'; // Our custom task
import preparePackery from "./prepare-packery";
import prepareNoty from './prepare-noty'; // Our custom task

let build = gulp.series(
  readProjectConfiguration,
  gulp.parallel(
    transpile,
    processMarkup,
    processCSS,
    copyFiles,
    prepareFontAwesome, // Our custom task
      prepareDateTimePicker,
      preparePackery,
      prepareNoty
  ),
  writeBundles
);

let main;

if (CLIOptions.taskName() === 'build' && CLIOptions.hasFlag('watch')) {
  main = gulp.series(
    build,
    (done) => { watch(); done(); }
  );
} else {
  main = build;
}

function readProjectConfiguration() {
  return buildCLI.src(project);
}

function writeBundles() {
  return buildCLI.dest();
}

export { main as default };
