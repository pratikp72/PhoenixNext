import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Data} from '../../data/go/data';
import {EventAggregator} from 'aurelia-event-aggregator';
import {PtPopup} from "../ptPopup";
import {DialogService} from 'aurelia-dialog';
import {Home} from '../home';
import {PxSearch} from "../pxSearch";
import {PopupHelper} from "../popupHelper";
import {TaskHelper} from '../task/taskHelper';
import {TaskPopup} from "../task/taskPopup";
import * as _ from 'lodash';
import {PreferenceHelper} from "../preferenceHelper";
import moment from "moment";
import {Router} from 'aurelia-router';


class PreferenceObj{
  constructor(description, id, data){
    this.description = description;
    this.data = data;
    this.prefId =id;
    this.isMap = false;
  }
}


@inject(helper,http,Data,EventAggregator, DialogService, Home, PopupHelper, TaskHelper, PreferenceHelper, Router)
export class VisitInfo {


  bodyparts;// = ['Foot','Ankle','Knee', 'Hip','Hand','Wrist', 'Elbow', 'Shoulder', 'Cervical', 'Lumbar'];
  selectedBodyPart;
  board;
  preferences=[];
  prefTypeButtonText = "Follow";
  providerId=0;
  displayPreference = false;

  prefTypes = ['Follow', 'Telemed', 'PT', 'OT'];
  prefTypeIndex = 0;
  patientName = null;
  locked = false;

  selectedPreference = null;
  preferenceCallbackCounter = 0;
  preferenceCallbackObjects=[];
  saveDialog=null;
  prefDropdownHeight=0;

  visitType;

  get userName() {
    return `${this.helper._user.FirstName} ${this.helper._user.LastName}`;
  }


  constructor(helper, http,Data,EventAggregator, DialogService, Home, PopupHelper, TaskHelper, PreferenceHelper, Router){
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.eventAggregator = EventAggregator;
    this.dialogService = DialogService;
    this.home = Home;
    this.popHelper = PopupHelper;
    this.taskHelper = TaskHelper;
    this.prefHelper = PreferenceHelper;
    this.router = Router;
  }


  activate(model) {

    var self = this;
    self.prefTypeIndex = 0;

    self.bodyparts = self.goData.bodyparts;

    self.locked = false;

    self.prefDropdownHeight =  window.innerHeight - 50;

    if(model == null)return;

    self.displayPreference = false;
    self.board = model;

    //set selectedBodyPart from visitInfo...
    if(self.board.visitInfo != null){
      self.selectedBodyPart = self.board.visitInfo.bodypart;

      self.board.visitInfo.selectedBodypart = self.goData.getBodypartSide(self.board.visitInfo.bodypart, self.board.visitInfo.bodyside)

      self.locked = self.board.visitInfo.locked;

      self.visitType = self.board.visitInfo.visitType;

      // self.txtCode = self.board.visitInfo.getDisplayedCode();
      if(self.board.visitInfo.visitCode!= null)
        self.selectedVisitCode = self.board.visitInfo.visitCode.Visit_Code_System;

      //select PT pref if visit type = PT...
      if(self.board.visitInfo.checkForPt(self.board.visitInfo.visitType)){
        var split_type = self.board.visitInfo.visitType.split(" ");
        if(split_type.length > 1){
          var vType = split_type[0].toLowerCase();
          if(vType === 'pt'){
            self.prefTypeIndex = 2;
          }else{
            self.prefTypeIndex = 3;
          }
        }else{
          self.prefTypeIndex = 2;
        }
      }

      //select telemed pref if visit type = telemed...
      if(self.board.visitInfo.visitType && self.board.visitInfo.visitType.toLowerCase() == 'telemed'){
        self.prefTypeIndex = 1;
      }
    }

    if(model.visitInfo != null && self.home.currentProvider != null &&
      self.home.currentProvider.hasOwnProperty('ProviderID')){
        self.displayPreference = true;
        self.providerId = self.home.currentProvider.ProviderID;
        self.filterExamPref(self.providerId);
        self.prefHelper.clearPreferenceObjects();
    }

    self.home.getPatientName(undefined, function(name){
      self.patientName = name;
    });

    self.eventAggregator.subscribe('filterPreferencesWithProviderAndType', function(obj){

      // let providerId = 0;
      // let type = '';

      for(let i = 0; i < self.prefTypes.length; i++){
        if(self.prefTypes[i] == obj.type){
          self.prefTypeIndex = i;
          self.filterExamPref(obj.providerId);
          break;
        }
      }
    });

  }

