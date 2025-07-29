
import {helper} from 'helpers/helper';
import {http} from 'helpers/http';
import {Access} from './access';
import {inject} from 'aurelia-framework';
import 'bootstrap';

@inject(helper,http, Access)
export class App {
  constructor(helper, http, Access) {
    this.helper = helper;
    this.http = http;
    this.access = Access;
  }

  

  configureRouter(config, router) {
    config.title = 'Phoenix Next';
    config.map([
		{ route: 'snomed', name: 'snomed', moduleId: 'snomed/index', nav: true, title: 'Snomed' },
		{ route: 'phxdatagrid', name: 'phxdatagrid', moduleId: 'PhxDataGrid/index', nav: true, title: 'PhxDataGrid' },
		{ route: 'fax', name: 'fax', moduleId: 'fax/index', nav: true, title: 'Fax' },
    { route: 'pages', name: 'pages', moduleId: 'pages/index', nav: true, title: 'Pages' },
    { route: 'implantable', name: 'implantable', moduleId: 'implantableDeviceLookup/index', nav: true, title: 'Implantable Devices' },
    { route: 'phxflow', name: 'phxflow', moduleId: 'phxFlow/index', nav: true, title: 'Phoenix Flow' },
    { route: 'ccda', name: 'ccda', moduleId: 'ccda/index', nav: true, title: 'CCDA' },
    { route: 'checkin', name: 'phxCheckinDashboard', moduleId: 'phxCheckinDashboard/index', nav: true, title: 'Checkin' },
    { route: 'kioskpreferences', name: 'kioskPreferences', moduleId: 'kioskPreferences/index', nav: true, title: 'Kiosk Preferences' },
    { route: 'telemed', name: 'phxTelemed', moduleId: 'phxTelemed/index', nav: true, title: 'Telemed' },
    { route: 'ptdaysheet', name: 'ptdaysheet', moduleId: 'ptdaysheet/index', nav: true, title: 'Day Sheet' },
    { route: 'administration', name: 'administration', moduleId: 'administration/index', nav: true, title: 'Administration' },
    { route: 'login', name: 'login', moduleId: 'login/login', nav: true, title: 'Phoenix Login' },
    { route: 'go', name: 'go', moduleId: 'go/index', nav: true, title: 'GO' },
    { route: 'formbuilder', name: 'formbuilder', moduleId: 'formbuilder/index', nav: true, title: 'Form Builder' },
    { route: 'reportbuilder', name: 'reportbuilder', moduleId: 'reportbuilder/index', nav: true, title: 'Report Builder' },
    { route: 'forgotpassword', name: 'forgotpassword', moduleId: 'login/forgotPassword', nav: true, title: 'Forgot Password' },
    { route: 'updatepassword', name: 'updatepassword', moduleId: 'login/updatePassword', nav: true, title: 'Update Password' },
    { route: 'odgo', name: 'odgo', moduleId: 'odgo/index', nav: true, title: 'ODGO Manager' }
      ]);
    this.router = router;
  }

  activate(params){
    var self = this;

    ////here we check for out authentication key
    ////IF it hasn't been obtained yet, we look to the query string
    //if(typeof this.helper.jwt() === 'undefined' ||
    //  this.helper.jwt() == null){
    //
    //  //if we find an API key in the query string
    //  //we need to re-authenticate to make sure it is still valid
    //  if (params.hasOwnProperty("jwt")){
    //    this.helper.processToken(params.jwt);
    //  }
    //}
    //else{
    //  //if we already have the apiKey we dont need to authenticate
    //  //mustAuthenticate = false;
    //}

  }
}

