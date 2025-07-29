/**
 * Created by tylerjones on 11/10/17.
 */

export class Index {
	constructor() {
		this.message = 'HELLO FROM ptdaysheet';
		console.log('ptdaysheet INDEX LOADED!');
	}

	configureRouter(config, router){
		config.title = 'ptdaysheet';
		config.map([
			{ route: 'datagrid', name: 'datagrid', moduleId: 'ptdaysheet/datagrid', nav: true, title: 'DataGrid' }
		]);
		this.router = router;
	}
}
