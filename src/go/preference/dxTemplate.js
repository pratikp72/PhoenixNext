import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import {PopupHelper} from "../popupHelper";

@inject(PopupHelper)
export class DxTemplate {

  section=null;
  //displayDeleteHeader = false;

  constructor(PopupHelper) {
    this.popHelper = PopupHelper;
  }

  activate(params) {
    var self = this;
    let p = params;
    self.section = params;
  }

  // rowSwipe(event, row) {
  //   if (event.direction === 'left') {
  //     //display delete option...
  //     if(!row.displayDelete){
  //       row.displayDelete = true;
  //       this.displayDeleteHeader = true;
  //     }
  //   }else if(event.direction === 'right') {
  //     //display delete option...
  //     if(row.displayDelete){
  //       row.displayDelete = false;
  //       this.displayDeleteHeader = false;
  //     }
  //   }
  // }
}
