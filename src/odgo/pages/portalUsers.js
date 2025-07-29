
import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {DialogService} from 'aurelia-dialog';
import {Data} from '../../data/go/data';
import { PopupHelper } from '../../go/popupHelper';
import { UpdateUser } from '../dialogs/updateUser';


@inject(helper, http, DialogService, Data, PopupHelper)
export class PortalUsers {


  home=null;
  users=[];
  searchTxt=null;
  foundUser=null;

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

    // var licUrl = `license?tenantId=${self.home.selectedTenant.tenantId}`;
    // self.goData.getWithUrl(licUrl, function(res){
    //   for(let i = 0; i < res.length; i++){
    //     self.licenses.push(new LicenseObject(res[i]));
    //   }
    // })
	}

  searchUser(){
    let self = this;

    //comma???
    let nameSplit = self.searchTxt.split(',');
    let firstName=null;
    let lastName=null;
    var url = 'portaluser/search?tid=' +self.home.selectedTenant.tenantId + '&lastname=';
    if(nameSplit.length == 2){
      lastName = nameSplit[0].trim();
      firstName= nameSplit[1].trim();
      url += lastName + '&firstname='+ firstName;
    }else if(nameSplit.length == 1){
      lastName = nameSplit[0].trim();
      url+= lastName + '&firstname=';
    }else{
      return;
    }

    self.goData.getWithUrl(url, function(users){

      self.users = users;
    });
  }

  // editUser(user){

  // }

  updateUser(data){
    let self = this;
    self.goData.putWithUrlAndData('portaluser', data, function(usr){

      var res = usr;

      //update user...
      var usrIndex = _.findIndex(self.users, function(u){return u.User.ID == usr.ID});
      self.users[usrIndex].User.Verified = usr.Verified;

    });
  }

  openUserPop(user){
    let self = this;
    self.dialogService.open({viewModel: UpdateUser, model: user}).whenClosed(response => {
      if (!response.wasCancelled) {
        var userObj={
          'Password': response.output.newPassword,
          'Email': user.User.Email,
          'Id': user.User.ID,
          'Verify': response.output.verified != null ? response.output.verified : user.User.Verified
        }
        self.updateUser(userObj);
      } 
    });
  }



 
}
