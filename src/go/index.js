export class Index {
  constructor() {
    console.log('GO for launch!');
  }

  configureRouter(config, router){
    config.title = 'Phoenix GO';
    config.map([
      { route: 'home', name: 'home', moduleId: 'go/home', nav: true, title: 'GO' },
      { route: 'signature', name: 'signature', moduleId: 'go/signature', nav: true, title: 'Signature Pad' }
    ]);
    this.router = router;
  }
}
