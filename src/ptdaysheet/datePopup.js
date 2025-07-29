/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {bindable, inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';

@inject(DialogController, http, helper)
export class DatePopup {

  @bindable datepicker;
  selectedDate;
  dateDisplayOptions=['days', 'weeks', 'date'];
  dateDisplay=null;
  pickerOptions = {
    format: 'MM/DD/YYYY',
    // inline: true,
    // keepOpen: true,
    // allowInputToggle: false
  };

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  close(){
    let self = this;
    self.dialogController.close(true, {"date": self.selectedDate, "display": self.dateDisplay});
  }

  showPicker(){
    this.datepicker.methods.toggle();
  }

  activate(obj){
    let self = this;
  }

}
