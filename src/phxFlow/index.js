/**
 * Created by tylerjones on 11/10/17.
 */

export class Index {
	constructor() {
		this.message = 'HELLO FROM phxFlow/INDEX';
		console.log('PhxFlow INDEX LOADED!');
	}

	configureRouter(config, router){
		config.title = 'Phoenix Flow';
		config.map([
			{ route: 'home', name: 'home', moduleId: 'phxFlow/home', nav: true, title: 'Flow' }
		]);
		this.router = router;
	}
}
