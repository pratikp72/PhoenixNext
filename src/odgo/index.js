
export class Index {

	constructor() {
		this.message = 'HELLO FROM odgo/index';
		console.log('ODGO INDEX LOADED!');
	}

	configureRouter(config, router){
		config.title = 'ODGO Manager';
		config.map([
			{ route: 'home', name: 'home', moduleId: 'odgo/home', nav: true, title: 'Home' }
		]);
		this.router = router;
	}

}
