
export class Index {

	constructor(){
		this.message = 'WHAT UP FROM INDEX!!!';
	}

	configureRouter(config, router){
		config.title = 'Phoenix Data Grid';
		config.map([
			{ route: 'patient-info', name: 'patient-info', moduleId: 'pages/patient-info', nav: true, title: 'Patient Info' },
			{ route: 'patient-info-editor', name: 'patient-info-editor', moduleId: 'pages/patient-info-editor', nav: true, title: 'Patient Info Editor' }
		]);
		this.router = router;
	}

}