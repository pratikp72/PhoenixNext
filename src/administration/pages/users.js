import {inject} from "aurelia-dependency-injection";
import {observable} from 'aurelia-framework';
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";
import {PopupHelper} from "../../go/popupHelper";
import * as _ from 'lodash';

@inject(helper, http, Data, PopupHelper)
export class Users {

  users=[];
  filteredUsers=[];
  height;
  selectedUser=null;
  @observable filter;
  filterChanged(newVal, oldVal){
    this.filterUsers(newVal);
  }


  constructor(helper, http, Data, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.popupHelper = PopupHelper;
  }

  activate(){
    this.setup();
  }

  filterUsers(value){
    this.filteredUsers = _.filter(this.users, function(u){return u.LastName.toLowerCase().startsWith(value.toLowerCase());});
  }

  setup(){
    let self = this;

    const windowHeight = window.innerHeight;
    self.height = windowHeight - (157);

    self.goData.getAllUsers(function(res){
      self.users = res;
      self.filteredUsers = res;
    });
  }

  edit(user){
    var licList=[];
    licList.push(user.LicenseType);
    this._openNewUserPop(user, licList);
  }

  add(){
    let self = this;
    this.openPopup(this.createNewUser());
  }

  checkLicenseCount(callback){
    let self = this;
    self.goData.getWithUrl('licenses', function(res){
      //total count...
      var total = 0;
      if(res){
        total = res.length;
      }
      callback(total, res);
    });
  }

  getAvailableLicenses(licenses){
    var licenseList=[];
    for(let i = 0; i < licenses.length; i++){
      var lic = licenses[i];
      if(lic.License == null){
        licenseList.push(lic.LicenseType);
      }
    }
    return licenseList;
  }

  openPopup(user){
    let self = this;

    //check total license count...
    self.checkLicenseCount(function(count, licenses){

      var availLicenses = self.getAvailableLicenses(licenses);
      if(availLicenses > 0){
        var uniqLics = _.uniq(availLicenses);
        self._openNewUserPop(user, uniqLics);
      }else{
        self.newLicensePop(user);
      }
      // if(self.users.length < count){

      //   var availLicenses = self.getAvailableLicenses(licenses);
      //   var uniqLics = _.uniq(availLicenses);

      //   self._openNewUserPop(user, uniqLics);

      // }else{
      //   self.newLicensePop(user);
      // }
    });
  }

  _openNewUserPop(user, licenseList){
    let self = this;
    //open popup
    let viewPath = '../administration/dialogs/newUser';
    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let width = (windowWidth / 3) * 2;
    let left = (windowWidth / 5);

    let options={
      closeActiveDialog: false
    }

    let model={
      "user": user,
      "licenses": licenseList
    }

    let title = user.UserID == 0 ? 'New User' : 'Update User';

    self.popupHelper.openViewModelPop(viewPath, model, title, width, windowHeight, 50, left, options, function(user, res){
      if(user.hasOwnProperty("cancelled")){
        return;
      }else if(res && res.wasCancelled){
        //add new user to list...
        self.users.push(user);
      }else{
        self.save(user);
      }

    });
  }



  newLicensePop(user){
    let self = this;
    let message = `You have used all your exisitng User Licenses. Do you wish to create a new one?`;
    let header = 'Add New User License?';
    let options=['YES', 'NO'];
    self.popupHelper.openGenericMessagePop(message, header, options, true, function(res){
      if(res.result == 'YES'){
        self._openNewUserPop(user, ['PRO', 'MID', 'NOREV']);
      }else{
        return;
      }
    });
  }

  createNewUser(){

    // this.goData.getWithUrl('user', function(user){
    //   user.AccountEnabled = true;
    //   callback(user);
    // });

    return{
      UserID: 0,
      UserName:"",
      password:"",
      LicenseType: null,
      FirstName:"",
      LastName:"",
      AccountEnabled:1,
      role: null,
      ProviderID: 0,
      Json: null
    }
  }

  save(user){
    let self = this;

    delete user.dialog;

    //convert JSON if necessary....
    if (typeof user.Json === 'string' || user.Json instanceof String){

    }else{
      //convert to string here...
      user.Json = JSON.stringify(user.Json);
    }

    if(user.UserID == 0){
      //get available license...
      self.goData.getWithUrl('license', function(lic){
        //if we have an abailable license...
        if(lic){

          //update license obj...
          lic.LicenseType = user.LicenseType;

          //create user license...
          var userLicense={
            'License': lic,
            'UserID': user.UserID,
            'UserName': user.UserName,
            'Password': user.password,
            'LicenseType': user.LicenseType,
            'FirstName': user.FirstName,
            'LastName': user.LastName,
            'AccountEnabled': user.AccountEnabled,
            'Role': user.role
          }
          //new user and license...
          self.goData.postWithUrlAndData('users/license', JSON.stringify(userLicense), function(res){
            self.users.push(res);
          });

         }});
      //else{
      //     //ALERT!!! NO LICENSE AVAIL...
      //     //create a new one???
      //   }
      // });
    }else{

      //check if we need to update password...
      if(user.updatePassword){
        delete user.updatePassword;
        self.goData.putWithUrlAndData('users/newpassword', user, function(res){

        });
      }else{
        self.goData.putWithUrlAndData('users', user, function(res){

        });
      }
    }
  }
}
