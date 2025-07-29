/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import * as _ from "lodash";

@inject(DialogController, http, helper)
export class TabPopup {

  tabOptions=[];
  selectedTabs =[];

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  close(){
    let self = this;
    self.dialogController.close(true, self.selectedTabs);
  }

  activate(tabOptions){
    let self = this;
    self.tabOptions = _.sortBy(tabOptions, ['Description2']);
  }

  attached(){
     var res = $(this.tabpop).closest('ux-dialog-container');
     var uxDx = res[0];
     uxDx.style.setProperty("z-index", "5001", "important");
   }
}
