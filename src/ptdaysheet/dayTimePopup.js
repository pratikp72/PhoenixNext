/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {bindable, inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';

@inject(DialogController, http, helper)
export class DayTimePopup {

  timeValue=null;

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  close(){
    let self = this;
    self.dialogController.close(true, self.timeValue);
  }

  activate(day) {
    this.timeValue = day.totalTime;
  }
}
