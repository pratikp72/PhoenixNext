
//import {DialogController} from 'aurelia-dialog';
import {inject, observable} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import {Router} from 'aurelia-router';
import {Data} from '../data/go/data';


@inject(http, helper, Router, Data)
export class UpdatePassword {

  @observable password=null;
  @observable passwordConfirm=null;
  hasError = false;
  userId;
  verificationGuid;
  verified=false;

  passwordChanged(newValue, oldValue){
    this.validate(newValue);
  }

  passwordConfirmChanged(newValue, oldValue){
    this.validate(newValue);
  }

	constructor(http, helper, Router, Data){
		this.http = http;
		this.helper = helper;
		this.router = Router;
    this.goData = Data;
	}

  activate(params){
    //get userId and verificationGuid for query string...
    if(params.hasOwnProperty('userId') && params.hasOwnProperty('verificationGuid')){
      //verify params...
      this.userId = params.userId;
      this.verificationGuid = params.verificationGuid;
    }
  }

  attached(){
    let self = this;
    if(self.userId && self.verificationGuid){
      //verify params...
      var url = `users/verifyPassword?userId=${self.userId}&verificationGuid=${self.verificationGuid}`;
      self.goData.getWithUrl(url, function(jwt){
        if(jwt){
          //successfully verified!
          self.verified = true;
          self.helper.processToken(jwt);
        }
      });
    }
  }

  updateClick(){
    let self = this;

    //update password...
    var passwordReset={
      'UserID': self.userId,
      'Password': self.passwordConfirm
    }

    self.goData.putWithUrlAndData('users/resetpassword', passwordReset, function(res){
      self.router.navigateToRoute('login');
    });
  }

  validate(value){
    //- at least 8 characters
    //- must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number
    //- Can contain special characters
    const regEx=/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm;
    var validated = regEx.test(value)

    if(this.password != this.passwordConfirm || !validated){
      this.hasError = true
    }else{
      this.hasError = false
    }
   }

}
