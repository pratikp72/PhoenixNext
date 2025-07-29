/**
 * Created by tylerjones on 11/10/17.
 */

export class Index {
	constructor() {
		this.message = 'HELLO FROM kioskPageOrder/INDEX';
		console.log('KioskPageOrder INDEX LOADED!');
	}

	configureRouter(config, router){
		config.title = 'Kiosk Pages';
		config.map([
			{ route: 'pages', name: 'pages', moduleId: 'kioskPageOrder/pages', nav: true, title: 'Kiosk Pages' }
		]);
		this.router = router;
	}
}
