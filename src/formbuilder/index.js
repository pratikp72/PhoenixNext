export class Index {
  constructor() {
    console.log('Form Builder!');
  }

  configureRouter(config, router){
    config.title = 'Form Builder';
    config.map([
      { route: 'editor', name: 'editor', moduleId: 'formbuilder/editor', nav: true, title: 'Editor' },
      { route: 'viewer', name: 'viewer', moduleId: 'formbuilder/viewer', nav: true, title: 'Viewer' }
    ]);
    this.router = router;
  }
}
