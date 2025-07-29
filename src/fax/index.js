
export class Index {

	constructor() {
		this.message = 'HELLO FROM fax/index';
		console.log('fax-dashboard INDEX LOADED!');
	}

	configureRouter(config, router){
		config.title = 'Phoenix Data Grid';
		config.map([
			{ route: 'dashboard', name: 'dashboard', moduleId: 'fax/dashboard', nav: true, title: 'Dashboard' },
      { route: 'inbound', name: 'inbound', moduleId: 'fax/inbound', nav: true, title: 'Inbound Fax' }
		]);
		this.router = router;
	}

}