  logout(){
    this.router.navigate('#/login/login');
  }

  doHelp(e){
    e.stopPropagation();
    this.home.tryDriverSample();
  }

  taskCurrentObject(){
    var self = this;
    if(self.taskHelper.taskTypeId != 0){

      var taskObjectList=[];

      if(self.taskHelper.patientId){

        var taskPopupObject = self.goData.getNewTaskPopupObject(self.taskHelper.patientId, 
          self.board.visitInfo.providerId, 
          self.taskHelper.date, 
          self.taskHelper.objectId, 
          self.taskHelper.taskTypeId);
          taskObjectList.push(taskPopupObject);
      }else{


        //var todayDate = new Date();
        var dateStr =self.board.visitInfo.date;
        var provId = self.board.visitInfo.providerId;
        var taskPopupObject = self.goData.getNewTaskPopupObject(self.board.visitInfo.patientId, provId, dateStr, self.taskHelper.objectId, self.taskHelper.taskTypeId);
        taskPopupObject.patientName =self.faxes[faxIndex].data.Meta.PatientName;
        taskObjectList.push(taskPopupObject);
      }


      self.home.taskObjectList(taskObjectList, true);

    }else{
      //ALERT???
      self.popupHelper.openGenericMessagePop('Please select a taskable object', 'Task Error', ['OK'], false, function(res){
        //callback(res);
      });
    }
  }

  updateExisitingBlockTypes(boardType){
    let self = this;
    for(let i = 0; i < self.board.blocks.length; i++){
      let aBlock = self.board.blocks[i];
      if(aBlock.blockType === 'hpi'){
        aBlock.childModel.boardType = boardType;
        aBlock.childModel.data.HpiType = boardType;
      }else if(aBlock.blockType === 'plan'){
        aBlock.childModel.boardType = boardType;
        for(let p = 0; p < aBlock.childModel.data.length; p++){
          let aPlan = aBlock.childModel.data[p];
          aPlan.PlanType = boardType;
        }

      }else if(aBlock.blockType === 'exam'){
        aBlock.childModel.boardType = boardType;
        aBlock.childModel.data.TYPE = boardType;
      }
    }
  }

  openVisitPopup(){
    let self = this;
    self.popHelper.openCreateVisitPopup(self.board.visitInfo, self.home, function(res){

      let visitObj = res.visitObject;
      let visitType = visitObj.visitType;
      let bps = visitObj.bodyparts;


      let bodypartsString = self.goData.bodypartsToString(bps);

      var visitTypeChanged = false;
      if(self.board.visitInfo.visitCode.Visit_Type != visitType){
        visitTypeChanged = true;
      }

      var visitProviderChanged = false;
      var originalVisitCodeProviderId = self.board.visitInfo.visitCode.ProviderID;
      if(self.board.visitInfo.visitCode.ProviderID != visitObj.providerId){
        visitProviderChanged = true;
      }

      self.board.visitInfo.visitCode.Visit_Type = visitType;

      self.board.visitInfo.visitCode.VisitBodyParts = bodypartsString;

      self.board.visitInfo.visitCode.ProviderID = visitObj.providerId;
      self.board.providerId = visitObj.providerId;
      self.board.visitInfo.visitCode.BillingProvider = visitObj.billingProviderId;


      self.goData.updateVisitCode(self.board.visitInfo.visitCode, function(vcRes){
        self.visitType = visitType;

        self.board.visitInfo.visitType = visitType;
        self.board.visitInfo.bodyparts = bps;
  
        self.board.visitInfo.isPt = visitType.toLowerCase() == 'pt visit' ? true : false;

        //has visit type changed??? if so, check if we need to update
        //exam, plan, hpi types...
        if(visitTypeChanged){
          self.updateExisitingBlockTypes(self.board.visitInfo.isPt ? 'PT' : 'FOLLOW');
        }
   
        //update visit description w/ objectId and visitCodeId
        let visitToUpdate = _.find(self.home.patientVisits, function(v){return v.ObjectID == self.board.visitInfo.visitCodeId});
        if(visitToUpdate){
          visitToUpdate.Description = visitType;
          visitToUpdate.Part = bodypartsString;
          visitToUpdate.ProviderID = visitObj.providerId;
          visitToUpdate.ProviderName = self.home.getProviderName(visitObj.providerId);
        }

        if(visitProviderChanged){

          //update visit board provider...
          self.goData.saveVisitBoard(self.board, function(res){

            //update visit provider...
            var obj={
              'NewProviderID': visitObj.providerId,
              'ExistingProviderID': originalVisitCodeProviderId,
              'ExistingPatientID': self.board.visitInfo.visitCode.PatientID,
              'ExistingDate': moment(self.board.visitInfo.visitCode.ExamDateTime).format('MM-DD-YYYY')
            }
            self.goData.putWithUrlAndData('visit/changeprovider', obj, function(res){

              //set all blocks to locked so to NOT save current provider on blocks back to db...
              self.setBlocksToLocked(self.board.blocks);

              //reload visit...
              self.home.loadVisit(self.board.visitInfo);
            });


          });

        }else{
          //reload visit...
          self.home.loadVisit(self.board.visitInfo);
        }
      });

    });
  }

