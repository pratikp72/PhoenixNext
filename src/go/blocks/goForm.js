import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import moment from "moment";
import {Home} from '../home';
import {Data} from '../../data/go/data';
import {DialogService} from 'aurelia-dialog';
import * as _ from 'lodash';
import {PopupHelper} from "../popupHelper";
import {BindingSignaler} from 'aurelia-templating-resources';
import {EventAggregator} from 'aurelia-event-aggregator';

@inject(helper,http,Home, Data, DialogService, PopupHelper, BindingSignaler, EventAggregator)
export class GoForm {

  data=[];
  patientId;
  date;
  providerId;
  userId;
  bodypart;
  bodyside;
  board = null;
  block=null;

  viewPath="../../formbuilder/viewer";
  viewModel=null;
  description;

  goForms=[];
  selectedForm;

  constructor(helper, http, Home, Data, DialogService, PopupHelper, BindingSignaler, EventAggregator){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
    this.signaler = BindingSignaler;
    this.eventAggregator = EventAggregator;
  }

  activate(model){
    let self = this;
    self.block = model;
    self.block.childModel = this;

    //self.description = "Go Form";
    self.viewModel ={
      jwt: self.helper._jwt, 
      formId: null, //1035
      patientId: null, 
      providerId: null, 
      date: null, 
      instanceId: null, 
      showSubmit: true, 
      showSubmitAsToolbar: true,
      showPreferenceToolbar: true,
      blockInstanceId: self.block.id
    }
  }

  openFormPicker(){
    let self = this;

    let genericPicklistItems=[];
    for(let i = 0; i < self.goForms.length; i++){
      let pItm = self.goData.getGenericPicklistItem(self.goForms[i].Description, self.goForms[i]);
      genericPicklistItems.push(pItm);
    }
    self.popupHelper.openGenericPicklistPop("Select form to display...", 'Go Forms', genericPicklistItems, true, function (res) {
      self.loadGoForm(res.item.data.Id, null, self.patientId, self.providerId, self.date, res.item.data.Description);

      //update block goFormId...
      var blockToUpdate = _.find(self.board.blocks, function(b){return b.blockType == 'goForm' && b.id == self.block.id});
      blockToUpdate.goFormId = res.item.data.Id;

      self.goData.saveVisitBoard(self.board);
      self.board.hasChanged=false;

    });

  }

  attached(){

    var self = this;
    if(self.home.currentBoard != null &&
      self.home.currentBoard.patientId != null){

      self.board = self.home.currentBoard;

      self.patientId = self.home.currentBoard.patientId;

      //convert date to MM-DD-YYYY...
      var aDate = self.helper.parseSimpleDate(self.home.currentBoard.visitInfo.date, "MM/DD/YYYY");
      self.date = self.helper.getMMDDYYYYDateWithDate(aDate);
      //self.date = self.home.currentBoard.visitInfo.date;
      self.providerId= self.home.currentBoard.visitInfo.providerId;
      self.userId = self.home.currentBoard.userId;
      self.bodypart = self.home.currentBoard.visitInfo.bodypart;
      self.bodyside = self.home.currentBoard.visitInfo.bodyside;

      self.getGoForms(self.providerId);

      setTimeout(function(){
        self.load();
      }, 500);

      self.eventAggregator.subscribe('goform-viewer-loaded', function(frm){

        if(self.block.id && self.block.id != frm.blockInstanceId){
          return;
        }

        self.description = frm.form.Description;
      });

    }
  }

  getGoForms(providerId){
    let self = this;
    self.goData.getWithUrl(`goforms/provider?providerId=${providerId}`, function(res){
      self.goForms = res;
    });
  }

  loadGoForm(formId, instanceId, patientId, providerId, date, formDescription){
    let self = this;
    self.description = formDescription;

    self.viewModel ={
      jwt: self.helper._jwt, 
      formId: formId, 
      patientId: patientId, 
      providerId: providerId, 
      date: date, 
      instanceId: instanceId, 
      showSubmit: true, 
      showSubmitAsToolbar: true,
      showPreferenceToolbar: true,
      blockInstanceId: self.block.id
    }

    self.eventAggregator.publish("refresh-goform-viewer", self.viewModel);

  }


  detached(){
    this.trySave();
  }

  trySave(){
    var self = this;

    if(self.block.dontSave){
      return;
    }

    if(self.board != null) {
      self.home.saveQueue.addItem(self);
    }
  }

  load(){
    var self = this;
    self.loadGoForm(self.block.goFormId, self.block.goFormInstanceId, self.patientId, self.providerId, self.date, "");
  }

 
  save(callback){
    var self = this;
    callback(true);
  }


}
