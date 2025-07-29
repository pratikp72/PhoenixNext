import {inject, bindable} from 'aurelia-framework';
//import moment from "moment";
import {Data} from '../../data/go/data';
import {DialogController} from 'aurelia-dialog';

@inject(Data, DialogController)
export class UpdateUser {

  newPassword;
  // user=null;
  verified=null;

  constructor(Data, DialogController){
    this.goData = Data;
    this.dialogController = DialogController;
  }

  cancel(){
    this.dialogController.cancel();
  }

  close(){
    this.dialogController.close(true, {'newPassword': this.newPassword, 'verified': this.verified});
  }

  activateAcct(){
    //do something to user...
    this.verified = this.verified ? false : true;
  }

  activate(model){
    let self = this;
    //self.user = model;
    self.verified = model.User.Verified;
  }

  attached(){
    var res = $(this.updateUser).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");
  }
}