  setBlocksToLocked(blocks){
    for(let b = 0; b < blocks.length; b++){
      let aBlock = blocks[b];
      aBlock.dontSave = true;
    }
  }

  visitTypeClick(){
    let self = this;

    self.popHelper.showVisitTypePicker(function(visittype){

      self.board.visitInfo.visitCode.Visit_Type = visittype.description;
      self.goData.updateVisitCode(self.board.visitInfo.visitCode, function(vcRes){
        self.visitType = visittype.description;

        self.board.visitInfo.visitType = self.visitType;
  
        self.board.visitInfo.isPt = self.visitType.toLowerCase() == 'pt visit' ? true : false;
        
        //reload visit...
        self.home.loadVisit(self.board.visitInfo);

        //update visit description w/ objectId and visitCodeId
        let visitToUpdate = _.find(self.home.patientVisits, function(v){return v.ObjectID == self.board.visitInfo.visitCodeId});
        if(visitToUpdate){
          visitToUpdate.Description = self.visitType;
        }
      });

    });
  }

  // openProcedureSearch(){

  //   var self = this;
  //   const windowHeight = window.innerHeight;
  //   const windowWidth = window.innerWidth;

  //   self.popHelper.openProcedureSearchPop('VISIT', false, function(pxs){
  //     if(pxs != null){

  //       for(let i = 0; i < pxs.length; i++){
  //         var px = pxs[i]
  //         //add bodypart, bodyside
  //         px.bodypart = self.board.visitInfo.bodypart;
  //         px.bodyside = self.board.visitInfo.bodyside;
  //         //px.jcodeunits = 1;

  //         self.goData.saveProcedure(px, self.board.visitInfo.patientId, self.providerId, self.board.visitInfo.date, function(res){

  //           self.board.visitInfo.visitCode.Visit_Code_Selected = res.CptCode;

  //           self.goData.updateVisitCode(self.board.visitInfo.visitCode, function(vcRes){
  //             self.board.visitInfo.visitCode = vcRes;
  //           });
  //         });
  //       }

  //     }
  //   });
  // }

  togglePrefTypeClicked() {
    let self = this;

    var i = self.prefTypeIndex + 1;
    if(i == self.prefTypes.length){
      self.prefTypeIndex = 0;
    }else{
      self.prefTypeIndex = i;
    }
    self.filterExamPref(self.providerId);
  }

  filterPreferencesWithCurrentProvider(){
    this.filterExamPref(this.providerId);
  }

  doesPreferenceExist(description){
    for(let i = 0; i < this.preferences.length; i++){
      if(this.preferences[i].description == description){
        return true;
      }
    }
    return false;
  }

  filterExamPref(providerId){
    let self = this;
    self.preferences = [];

    self.board.visitInfo.selectedBodypart = self.goData.getBodypartSide(self.selectedBodyPart, self.board.visitInfo.bodyside)

    let selectedType = self.prefTypes[self.prefTypeIndex];

    if((selectedType == 'PT' || selectedType == 'OT') && self.home.displayDaysheet) {
      self.goData.getPtDaysheetPref(providerId, self.selectedBodyPart, function (prefs) {
        let unique = _.uniqBy(prefs, 'PrefDescription');
        for(var i = 0; i < unique.length; i++){
          if(!self.doesPreferenceExist(unique[i].PrefDescription)){
            var aPref = new PreferenceObj(unique[i].PrefDescription, unique[i].PrefID, unique[i]);
            self.preferences.push(aPref);
          }
        }
      });
    }else{
      self.goData.getFollowUpPrefsAndMaps(providerId, self.selectedBodyPart, selectedType, function(prefsMaps){
        self.buildPreferenceObjectsForPostOpMaps(prefsMaps);
      });
    }
  }


