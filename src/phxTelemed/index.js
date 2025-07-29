/**
 * Created by tylerjones on 11/10/17.
 */

export class Index {
	constructor() {
		this.message = 'HELLO FROM phxTelemed/INDEX';
		console.log('Telemed INDEX LOADED!');
	}

	configureRouter(config, router){
		config.title = 'Telemed';
		config.map([
			{ route: 'home', name: 'home', moduleId: 'phxTelemed/home', nav: true, title: 'Telemed' },
      { route: 'ipad', name: 'ipadHome', moduleId: 'phxTelemed/ipadHome', nav: true, title: 'Phoenix iPad' }
		]);
		this.router = router;
	}
}
