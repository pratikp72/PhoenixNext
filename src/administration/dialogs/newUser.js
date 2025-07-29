import {inject} from "aurelia-dependency-injection";
import { observable } from 'aurelia-framework';
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";
import {DialogController} from 'aurelia-dialog';

@inject(helper, http, Data, DialogController)
export class NewUser {

  user=null;
  roleTypes=['Administrator', 'Business Office', 'Front Desk', 'Medical Assistant', 'Medical Records', 'Provider', 'Secretaries', 'Surgical Scheduling', 'Transcription', 'Xray Admin'];
  selectedRole=null;
  licenseTypes=['PRO','MID','NOREV'];
  availableLicense = null;
  locations=[];


  @observable typePassword="";
  @observable retypePassword="";
  invalidPassword = true;
  invalidRetypePassord = true;
  userStatus;

  buttonText="";

  checkTimer;

  canSave = false;
  canCreateLicense=false;

  passwordMustContainTxt = "Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, and 1 number.";
  passwordsDontMatchTxt= "Passwords must match."
  passwordErrorTxt="";
  retypePasswordErrorTxt="";

  userStatusList=["Enabled"];

  newUserCreated=false;

  tabUserSelected=true;
  tabToolbarSelected=false;
  tabMiscSelected=false;

  hideKeyPicker=true;