  buildPreferenceObjectsForPostOpMaps(prefsMaps){
    let self = this;
    let prefs = prefsMaps.prefs;
    let maps = prefsMaps.maps;
    let suppressed = prefsMaps.suppressed;

    //remove suppresed prefs
    for(let s = 0; s < suppressed.length; s++){
      let foundIndex = _.findIndex(prefs, function(p){ return p.PostOpID == suppressed[s].PostOpID});
      //var replaceWith = new PreferenceObj(suppressed[i].PostOpProcedure, suppressed[i].PostOpID, suppressed[i]);
      let oMap = _.find(maps, function(m){return m.Id == suppressed[s].SuppressWithMapId});
      if(oMap && foundIndex > -1){
        oMap.isMap = true;
        prefs.splice(foundIndex, 1,oMap);//remove pref...
        //maps.splice(s, 1);//remove overwritten map...
        _.remove(maps, function(m){return m.Id == oMap.Id});
      }
    }

    for(var i = 0; i < prefs.length; i++){
      if(!self.doesPreferenceExist(prefs[i].PostOpProcedure)) {
        var aPref =null;
        if(!prefs[i].isMap){
          aPref = new PreferenceObj(prefs[i].PostOpProcedure, prefs[i].PostOpID, prefs[i]);
        }else{
          aPref = new PreferenceObj(prefs[i].Description, prefs[i].Id, prefs[i]);
          aPref.isMap = true;
        }

        self.preferences.push(aPref);
      }
    }

    for(var i = 0; i < maps.length; i++){
      var aMap = new PreferenceObj(maps[i].Description, maps[i].Id, maps[i]);
      aMap.isMap = true;
      self.preferences.push(aMap);
    }
  }

  preferenceClick(pref){
    var self = this;

    if(self.locked)return;

    self.selectedPreference =pref;

    if(self.home.displayDaysheet && pref.data.PrefID != null){
      self.eventAggregator.publish('preferenceMessage', {message:'load', prefId:pref.data.PrefID});
    }else{
      self.prefHelper.populatePreference(pref, self.board);
    }
  }

  getSelectedFollowupPrefData(){
    let self = this;
    //save regular pref....
    let prefType = self.prefTypes[self.prefTypeIndex];
    //get each block...
    let hpiBlock = self.board.getBlockWithType('hpi');
    let examBlock = self.board.getBlockWithType('exam');
    let planBlock = self.board.getBlockWithType('plan');
    let hpiTxt, examTxt, planTxt;
    if(hpiBlock){
      //let hpiData = hpiBlock.data;
      let hpiEl = hpiBlock.element;
      hpiTxt =$(hpiEl).find('textarea').val();
    }
    if(examBlock){
      //let examData = examBlock.data;
      let examEl = examBlock.element;
      examTxt =$(examEl).find('textarea').val();
    }
    if(planBlock){
      //let hpiData = hpiBlock.data;
      let planEl = planBlock.element;
      planTxt =$(planEl).find('textarea').val();
    }

    return{
      type: prefType,
      hpiText: hpiTxt,
      planText: planTxt,
      examText: examTxt
    }
  }

  openPreferenceEditor(){
    let self = this;

    let path = './preference/preferenceEditor';
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let eights = windowWidth / 8;

    // let width = quarter * 2;
    // let left = quarter;// / 2;
    let width = eights * 6;
    let left = eights;// / 2;

    let height = windowHeight - 10;
    let top = 0;

    let options={
      displayHeader: false,
      bodyPadding: 0
    }

    self.popHelper.openViewModelPop(path, self, "", width, height, top, left, options, function(res){

    });
  }

  createNewPrefClick() {
    let self = this;
    let pref = self.selectedPreference;
    let postOpId = 0;
    if(pref != null && pref.data.hasOwnProperty('PostOpID')){
      postOpId = pref.data.PostOpID;
    }

    let bp = self.selectedBodyPart;
    if(!bp){
      self.popHelper.openGenericMessagePop('Please select a bodypart for preference.', 'Save Preference Requirements', ['OK'], true, function(res){

      });
      return;
    }


    //DAYSHEET PREF SAVE...
    self.popHelper.openGenericInputPop('Create New Preference', ['Description'],null,false,
      function (res) {
        if (self.home.displayDaysheet) {
          //pref.description = res.value;
          self.eventAggregator.publish('preferenceMessage', {message:'create', prefId:postOpId, description: res.inputs[0].value, bodypart: self.selectedBodyPart});
        }else{
          //save regular pref....
          let hpiTxt, examTxt, planTxt, prefType;

          let prefData = self.getSelectedFollowupPrefData();
          hpiTxt = prefData.hpiText;
          planTxt = prefData.planText;
          examTxt = prefData.examText;
          prefType = prefData.type;

          let saveDetail = 'Saving ' + res.inputs[0].value + " Preference...";
          self.saveDialog = self.helper.createNoty(saveDetail, 3000);
          self.saveDialog.show();

          let fuPrefObj = self.createFollowUpPrefObject(self.providerId, self.selectedBodyPart, prefType, res.inputs[0].value, hpiTxt, examTxt, planTxt, postOpId);
          self.goData.saveFollowUpPref(fuPrefObj, function(res){

            self.saveDialog.close();
            self.saveDialog = null;

          });
        }
      }
    );
  }


