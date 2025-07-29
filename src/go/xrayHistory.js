import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';
import {PopupHelper} from './popupHelper';


class XrayRow {
  constructor(data){
    this.displayThumbnails=false;
    this.data = data;
    this.date = moment(data.ExamDateTime).format('MM/DD/YYYY');
    this.side = data.Body_Side;
    this.part = data.Body_Part;
    this.description = data.Description;
    this.altRow=false;
  }

  toggleThumbnails(){
    this.displayThumbnails = this.displayThumbnails ? false : true;
  }
}

@inject(helper,http, Data, Home, PopupHelper)
export class XrayHistory {

  rows=[];
  dialog=null;

  scrollHeight;//=0;

  constructor(helper, http, Data, Home, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.popHelper = PopupHelper;
  }

  activate(params) {
    var self = this;
    self.dialog = params.dialog;

    for(let i = 0; i < params.xrays.length; i++){
      let xRow = new XrayRow(params.xrays[i]);
      if(i%2!=0){
        xRow.altRow = true;
      }
      self.rows.push(xRow);
    }
  }

  openXray(studyId, xrayId){
    this.popHelper.openXrayPop(studyId, xrayId);
  }

  xrayChecked(row){
    let self = this;
    //set Type = XRAY...
    row.data.Type = 'XRAY';
    self.dialog.close(true, row);
  }

  attached(){
    let bodyHeight = this.xrayhx.clientHeight;
    let headerHeight = this.xheader.clientHeight;
    this.scrollHeight = bodyHeight - headerHeight;
  }

  cancel(){
    this.dialog.cancel();
  }

  // close(){
  //   this.dialog.close(true, this.rows);
  // }

  toggleThumbnails(r){
    r.toggleThumbnails();
  }
}
