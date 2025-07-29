
import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {DialogService} from 'aurelia-dialog';
import {Data} from '../../data/go/data';
import { PopupHelper } from '../../go/popupHelper';

// class Tenant{
//   constructor(name){
//     this.name = name;
//     this.selected = false;
//   }
// }

@inject(helper, http, DialogService, Data, PopupHelper)
export class Database {


  home=null;
  displayTenantIdEdit=false;

	constructor(helper, http, dialogService, Data, PopupHelper){
		this.helper = helper;
		this.http = http;
		this.dialogService = dialogService;
    this.goData = Data;
    this.popupHelper = PopupHelper;
	}

	attached(){

	}

	activate(model){
		let self = this;
    self.home = model;
	}

  save(){
    let self = this;

    //save alert
    var alert = self.helper.createNoty('Saving ' + self.home.selectedTenant.tenantId, 3000);
    alert.show();

    self.goData.putWithUrlAndData('tenant', self.home.selectedTenant.data, function(res){
      if(res){
        alert.setType('success');
        alert.setText(self.home.selectedTenant.tenantId + ' was successfully saved!');
      }else{
        alert.setType('error');
        alert.setText(self.home.selectedTenant.tenantId + ' could not be saved!');
      }
      alert.close();
    });
  }

  delete(){
    let self = this;
    let msg = `Are you sure you wish to delete ${self.home.selectedTenant.tenantId}?`;
    self.popupHelper.openGenericMessagePop(msg, 'Delete Tenant?', ['YES','NO'], false, function(res){
      let r = res.result;
      if(r == 'YES'){

        //delete alert
        var alert = self.helper.createNoty('Deleting ' + self.home.selectedTenant.tenantId, 3000);
        alert.show();

        var url = `tenant?id=${self.home.selectedTenant.data.Id}`;

        self.goData.deleteWithUrl(url, function(res){
          if(res){
            alert.setType('success');
            alert.setText(self.home.selectedTenant.tenantId + ' was successfully deleted!');
            var indexToDelete = _.findIndex(self.home.tenants, function(t){return t.tenantId == self.home.selectedTenant.tenantId});
            self.home.tenants.splice(indexToDelete, 1);
            self.home.selectedTenant = null;
          }else{
            alert.setType('error');
            alert.setText(self.home.selectedTenant.tenantId + ' failed to delete!');
          }
        });

      }
    });
  }

  editTenantClick(){
    this.displayTenantIdEdit = this.displayTenantIdEdit ? false : true;
  }
}
