/**
 * Created by tylerjones on 11/10/17.
 */

export class Index {
	constructor() {
		this.message = 'HELLO FROM phxCheckinDashboard/INDEX';
		console.log('Checkin INDEX LOADED!');
	}

	configureRouter(config, router){
		config.title = 'Checkin';
		config.map([
			{ route: 'home', name: 'home', moduleId: 'phxCheckinDashboard/home', nav: true, title: 'Checkin' }
		]);
		this.router = router;
	}
}
