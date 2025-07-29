/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import {Router} from 'aurelia-router';
import * as _ from "lodash";


@inject(DialogController, http, helper, Router)
export class DialogView {

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;
  url;


  constructor(DialogController, http, helper, Router){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.router = Router;
  }

  close(){
    let self = this;
    self.dialogController.close(true, null);
  }

  activate(obj){
    let self = this;

    self.url = obj.url;
    self.popupWidth = obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75) * .8;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;

    //self.loadView();
    //self.router.navigate(self.url);
    window.open(self.url, "_blank");

  }

  // loadView(){
  //
  // }

}
