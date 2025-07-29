
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {Data} from '../data/go/data';
import {inject} from 'aurelia-framework';
import $ from 'jquery';
import * as _ from 'lodash';
import moment from 'moment';
import {DialogService} from 'aurelia-dialog';
import {Login} from './login'
import {PopupHelper} from '../go/popupHelper';
import { AddTenant } from './dialogs/addTenant';


class Tenant{
  constructor(id, data){
    this.tenantId = id;
    this.selected = false;
    this.data = data;
  }
}

class Page{
  constructor(name, path){
    this.name = name;
    this.path = path;
    this.selected = false;
    this.disabled=true;
  }
}

@inject(helper, http, DialogService, Data, PopupHelper)
export class Home {

  tenants=[];
  pages=[];
  selectedPage=null;
  selectedTenant=null;
  databaseNames=[];

  tenantScrollHeight=0;

	constructor(helper, http, dialogService, data, PopupHelper){
		this.helper = helper;
		this.http = http;
		this.dialogService = dialogService;
    this.data = data;
    this.popupHelper = PopupHelper;
	}

	attached(){

    let self = this;
		self.dialogService.open({viewModel: Login, model: {url: self.urlPrepender}}).whenClosed(response => {
			//console.log('DIALOG RETURN VALUE:', response);
      //var token = response.output;
      var token = self.parseToken(response.output);
      var admin = token.Admin == 'True' ? true : false;
			self.setup(admin, token.TenantId);
		});

    var container = document.getElementById("odgoContainer");
    self.tenantScrollHeight = container.clientHeight - 42 - 20;

	}

  parseToken(token) {
    var splitToken = token.split('.');
    var payloadString = splitToken[1];
    var payload = atob(payloadString);

    return JSON.parse(payload);
  }

  setup(isAdmin, tenantId){
		let self = this;

    var dbPage = new Page("Database", "./pages/database");
    dbPage.selected = true;
    self.selectedPage = dbPage;
    self.pages.push(dbPage);

    if(isAdmin){
      var licPage = new Page("License", "./pages/license");
      self.pages.push(licPage);
    }

    var watcherPage = new Page("File Watchers", "./pages/filewatcher");
    self.pages.push(watcherPage);

    var portalUsersPage = new Page("Portal Users", "./pages/portalUsers");
    self.pages.push(portalUsersPage);

    self.data.getWithUrl('tenants', function(res){

      //var addLicensePage = true;

      //just tenant ODGO...load normal - new setup
      // var foundOdgo = _.find(res, function(t){return t.TenantId.toLowerCase() == 'odgo'});
      // if(foundOdgo && res.length == 1){
      //   addLicensePage = true;
      // }
      // //OR more than two...load normal - HOSTED ENVIRONMENT
      // if(res.length > 2){
      //   addLicensePage = true;
      // }
      // //just 2 tenants, ODGO and another SELF-HOSTED...hide license
      // if(res.length == 2){
      //   var notOdgo = _.find(res, function(t){return t.TenantId.toLowerCase() != 'odgo'});
      //   if(notOdgo && notOdgo.SelfHosted){
      //     //hide license...
      //     addLicensePage = false;
      //   }
      // }

      // if(addLicensePage){
      //   var licPage = new Page("License", "./pages/license");
      //   self.pages.push(licPage);
      // }

      //admin sees ALL tenants...
      if(isAdmin){
        for(let i = 0; i < res.length; i++){
          var tenant= res[i];
          //if(tenant.TenantId == 'odgo')continue;
          var aTenant = new Tenant(tenant.TenantId, tenant);
          self.tenants.push(aTenant);
        }
      }else{
        //only display users tenant...
        var t = _.find(res, function(t){return t.TenantId.toLowerCase() == tenantId});
        var aTenant = new Tenant(t.TenantId, t);
        self.tenants.push(aTenant);
      }

    });



    //databases??
    self.data.getWithUrl('database/all', function(res){
      self.databaseNames = res;
    });
  }

	activate(model){

	}

  tenantClicked(t){
    this.selectedTenant = t;
    //this.selectedPage = this.pages[0];

    if(this.selectedTenant.tenantId == 'odgo'){
      //disabled pages...
      this.pages[1].disabled = true;
      this.pages[2].disabled = true;
      this.pages[3].disabled = true;
    }else{
      this.pages[1].disabled = false;
      this.pages[2].disabled = false;
      this.pages[3].disabled = false;
    }


    this.pageClick(this.pages[0])
    for(let i = 0; i < this.tenants.length; i++){
      var aTenant = this.tenants[i];
      if(aTenant.tenantId == t.tenantId){
        aTenant.selected = true;
      }else{
        aTenant.selected = false;
      }
    }
  }

  pageClick(page){
    this.selectedPage = page;
    for(let i = 0; i < this.pages.length; i++){
      var aPage = this.pages[i];
      //aPage.disabled = false;
      if(aPage.name == page.name){
        aPage.selected = true;
      }else{
        aPage.selected = false;
      }
    }
  }


  openAddTenant(callback){
    let self = this;
    self.dialogService.open({viewModel: AddTenant, model: {"dbNames": self.databaseNames}}).whenClosed(response => {
      if (!response.wasCancelled) {
        callback(response.output);
      } 
    });
  }


  newTenantClick(){
    let self = this;

    self.openAddTenant(function(res){
      if(res.tenantId && res.database){

        //does the tenantId exist???
        var found = _.find(self.tenants, function(t){return t.tenantId == res.tenantId});
        if(found){
          self.popupHelper.openGenericMessagePop("TenantId exists!", 'Tenant Exists', ['OK'], false, function(res){
            return;
          });
        }else{
          self.data.getWithUrl('tenant', function(tenant){

            tenant.TenantId = res.tenantId;
            tenant.DatabaseName = res.database;
    
            self.data.postWithUrlAndData('tenant', JSON.stringify(tenant), function(newTenant){
              var aTenant = new Tenant(newTenant.TenantId, newTenant);
              self.tenants.push(aTenant);
            });  
          });
        }

      }
    });
  }
}
