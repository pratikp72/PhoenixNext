
import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {DialogService} from 'aurelia-dialog';
import {Data} from '../../data/go/data';
import { PopupHelper } from '../../go/popupHelper';
import { AddLicense } from '../dialogs/addLicense';


class LicenseObject{
  constructor(data){
    this.data = data;
    this.licenseDisplay = this.getLicenseDisplay(data.License);
    this.showClaims=false;
    this.claims = null;
    this.expireDateString='N/A';
    this.expireDays=0;
  }

  getLicenseDisplay(license){
    if(license == null){
      return 'License unclaimed';
    }else{
      return license.substring(0, 50) + "...";
    }
  }

}

@inject(helper, http, DialogService, Data, PopupHelper)
export class License {


  home=null;
  licenses=[];
  licenseTypes=['PRO','MID','NOREV'];
  bodyHeight=0;


	constructor(helper, http, dialogService, Data, PopupHelper){
		this.helper = helper;
		this.http = http;
		this.dialogService = dialogService;
    this.goData = Data;
    this.popupHelper = PopupHelper;
	}

	attached(){
    var container = document.getElementById("odgoContainer");
    this.bodyHeight = container.clientHeight - 42 - 20;
	}

	activate(model){
		let self = this;
    self.home = model;
    var licUrl = `license?tenantId=${self.home.selectedTenant.tenantId}`;
    self.goData.getWithUrl(licUrl, function(res){
      for(let i = 0; i < res.length; i++){
        self.licenses.push(new LicenseObject(res[i]));
      }
    })
	}

  saveLicense(data){
    let self = this;
    self.goData.getWithUrl('license', function(lic){

      //set license type, expire date, etc...
      lic.LicenseType = data.licenseType;
      lic.ExpireDays = data.expireDays;

      self.goData.postWithUrlAndData('license', JSON.stringify(lic), function(res){

        if(res){
          self.licenses.push(new LicenseObject(res));
        }
      });
    });
  }

  openLicensePop(callback){
    let self = this;
    self.dialogService.open({viewModel: AddLicense, model: self}).whenClosed(response => {
      if (!response.wasCancelled) {
        callback(response.output);
      } 
    });
  }

  addLicenseClick(){
    let self = this;
    self.openLicensePop(function(res){
      self.saveLicense(res);
    })
  }

  deleteClicked(license){
    let self = this;
    let message = `Do you wish to delete this license?`;
    let header = 'Delete License!';
    let options=['YES', 'NO'];
    self.popupHelper.openGenericMessagePop(message, header, options, false, function(res){
      if(res.result == 'NO'){
        return;
      }else{
        //call api...
        self.goData.deleteWithUrl(`license?id=${license.data.Id}`, function(res){
          if(res == true){
            //remove from list...
            var indexToRemove = _.findIndex(self.licenses, function(l){return l.data.Id == license.data.Id});
            self.licenses.splice(indexToRemove, 1);

            //update OD_USER table...
            var userId = self.getUserIdFromToken(license.data.License);
            //get user...
            self.goData.getWithUrl(`users/${userId}`, function(res){
              //update user...
              res.License = null;
              self.goData.putWithUrlAndData('users', res, function(updated){

              });
          });

          }else{
            //somethig failed...
          }
        });
      }
    });
  }

  getUserIdFromToken(token) {
    var splitToken = token.split('.');
    var payloadString = splitToken[1];
    var payload = atob(payloadString);

    //update the apiKey for future calls
    var t = JSON.parse(payload);
    return t.UserID;
  }

  showKey(license){
    let self = this;

    //first, check if the claims are already displayed...
    if(license.showClaims){
      //hide them and return...
      license.showClaims = false;
      return;
    }else if(license.claims != null){
      //if we already have the claims...
      license.showClaims = true;
      return;
    }

    self.goData.getWithUrl(`license/claims?licenseId=${license.data.Id}`, function(res){
      if(res){
        license.showClaims = true;
        license.claims = res;
        //update expireDays to human readable...
        if(res.hasOwnProperty('ExpireDays')){
          license.expireDays = res.ExpireDays;
        }
        if(res.hasOwnProperty('ExpireDate')){
          var date = moment.unix(res.ExpireDate);
          license.expireDateString = date.format("MM/DD/YYYY");
        }
      }
    });
  }

}
