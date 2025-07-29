/**
 * Created by tylerjones on 11/10/17.
 */

export class Index {
	constructor() {
		this.message = 'HELLO FROM PhxDataGrid/INDEX';
		console.log('PhxDataGrid INDEX LOADED!');
	}

	configureRouter(config, router){
		config.title = 'Phoenix Data Grid';
		config.map([
			{ route: 'datagrid', name: 'datagrid', moduleId: 'PhxDataGrid/datagrid', nav: true, title: 'DataGrid' }
		]);
		this.router = router;
	}
}
