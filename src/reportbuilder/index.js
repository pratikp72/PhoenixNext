export class Index {
  constructor() {
    console.log('Report Builder!');
  }

  configureRouter(config, router){
    config.title = 'Report Builder';
    config.map([
      { route: 'editor', name: 'editor', moduleId: 'reportbuilder/editor', nav: true, title: 'Editor' }
      // { route: 'viewer', name: 'viewer', moduleId: 'formbuilder/viewer', nav: true, title: 'Viewer' }
    ]);
    this.router = router;
  }
}
