import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import moment from "moment";
import {Home} from './home';
import {Data} from '../data/go/data';
import * as _ from 'lodash';
import {observable} from "aurelia-binding";

@inject(helper,http,Home, Data)
export class PtAuthPop {

  authTypes=['PT', 'OT'];
  bodyparts;// = ['Ankle','Knee', 'Hip', 'Wrist', 'Elbow', 'Shoulder', 'Cervical', 'Lumbar'];
  authdate;
  @bindable datepicker;

  ptAuth=null;
  statusText=null;

  constructor(helper, http, Home, Data){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
  }

  cancel(){
    this.ptAuth.dialog.cancel();
  }

  close(){
    //update date from picker...
    this.ptAuth.AuthDate=this.authdate;
    this.ptAuth.dialog.close(true, this.ptAuth);
  }

  delete(){
    this.ptAuth.Status = 'DEL';
    this.close();
  }

  activate(model){
    let self = this;
    self.bodyparts = self.goData.bodyparts;
    self.ptAuth = model;
    //check fo NEW authorization...
    if(model.Id==0){
      self.authdate = moment().format('MM/DD/YYYY');
      self.statusText = 'ACTIVE';
      self.ptAuth.Status = 'ACT';
    }else{
      self.authdate = moment(self.ptAuth.AuthDate).format('MM/DD/YYYY');
      if(self.ptAuth.Status=='ACT'){
        self.statusText = 'ACTIVE';
      }else if(self.ptAuth.Status=='DEL'){
        self.statusText = 'DELETED';
      }else{
        self.statusText = 'EXPIRED';
      }
    }
  }
}
