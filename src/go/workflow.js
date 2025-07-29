import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';
import {DialogService} from 'aurelia-dialog';
import {Globals} from './globals';
import { WorkflowHelper } from './workflowHelper';

class PrefButton{
  constructor(name, data, visible, editing){
    this.name = name;
    this.data = data;
    this.selected = false;
    this.visible = visible == undefined ? false : visible;
    this.editing = editing ? editing : false;
  }

  select(){
    this.selected = this.selected ? false : true;
  }
}

class WorkflowRow{
  constructor(patientId, name, date, result){
    this.patientId= patientId;
    this.name= name;
    this.date=date;
    this.result=result;
    this.displayReason=false;
    this.status;
    this.reason;
  }

  toggleReason(){
    this.displayReason = this.displayReason ? false : true;
  }
}


@inject(helper,http, Data, Home, DialogService, Globals, WorkflowHelper)
export class Workflow {

  listHeight = 0;
  rows=[];
  @bindable datepicker;
  @observable flowdate;
  providerPref=null;
  providers=[];
  selectedProvider;
  displayPref=false;
  incompleteCount=0;

  displaySpinner = false;

  constructor(helper, http, Data, Home, DialogService, Globals, WorkflowHelper) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.globals = Globals;
    this.workflowHelper = WorkflowHelper;
    this.dialogService = DialogService;
  }

  activate(model){
    let self = this;

    //remove 'ALL' provider
    let tProviders=[]
    for(let i = 0; i < model.length; i++){
      if(i > 0){
        tProviders.push(model[i]);
      }
    }
    self.providers = tProviders;

    if(self.home.currentProvider){
      self.selectedProvider = self.home.currentProvider;
    }

    if(self.globals.workflowDate){
      self.flowdate = self.globals.workflowDate;
    }else{
      self.flowdate = moment().format('MM/DD/YYYY');
    }

    self.updateWorkflow(self.selectedProvider.ProviderID);

  }

  checkInitiateWorkflowForProvider(providerId, callback){
    let self = this;
    if(!self.workflowHelper.workflowInitiatedForProvider(providerId)){
      self.workflowHelper.initWorkflowForProvider(providerId, function(success){
        if(success){
          self.providerPref = self.workflowHelper.preferenceObject;
          callback();
        }});
    }else{
      self.providerPref = self.workflowHelper.preferenceObject;
      callback();
    }
  }

  updateWorkflow(providerId){
    let self = this;

    self.checkInitiateWorkflowForProvider(providerId, function(){

      let dt=null;
      if(self.flowdate){
        dt = moment(self.flowdate).format('MM/DD/YYYY');
      }else{
        dt = moment().format('MM/DD/YYYY');
      }
      self.flowdate = dt;

      self.workflowHelper.getWorkflow(providerId, dt, dt, function(res){
        self.rows = res.rows;
        self.home.updateWorkflowSidebarItemBadge(res.incompleteCount);
      });

    });
  }

  providerSelected(){
    let self = this;
    self.updateWorkflow(self.selectedProvider.ProviderID);

  }

  openProviderPref(){
    let self = this;

    //save preference before CLOSE...
    if(self.displayPref==true){
      self.savePreference();
    }

    self.displayPref = self.displayPref ? false : true;
  }

  savePreference(){
    let self = this;
    let url='workflow/pref';

    if(self.workflowHelper.workflowInitiatedForProvider(self.selectedProvider.ProviderID)){
      let saveObj = {
        ProviderID: self.selectedProvider.ProviderID
      };
      for(let i = 0; i < self.workflowHelper.preferenceObject.prefs.length; i++){
        let item = self.workflowHelper.preferenceObject.prefs[i];
        if(item.name == 'Document'){
          saveObj['OfficeNote']=item.selected;
        }else{
          saveObj[item.name]=item.selected;
        }
      }
  
      //do we have a pref yet???
      if(self.workflowHelper.preferenceObject.providerId==0){
        self.data.postWithUrlAndData(url, JSON.stringify(saveObj), function(res){
  
        });
      }else{
        self.data.putWithUrlAndData(url, saveObj, function(res){
  
        });
      }
    }
  }

  loadPatient(row){
    let self = this;
    self.home.loadPatientWithDate(row.patientId, row.date);
    self.home.toggleWorkflow();
  }

  flowdateChanged(newVal, oldVal){
    let self = this;
    let t = newVal;
    self.globals.workflowDate = newVal;
    if(self.selectedProvider){
      self.updateWorkflow(self.selectedProvider.ProviderID);
    }
  }

  openCalendar(){
    this.datepicker.methods.toggle();
  }



}
