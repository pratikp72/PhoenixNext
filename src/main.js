import environment from './environment';
import {PLATFORM} from 'aurelia-pal';
import 'bootstrap';


export function configure(aurelia) {
  aurelia.use
	.standardConfiguration()
	.developmentLogging()
	.plugin(PLATFORM.moduleName('aurelia-dialog'), config => {
    config.useDefaults();
     //config.settings.lock = false;
    // config.settings.centerHorizontalOnly = false;
    // config.settings.startingZIndex = 5;
    // config.settings.keyboard = true;
  }).plugin(PLATFORM.moduleName('aurelia-bootstrap-datetimepicker', config => {
       // extra attributes, with config.extra
       config.extra.iconBase = 'font-awesome';
       config.extra.withDateIcon = true;

       // or any picker options, with config.options
       config.options.allowInputToggle = true;

       config.options.keepOpen = true;

       // if you use Bootstrap 4 Beta 3
       config.extra.bootstrapVersion = 4;

       // you can also change the Bootstrap 4 button class, default is shown below
       config.extra.buttonClass = 'btn btn-outline-secondary';
    }))
    .plugin(PLATFORM.moduleName('bcx-aurelia-reorderable-repeat'))
    .plugin(PLATFORM.moduleName('aurelia-hammer'))
    .plugin(PLATFORM.moduleName("aurelia-animator-css"))

     .globalResources([
      PLATFORM.moduleName('./chatbot/floating-chatbot'),
      PLATFORM.moduleName('./chatbot/chatbot-overlay'),
      PLATFORM.moduleName('./chatbot/assistance-header'),
      PLATFORM.moduleName('./chatbot/action-buttons'),
      PLATFORM.moduleName('./chatbot/detail-view'),
      PLATFORM.moduleName('./chatbot/chat-input'),
      PLATFORM.moduleName('./chatbot/office-visits-expanded'),
      PLATFORM.moduleName('./chatbot/office-visits-detail'),
    ]);


  if (environment.debug) {
    aurelia.use.developmentLogging();
  }

  if (environment.testing) {
  	console.log('ENVIRONMENT IS SET TO TESTING');
    // aurelia.use.plugin('aurelia-testing');
  }

  aurelia.start().then(() => aurelia.setRoot());
}
