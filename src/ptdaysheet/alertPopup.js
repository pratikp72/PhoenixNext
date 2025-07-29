/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';

@inject(DialogController, http, helper)
export class AlertPopup {

  alertText="";
  alertTitle="";
  color="";
  iconClass="";
  showOk = true;
  showCancel = false;

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  close(){
    let self = this;
    self.dialogController.close(true, self.selectedTabs);
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  activate(alertObject){
    let self = this;
    self.alertText = alertObject.text;
    self.alertTitle = alertObject.title;
    self.color = alertObject.iconColor;
    self.iconClass = alertObject.iconClass;
    self.showCancel = alertObject.showCancel ? alertObject.showCancel : false;
  }
}
