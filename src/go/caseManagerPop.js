import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import moment from "moment";
import {Home} from './home';
import {Data} from '../data/go/data';
import * as _ from 'lodash';
//import { Globals } from './globals';
import {observable} from "aurelia-binding";

@inject(helper,http,Home, Data)
export class CaseManagerPop {

  bodysides=['Right', 'Left'];
  statusList=['ACTIVE'];
  providers=[];
  bodyparts;// = ['Ankle','Knee', 'Hip', 'Wrist', 'Elbow', 'Shoulder', 'Cervical', 'Lumbar'];
  casedate;
  @bindable casedatepicker;
  injurydate;
  @bindable injurydatepicker;
  selectedProvider;

  caseData=null;

  constructor(helper, http, Home, Data){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
  }

  cancel(){
    this.dialog.cancel();
  }

  close(){

    if(this.selectedProvider == null){
      //TODO ALERT???
      return;
    }

    //update date from picker...
    this.caseData.ProviderID = this.selectedProvider.ProviderID;
    this.caseData.CaseDate = this.casedate;
    this.caseData.DateInjury = this.injurydate;

    this.dialog.close(true, this.caseData);
  }

  delete(){
    this.close();
  }

  openInjuryCalendar(){
    this.injurydatepicker.methods.toggle();
  }

  openCaseCalendar(){
    this.casedatepicker.methods.toggle();
  }

  activate(model){
    let self = this;
    self.caseData = model.data;
    self.providers = model.providers;

    self.dialog = model.dialog;

    self.bodyparts = self.goData.bodyparts;

    //select provider...
    for(let p = 0; p < self.providers.length; p++){
      if(self.providers[p].ProviderID == self.caseData.ProviderID){
        self.selectedProvider = self.providers[p];
        break;
      }
    }

    //check fo NEW authorization...
    if(self.caseData.CaseID==0){
      self.casedate = moment().format('MM/DD/YYYY');
      self.caseData.State = 'ACTIVE';
    }else{
      self.casedate = moment(self.caseData.CaseDate).format('MM/DD/YYYY');
      self.injurydate = moment(self.caseData.DateInjury).format('MM/DD/YYYY');
    }
  }
}
