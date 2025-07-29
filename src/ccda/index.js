
export class Index {
    constructor() {
        this.message = 'HELLO FROM ccda/index';
        console.log('ccda-index INDEX LOADED!');
    }

    configureRouter(config, router){
        config.title = 'CCDA';
        config.map([
            { route: 'selection', name: 'selection', moduleId: 'ccda/selection', nav: true, title: 'CCDA Selection' },
            { route: 'reconciliation', name: 'reconciliation', moduleId: 'ccda/reconciliation', nav: true, title: 'Reconciliation' }
        ]);
        this.router = router;
    }
}
