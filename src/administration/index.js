
export class Index {

    constructor(){
        this.message = 'ITS ADMINISTRATION TIME!';
    }

    configureRouter(config, router){
        config.title = 'Administration';
        config.map([
            { route: 'procedure-mapper', name: 'procedure-mapper', moduleId: 'administration/procedure-mapper', nav: true, title: 'Procedure Mapper' }
        ]);
        this.router = router;
    }

}
