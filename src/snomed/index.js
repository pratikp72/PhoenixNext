/**
 * Created by tylerjones on 11/10/17.
 */

export class Index {
	constructor() {
		this.message = 'HELLO FROM SNOMED/INDEX';
		console.log('SNOMED INDEX LOADED!');
	}

	configureRouter(config, router){
		config.title = 'Snomed';
		config.map([
			{ route: 'browser', name: 'browser', moduleId: 'snomed/browser', nav: true, title: 'Browser' },
			{ route: 'selector', name: 'selector', moduleId: 'snomed/selector', nav: true, title: 'Code Selector' }
		]);
		this.router = router;
	}
}