  constructor(helper, http, Data, DialogController) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.dialogController = DialogController;
  }

  tabClicked(tab){
    if(tab == 'user'){
      this.tabUserSelected=true;
      this.tabToolbarSelected=false;
      this.tabMiscSelected = false
    }else if(tab== "misc"){
      //toolbar
      this.tabMiscSelected = true
      this.tabUserSelected=false;
      this.tabToolbarSelected=false;
    }else{
      //toolbar
      this.tabUserSelected=false;
      this.tabToolbarSelected=true;
      this.tabMiscSelected = false
    }
  }

  getRoles(){
    let self = this;
    self.goData.getWithUrl('roles', function(res){
      self.roleTypes = res;

      //what is our users role???
      var foundRole = _.find(self.roleTypes, function(r){return r.RoleID == self.user.roleID});
      if(foundRole){
        self.selectedRole = foundRole;
      }

    });
  }

  typePasswordChanged(newVal, oldVal){
    this/this.checkPassword(newVal);
  }

  checkPassword(password){
    var valid= this.validate(password);
    if(valid && this.typePassword == this.retypePassword){
      this.invalidPassword = false;
    }else if(valid && this.typePassword != this.retypePassword){
      this.invalidPassword = true;
      this.passwordErrorTxt = this.passwordsDontMatchTxt;
    }else{
      this.invalidPassword = true;
      this.passwordErrorTxt = this.passwordMustContainTxt;
    }
    // else if(!valid && this.typePassword != this.retypePassword){
    //   this.invalidPassword = true;
    //   this.passwordErrorTxt = this.passwordMustContainTxt;
    // }
  }

  retypePasswordChanged(newVal, oldVal){
    this.checkRetypePassword(newVal);
  }

  checkRetypePassword(password){
    var valid= this.validate(password);
    if(valid && this.typePassword == this.retypePassword){
      this.invalidRetypePassord = false;
    }else if(valid && this.typePassword != this.retypePassword){
      this.invalidRetypePassord = true;
      this.retypePasswordErrorTxt = this.passwordsDontMatchTxt;
    }else{
      this.invalidRetypePassord = true;
      this.retypePasswordErrorTxt = this.passwordMustContainTxt;
    }
    // else if(!valid && this.typePassword != this.retypePassword){
    //   this.invalidRetypePassord = true;
    //   this.retypePasswordErrorTxt = this.passwordMustContainTxt;
    // }
  }

  activate(model) {
    let self = this;
    self.user = model.user;

    //fix for null string in JSson...
    if(self.user.hasOwnProperty('Json') && 
      self.user.Json != null && 
      self.user.Json.toLowerCase() === 'null'){
      self.user.Json = null;
    }

    if(self.user.LicenseType == 'NOREV'){
      self.hideKeyPicker = false;
    }

    self.licenseTypes = model.licenses;

    self.getRoles();

    self.checkTimer = setInterval(self.checkRequirementsTick.bind(self), 1000);

    self.buttonText = self.user.UserID == 0 ? 'ADD' : 'UPDATE';

    if (self.user.password &&
        self.user.password.length > 0) {
      self.typePassword = self.user.password;
      self.retypePassword = self.user.password;
    }

    //if this is an exisiting user...
    if(self.user.UserID != 0){
      //add "disabled" to status list...
      self.userStatusList.push("Disabled");
    }

    self.userStatus = self.user.AccountEnabled ? 'Enabled' : 'Disabled';

    //do we have a license??
    if(!self.user.License){
      self.goData.getWithUrl(`license/available?licenseType=${self.user.LicenseType}`, function(lic){
        if(lic){
          self.availableLicense = lic;
        }
      });
    }
  }



  attached(){
    let self = this;
    var res = $(self.newuser).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    self.goData.getWithUrl('locations', function(locRes){
      self.locations = locRes;
    })

  }

  detached(){
    clearInterval(this.checkTimer);
  }

  checkRequirementsTick(){
    let self = this;
    self.canSave = self.checkRequirements();
  }

  checkRequirements(){
    let self = this;

    self.checkPassword(self.typePassword);
    self.checkRetypePassword(self.retypePassword);

    if(self.typePassword =="" || self.retypePassword == "" || self.typePassword != self.retypePassword){
      return false;
    }

    if(self.user.UserName &&
      self.user.LicenseType &&
      self.user.FirstName &&
      self.user.LastName &&
      self.user.email &&
      self.selectedRole){

      self.canCreateLicense = true;

      if(self.user.License || self.user.LicenseType == 'NOREV'){
        return true;
      }else{
        return false;
      }

    }else{
      return false;
    }

    ///canCreateLicense
  }

  add(){
    let self = this;
    if(self.checkRequirements()){

      //check if password has changed...
      if(self.user.password != self.typePassword){
        self.user.updatePassword = true;
      }

      self.user.password = self.typePassword;
      // self.user.UserName = self.user.UserName;
      // self.user.email = self.user.email;
      self.user.role = self.selectedRole.RoleName;
      self.user.roleID = self.selectedRole.RoleID;

      //if we created a new user already (not updating),
      // we cancel out the dialogController here, 
      //so it won't try to save when it returns
      if(self.newUserCreated){
        self.dialogController.close(false, self.user);
        //self.dialogController.cancel();
      }else{
        //self.dialogController.ok(self.user);
        self.dialogController.close(true, self.user);
      }
    }
  }

  validate(value){
    //- at least 8 characters
    //- must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number
    //- Can contain special characters
    const regEx=/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm;
    var validated = regEx.test(value)
    return validated;
   }

   addKey(){
    let self = this;
    if(!self.availableLicense){

      self.goData.getWithUrl('license', function(newLicense){

        //set license type...
        newLicense.LicenseType = self.user.LicenseType;
        var userLicense=self.getUserLicenseObject(newLicense);


        // if(self.user.UserID == 0){
          self.goData.postWithUrlAndData('users/license', JSON.stringify(userLicense), function(res){

            if(res){
              self.availableLicense = null;
              self.user.License = res.License;
              
              if(self.user.UserID != res.UserID){
                self.newUserCreated = true;
                self.user.UserID = res.UserID;
              }

            }
          });
        // }else{
        //   self.goData.putWithUrlAndData('users/license', userLicense, function(res){

        //     if(res){
        //       self.availableLicense = null;
        //       self.user.License = res.License;
        //       //self.user
        //       self.user.UserID = res.UserID;
        //       self.newUserCreated = true;
        //     }
        //   });
        // }
      });
    }
   }

   claimKey(){
    let self = this;
    if(self.availableLicense){

      var userLicense=self.getUserLicenseObject(self.availableLicense);

      self.goData.putWithUrlAndData('users/license/claim', userLicense, function(res){

        if(res){
          self.availableLicense = null;
          self.user.License = res.License;
        }
      });
    }
   }

   getUserLicenseObject(ODGO_License){
    let self = this;
    var userLicense={
      'License': ODGO_License,
      'UserID': self.user.UserID,
      'UserName': self.user.UserName,
      'Password': self.retypePassword,
      'LicenseType': self.user.LicenseType,
      'FirstName': self.user.FirstName,
      'LastName': self.user.LastName,
      'AccountEnabled': self.user.AccountEnabled,
      'Role': self.selectedRole.RoleName,
      'RoleId': self.selectedRole.RoleID,
      'Location': self.user.Location
    }
    return userLicense;
   }


}