  createFollowUpPrefObject(providerId, bodypart, type, prefDescription, hpiText, examText, planText, postopId){

    let preference = {
      ProviderID: providerId,
      BodyPart: bodypart,
      Type: type,//'Telemed',
      PostOpProcedure: prefDescription,
      NoteHistory: hpiText,
      NoteExam: examText,
      NotePlan: planText,
      Timeframe: '',
      visitCode: '',
      PostOpID: postopId
    };

    return preference;
  }

  savePreferenceClick() {
    let self = this;
    let pref = self.selectedPreference;
    let bp = self.selectedBodyPart;
    let errTxt = "";
    if(!pref){
      errTxt = 'Please select preference to update. '
    }
    if(!bp){
      errTxt += 'Please select a bodypart for preference.'
    }

    if(errTxt.length > 0){
      self.popHelper.openGenericMessagePop(errTxt, 'Save Preference Requirements', ['OK'], true, function(res){

      });
      return;
    }


    let postOpId= pref.data.PostOpID;
    if (self.home.displayDaysheet) {
      self.eventAggregator.publish('preferenceMessage', {message:'update', prefId:postOpId, description: pref.description, bodypart: bp});
    }else{
      //update regular pref...
      let hpiTxt, examTxt, planTxt, prefType;
      let prefData = self.getSelectedFollowupPrefData();
      hpiTxt = prefData.hpiText;
      planTxt = prefData.planText;
      examTxt = prefData.examText;
      prefType = prefData.type;

      let saveDetail = 'Saving ' + pref.description + " Preference...";
      self.saveDialog = self.helper.createNoty(saveDetail, 3000);
      self.saveDialog.show();

      let fuPrefObj = self.createFollowUpPrefObject(self.providerId, bp, prefType, pref.description, hpiTxt, examTxt, planTxt, postOpId);
      self.goData.updateFollowUpPref(fuPrefObj, function(res){

        self.saveDialog.close();
        self.saveDialog = null;

      });

    }
  }

  // openPtForPatient() {
  //   var self = this;
  //
  //   if (self.home.displayDaysheet) {
  //     return;
  //   }
  //
  //   let vi = self.board.visitInfo;
  //   self.home.daysheetParams = {
  //     patientid: vi.patientId,
  //     providerid: vi.providerId,
  //     bodypart: vi.bodyparts[0].part,
  //     userid: self.home.currentBoard.userId,
  //     visitdate: vi.date,
  //     type: 'PT',
  //     displayCloseButton: true,
  //     parent: self.home
  //   }
  //   self.home.displayDaysheet = true;
  //
  //   //filter PT...
  //   self.prefTypeIndex = 2;//PT...
  //   self.filterPreferencesWithCurrentProvider();
  // }

  // filterPreferencesForPt(){
  //   let self = this;
  //   //filter PT...
  //   self.prefTypeIndex = 2;//PT...
  //   self.filterPreferencesWithCurrentProvider();
  // }


  getPreviousExam(){
    var self = this;
    self.data.getPreviousExamData(self.patient.data.PatientID, self.selectedBodyPart, self.date, function(res){

      //check if we have existing exam data...
      //if so, take existing Id's and add them to prior visit data
      if(self.examData != null){
        res.exam.PostOpID = self.examData.PostOpID;
      }
      if(self.historyData != null){
        res.hpi.HPIID = self.historyData.HPIID;
      }
      if(self.planData != null){
        res.plan.PlanID = self.planData.PlanID;
      }

      //update providerId
      res.plan.ProviderID = self.selectedProvider.ProviderID;
      res.exam.ProviderID = self.selectedProvider.ProviderID;
      res.hpi.ProviderID = self.selectedProvider.ProviderID;

      self.examData = res.exam;
      self.planData = res.plan;
      self.historyData = res.hpi;


      self.resize();

      //self.saveFollowup(self.examData, self.planData, self.historyData);
    });
  }

}
