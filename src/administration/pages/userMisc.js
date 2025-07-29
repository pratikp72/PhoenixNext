import {inject, observable} from 'aurelia-framework';
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";
import { PopupHelper } from '../../go/popupHelper';
import * as _ from 'lodash';


@inject(helper, http, Data, PopupHelper)
export class UserMisc {

  user = null;
  @observable erxEnabled = false;
  erxEnabledChanged(newVal, oldVal){
    this.user.CanSendERx = newVal;
    this.user.eRx = newVal;
  }

  constructor(helper, http, Data, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.popupHelper = PopupHelper;
  }

  activate(obj){
    let self = this;
    self.user = obj;
    if(self.user.CanSendERx){
      self.erxEnabled = true;
    }
  }
}
