
//import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import {Router} from 'aurelia-router';
import {Data} from '../data/go/data';


@inject(http, helper, Router, Data)
export class ForgotPassword {

  email=null;


	constructor(http, helper, Router, Data){
		this.http = http;
		this.helper = helper;
		this.router = Router;
    this.goData = Data;
	}

  resetClick(){
    let self = this;
    let forgotPassData={
      'Email': self.email
    }
    self.goData.postWithUrlAndData('go/forgotpassword', JSON.stringify(forgotPassData), function(res){
      self.router.navigateToRoute('updatepassword');
    });
  }
}
