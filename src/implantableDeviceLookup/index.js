/**
 * Created by tylerjones on 11/10/17.
 */

export class Index {
	constructor() {
		//this.message = 'HELLO FROM implantableDeviceLookup/INDEX';
		console.log('implantableDeviceLookup INDEX LOADED!');
	}

	configureRouter(config, router){
		config.title = 'Implantable Devices';
		config.map([
			{ route: 'devices', name: 'devices', moduleId: 'implantableDeviceLookup/devices', nav: true, title: 'Devices' }
		]);
		this.router = router;
	}
}
