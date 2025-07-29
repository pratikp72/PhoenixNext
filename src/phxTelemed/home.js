/**
 * Created by montymccune on 10/15/18.
 */
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Data} from './data';
import * as _ from 'lodash';
import moment from 'moment';
import {AlertPopup} from "../ptdaysheet/alertPopup";
import {DxSearch} from '../phxTelemed/dxSearch';
import {DialogService} from 'aurelia-dialog';
import {PreferenceBuilder} from "./preferenceBuilder";
import {PxSearch} from '../phxTelemed/pxSearch';
import {PatientSearch} from '../phxTelemed/patientSearch';
import {Task} from '../phxTelemed/task';
import {DialogView} from '../phxTelemed/dialogView';
import {CreateVisitPopup} from '../phxTelemed/createVisitPopup'
import {DocumentPopup} from '../phxTelemed/documentPopup';
import {Router} from 'aurelia-router';
import { observable } from 'aurelia-framework';



@inject(helper,http, Data, DialogService, Router )
export class Home {

  displaySchedule=false;
  displayVideo=false;
  mainScreenClass='col-md-12';
  appClass='';
  schedule=[];
  meds=[];
  allergies=[];
  surgery=[];
  orders=[];
  patient = null;
  visitDates=[];
  patientDocuments=[];


  // provider=null;
  date = null;

  //examData=null;

  @observable({ changeHandler: 'examChanged' })
  examData=null;
  @observable({ changeHandler: 'planChanged' })
  planData=null;
  @observable({ changeHandler: 'historyChanged' })
  historyData=null;


  webdocs=[];
  selectedWebdoc;


  followupPrefs=[];
  quickOrderPrefs=[];
  selectedFollowUpPref=null;
  selectedQuickOrderPref=null;
  examScrollBodyHeight;
  orderScrollbodyHeight;
  examTextareaHeight;
  contentBodyHeight;
  lapsedTime=0;
  lapsedTimeDisplay=null;
  billableTimer = null;
  billingCode=null;
  patientId=null;
  displayMeds = true;
  selectedBodyPart='knee';
  bodyparts=[];
  providers=[];
  selectedProvider=null;
  filterScheduleByTelemed=true;
  selectedCode=null;
  patientDxs=[];
  macros=[];
  caratPosition=-1;
  selectedTextarea=null;
  middleColumnRowHeight = 0;
  isAttached = false;
  needsSavingFollowup = false;
  needsSavingDx = false;
  needsSavingPx = false;
  followupSaveTimeout = null;
  scheduleHeight = 0;
  prefTypeButtonText = 'Telemed';
  popupWidth = 0;
  popupHeight = 0;
  refreshHistoryTree = false;
  loadRequirements = [];

  desktopVersion = true;

  containerTop = 56;

  windowHeight = 0;
  dropdownHeight = 0;

  //tryToggleSchedule=null;

  constructor(helper, http, Data, DialogService, Router){
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.dialogService = DialogService;
    this.router = Router;
  }

  activate(params) {

    let self = this;

    self.patient = new self.data.getPatientEmpty();

    self.bodyparts.push('Ankle','Knee', 'Hip', 'Wrist', 'Elbow', 'Shoulder', 'Cervical', 'Lumbar');
    self.macros.push("[he/she]", '[his/her]', '[him/her]', '[patient]', '[side]', '[postopdays]','[age]', '[gender]','[current provider]', '[hand dominance]');

    if(typeof this.helper.jwt() === 'undefined' ||
      this.helper.jwt() == null){

      //if we find an API key in the query string
      //we need to re-authenticate to make sure it is still valid
      if (params.hasOwnProperty("jwt")){
        this.helper.processToken(params.jwt);
      }

      if (params.hasOwnProperty("date")){
        self.date = params.date;
      }

      if(params.hasOwnProperty("bodypart")){
        self.selectedBodyPart = params.bodypart;
      }else{
        self.selectedBodyPart = 'Knee';
      }
      const bp=self.selectedBodyPart;


      // self.loadScheduledProviders(function(){
      //
      //   //set selectedProvider
      //   let sProvider = _.find(self.providers, function(p){return p.ProviderID == params.providerid});
      //   self.selectedProvider = sProvider;
      //   self.checkLoadRequirements('providers');
      //
      // });

      self.refreshScheduledProviders(function(){

      });




      if (params.hasOwnProperty("providerid")){
         self.provider= params.providerid;

        // self.loadScheduledProviders(function(){
        //
        //   //set selectedProvider
        //   let sProvider = _.find(self.providers, function(p){return p.ProviderID == params.providerid});
        //   self.selectedProvider = sProvider;
        //   self.checkLoadRequirements('providers');
        //
        // });

        self.data.getSchedule(params.providerid, true, function(r){//self.provider
          self.schedule = r;

            let sProvider = _.find(self.providers, function(p){return p.ProviderID == params.providerid});
            self.selectedProvider = sProvider;

          self.filterExamPref(params.providerid);
          self.checkLoadRequirements('schedules');

        });
      }

      if (params.hasOwnProperty("patientid")){
        self.patientId = params.patientid;
      }

      // if (params.hasOwnProperty("showtoolbar")){
      //   self.toolbarVisible = params.showtoolbar;
      // }

       self.loadDataForSelectedSchedule(self.patientId, self.date, self.provider);

      // let codes = self.data.getEncounterCodes();
      // self.providerCodes = codes.provider;
      // self.nonProviderCodes = codes.nonProvider;

      self.data.checkForProcedureCode(self.provider, self.date, self.patientId, (foundCode) => {
        if(foundCode){

          var px ={
            "id": foundCode.PatientCPTID,
            "selected": false,
            "code": foundCode.CptCode,
            "description": foundCode.CodeDescr,
            "data": foundCode
          };
          self.selectedCode = px;
        }
      });
    } else {
      //if we already have the apiKey we dont need to authenticate
      //mustAuthenticate = false;
    }

    window.addEventListener('resize', function(event) {
      self.resize();
    }, true);

    document.addEventListener('load', function(event) {
      self.resize();
    }, true);

    //self.tryToggleSchedule = Home.prototype.toggleSchedule;

    //window.tryToggleSchedule = Home.prototype.toggleSchedule;

    self.getDrFirstUrl();

    //this.hidetoolbar();

    //this is a test

  }


  examChanged(newValue, oldValue){

    if(newValue && newValue.hasOwnProperty("loading"))return;

    if(newValue && !newValue.hasOwnProperty("PostOpID"))return;

    var save = false;

    if(newValue != null && newValue != undefined){
      if(oldValue = null || oldValue == undefined){
        save = true;
      }else if(newValue.ChartNoteExam != oldValue.ChartNoteExam){
        save = true;
      }
    }

    if(save){
      this.examData.ChartNoteExam = newValue.ChartNoteExam;
      //save changes here...
      this.saveFollowup(this.examData, null, null);
    }

  }

  planChanged(newValue, oldValue){

    if(newValue && newValue.hasOwnProperty("loading"))return;

    if(newValue && !newValue.hasOwnProperty("PlanID"))return;

    var save = false;

    if(newValue != null && newValue != undefined){
      if(oldValue = null || oldValue == undefined){
        save = true;
      }else if(newValue.PlanText != oldValue.PlanText){
        save = true;
      }
    }

    if(save){
      this.planData.PlanText = newValue.PlanText;
      //save changes here...
      this.saveFollowup(null, this.planData, null);
    }
  }

  historyChanged(newValue, oldValue){

    if(newValue && newValue.hasOwnProperty("loading"))return;

    if(newValue && !newValue.hasOwnProperty("HPIID"))return;

    var save = false;

    if(newValue != null && newValue != undefined){
      if(oldValue = null || oldValue == undefined){
        save = true;
      }else if(newValue.HpiText != oldValue.HpiText){
        save = true;
      }
    }

    if(save){
      this.historyData.HpiText = newValue.HpiText;
      //save changes here...
      this.saveFollowup(null, null, this.historyData);
    }
  }

  getDrFirstUrl(){
    //webkit.messageHandlers.launchDrFirst.postMessage(value);
    var self = this;
    var patId = self.patient.data.PatientID;
    var screen = patId == "" ? "message" : "patient";
    var url = "drfirst/url?screen="+ screen + "&userId=" + self.helper._user.ErxUserID + "&patientId=" + patId;
    self.http.get(self.helper.getApiUrl(url), function (res) {
      if(webkit != undefined){

        var url ={'url': res}

        webkit.messageHandlers.launchDrFirst.postMessage(url);
      }
    }, function (err) {

    });
  }


  hidetoolbar(){
    this.desktopVersion = false;
    this.contentBodyHeight = this.contentBodyHeight + this.containerTop;
    this.containerTop = 0;
    this.appClass = 'ipad';
    this.resize();
  }

  refreshScheduledProviders(callback){
    let self = this;
    self.loadScheduledProviders(function(){

      //set selectedProvider
      // let sProvider = _.find(self.providers, function(p){return p.ProviderID == params.providerid});
      // self.selectedProvider = sProvider;
      // self.checkLoadRequirements('providers');
        if(callback){
          callback();
        }
    });
  }

  checkLoadRequirements(requirement) {
    let self = this;

    self.loadRequirements.push(requirement);

    if(self.loadRequirements.indexOf('providers') > -1
    && self.loadRequirements.indexOf('schedules') > -1){

      self.loadDataForSelectedSchedule(self.patientId, self.date, self.provider);

    }

  }

  togglePrefTypeClicked(optionalType) {
    let self = this;

    if(optionalType != undefined){
      self.prefTypeButtonText = optionalType;
    }else{
      if(self.prefTypeButtonText === 'Telemed'){
        self.prefTypeButtonText = 'Follow';
      } else {
        self.prefTypeButtonText = 'Telemed';
      }
    }
    self.filterExamPref();
  }

  formatDate(date){
    if(date === null)return "";

    console.log('FORMAT DATE', date);
    return moment(date).format("MM-DD-YYYY");
  }

  medsTabClicked(medsClicked){
    this.displayMeds = medsClicked;
  }

  loadPatientFromVisitCode(vc){
    var dt = this.formatDate(vc.ExamDateTime);
    this.loadDataForSelectedSchedule(vc.PatientID, dt, vc.ProviderID);
  }

  loadDataForSelectedSchedule(patientId, date, providerId) {
      let self = this;

      //clear out all data...
    self.visitDates=[];
    self.meds=[];
    self.surgery=[];
    self.allergies=[];
    self.orders=[];
    //self.examData=null;

    self.examData=null;
    self.planData=null;
    self.historyData=null;

    self.selectedCode=null;
    self.patientDxs=[];


      self.provider = providerId == undefined ? self.selectedProvider.ProviderID : providerId;
      self.patientId = patientId;
      self.data.getPatient(self.patientId, function(p){
        self.patient = p;
        self.date = date;
        self.resize();

        self.data.getAllVisitCodeForPatient(self.patient.data.PatientID, function(vcs){
          self.visitDates = vcs;
        });

        self.data.getDocumentsForPatientAndDate(self.patient.data.PatientID, date, function(docs){
          self.patientDocuments = docs;
        });

        self.data.getPatientMeds(self.patient.data.PatientID, function(res){
          self.meds = res;
        });
        self.data.getPatientSurgeries(self.patient.data.PatientID, function(res){
          self.surgery = res;
        });
        self.data.getPatientAllergies(self.patient.data.PatientID, function(res){
          self.allergies = res;
        });
        self.data.getOrders(self.patient.data.PatientID, function(res){
          self.orders = res;
        });


        if(self.provider != null || self.provider != undefined){
          self.data.getExamData(self.patient.data.PatientID, self.provider, date, function(res){


            //set prefTypeButtonText = res.exam.TYPE
            var examType = res.exam.TYPE.toUpperCase();
            //default to FOLLOW if TYPE is neither...
            if(examType != 'TELEMED' && examType != 'FOLLOW'){
              examType = 'FOLLOW';
            }
            self.togglePrefTypeClicked(examType);


            //add loading property to each object to prevent save on load...
            var loadingExam = res.exam;
            loadingExam['loading']=true;

            var loadingPlan =res.plan;
            loadingPlan['loading']=true;

            var loadingHx =res.hpi;
            loadingHx['loading']=true;

            self.examData = loadingExam;
            self.planData = loadingPlan;
            self.historyData = loadingHx;

            self.resize();
          });

          self.data.checkForProcedureCode(self.provider, self.date, self.patientId, (foundCode) => {
            if(foundCode){
              var px ={
                "id": foundCode.PatientCPTID,
                "selected": false,
                "code": foundCode.CptCode,
                "description": foundCode.CodeDescr,
                "data": foundCode,
                "modifier": foundCode.Modifier,
              };
              self.selectedCode = px;
            }else{
              self.selectedCode = null;
            }
          });
        }

        self.data.getDiagnosis(self.patient.data.PatientID, function(res){
          self.patientDxs = res;
        });

      });
  }

  resize(){
    let self = this;

    if(!self.isAttached){
      return;
    }

    const pr = self.patientRow;
    const er = self.examRow;
    const nb = self.navbar;
    self.windowHeight = window.innerHeight;
    self.dropdownHeight = Math.floor(window.innerHeight * .4);
    const windowHeight = window.innerHeight;
    const navHeight = nb.clientHeight;// nb.clientHeight == 0 ? 58 : nb.clientHeight;

    let boxMargin = 10;
    let boxHeaderHeight = 44;

    if(nb.clientHeight == 0){
      const mHead = self.medHead;
      const dHead = self.dxHead;

      var usableHeight = windowHeight - (boxMargin * 4) - mHead.clientHeight - dHead.clientHeight -3;
      this.middleColumnRowHeight = usableHeight / 3;
      //this.middleColumnRowHeight = ((windowHeight - mHead.clientHeight - dHead.clientHeight) / 3) - (boxMargin * 4);
    }
    else{
      this.middleColumnRowHeight = (windowHeight / 3) - (boxMargin * 2) - boxHeaderHeight; // - navHeight;
    }

      self.scheduleHeight = windowHeight - 125;


      if(nb.clientHeight == 0){
        this.contentBodyHeight = windowHeight + navHeight;
      }else{
        this.contentBodyHeight = windowHeight - navHeight;
      }

      const diff = this.contentBodyHeight - pr.clientHeight;
      this.examScrollBodyHeight = diff - 5;

    // const mr = self.medrow;
    // const sr = self.surgeryrow;
    // const  dr = self.dxrow;

    //resize text areas
    const eHead = self.examHead;
    const eLable = self.examLable;
    const eBody = self.examBody;
    var usableExamHeight = eBody.clientHeight - (eLable.clientHeight * 3) - eHead.clientHeight;
    self.examTextareaHeight = usableExamHeight / 3;
  }

  attached(){
    let self = this;
    self.isAttached = true;

    self.resize();
  }

  detached(){}

  timerClicked(){
    if(this.billableTimer != null){
      window.clearInterval(this.billableTimer);
      this.billableTimer = null;
      //tdo something with lapsed time here
    }else{
      this.billableTimer = window.setInterval(this.timerTick, 1000, this);
    }
  }

  timerTick(a) {
    a.lapsedTime += 1;

    var duration = moment.duration(a.lapsedTime * 1000);
    var dSec = duration.get('seconds');
    var dMin = duration.get('minutes');
    var dHr = duration.get('hours');
    var time = moment().set({'hour': dHr, 'minute':dMin, 'second': dSec});
    var format="";
    if(dHr > 0){
      format = "hh:";
    }
    if(dMin > 0){
      format += "mm:";
    }

    format += dMin > 0 ? "ss" : ":ss";

    a.lapsedTimeDisplay = time.format(format);
    a.calculateBillingCodeByTime("PRO");

  }

  calculateBillingCodeByTime(providerLicenseType){
      var duration = moment.duration(this.lapsedTime * 1000);
      var dMin = duration.get('minutes');
      if(dMin > 4 && dMin < 11){
        this.billingCode = providerLicenseType == "PRO" ? 99441 : 98966;
      }
      if(dMin > 10 && dMin < 21){
        this.billingCode = providerLicenseType == "PRO" ? 99442 : 98967;
      }
      if(dMin > 21){
        this.billingCode = providerLicenseType == "PRO" ? 99443 : 98968;
      }
  }

  insertQuickOrderPref(){
    var p = this.selectedQuickOrderPref;
    var self = this;

    self.data.getNewOrder(function(oRes){

      var o = oRes;
      o.DateCollect = self.date;
      o.PatientID = self.patient.data.PatientID;
      o.ProviderID = self.provider;

      self.orders.push();

    });
  }

  insertFollowUpPref(){

    const p = this.selectedFollowUpPref;
    const self = this;

    //this.selectedFollowUpPref = null;

    let prefData = {
      preferenceId: p.PostOpID,
      patientId: self.patient.data.PatientID,
      providerId: self.selectedProvider.ProviderID,
      examDateTime: self.date,
    };

    self.data.getPopulatedPreference(prefData, (populatedPreferenceData) => {

      self.data.getNewExam(function(eRes){
        let newExam = eRes;

        if(self.examData && (self.examData.PostOpID > 0)) {
          newExam = self.examData;
        }
        newExam.ChartNoteExam = populatedPreferenceData.NoteExam;
        //add new exam to local object
        self.examData= newExam;

        self.data.getNewHpi(function(hRes){
          let newHpi = hRes;
          if(self.historyData && (self.historyData.HPIID > 0)){
            newHpi = self.historyData;
          }

          newHpi.HpiText = populatedPreferenceData.NoteHistory;
          self.historyData = newHpi;

          self.data.getNewPlan(function(pRes){
            let newPlan = pRes;
            if(self.planData && (self.planData.PlanID > 0)){
              newPlan = self.planData;
            }

            newPlan.PlanText = populatedPreferenceData.NotePlan;
            self.planData = newPlan;

            self.refreshHistoryTree = true;

            //self.saveFollowup(self.examData, self.planData, self.historyData);

          });
        });
      });
    });
  }

  toggleSchedule(){
    this.displaySchedule = this.displaySchedule ? false : true;
    if(this.displaySchedule){
      this.displayVideo = false;
    }
    this.mainScreenClass = this.displaySchedule ? 'col-md-9' : 'col-md-12';

    this.refreshScheduledProviders();

    this.resize();
  }

  saveFollowup(examData, planData, historyData) {
      let self = this;
      let conditionCounter = 0;

      var proId = self.provider;// == undefined ? self.selectedProvider.ProviderID : self.provider;
    if(proId == null || proId == undefined){
      proId = self.selectedProvider.ProviderID;
    }

    self.data.saveExamData(examData, planData, historyData, proId, self.date, self.patient.data.PatientID, self.selectedBodyPart, self.prefTypeButtonText, () => {
      conditionCounter++;
      if(conditionCounter === 3){
        if(self.refreshHistoryTree){
          self.refreshHistoryTree = false;
          let bridge = self.getBoundObject();
          if(typeof bridge !== 'undefined'){
            setTimeout(() => {
              bridge.phxTelemed_refreshHistoryTree(self.patientId);
            }, 10);
          }
        }
      }
    });
    //if(callback) callback();
  }

  saveDiagnoses(callback) {
      let self = this;
    let selectedDiagnoses = self.patientDxs.filter((item) => {
      return item.selected === true;
    });

    console.log('SELECTED DIAGNOSES', selectedDiagnoses);

    let formattedDate = moment(self.date).format();
    console.log('self.date formatted', formattedDate);
    console.log('self.date', self.date);

    let addedDiagnoses = [];
    for(let i = 0; i< selectedDiagnoses.length; i++){
      let current = selectedDiagnoses[i];

      let patientDx = {};

      if(current.data.PatientDxCode){

        patientDx = {
          PatientDxDescription: current.data.PatientDxDescription,
          PatientDxCode: current.data.PatientDxCode,
          ExamDateTime: formattedDate,
          PatientID: self.patient.data.PatientID,
          ProviderID: self.selectedProvider.ProviderID,
          UserID: self.helper._user.UserID,
          Status: 'A',
          FromIcd10First: 0,
          DateCreated: moment().format(),
          DateModified: moment().format()
        };

      } else {

        patientDx = {
          PatientDxDescription: current.data.Description,
          PatientDxCode: current.data.DxKey,
          ExamDateTime: formattedDate,
          PatientID: self.patient.data.PatientID,
          ProviderID: self.selectedProvider.ProviderID,
          UserID: self.helper._user.UserID,
          Status: 'A',
          FromIcd10First: 0,
          DateCreated: moment().format(),
          DateModified: moment().format()
        };

      }

      addedDiagnoses.push(patientDx);
    }

    self.data.saveAddedDiagnoses(addedDiagnoses, (returnData) => {
      for(let i = 0; i < self.patientDxs.length; i++){
        let current = self.patientDxs[i];
        current.selected = false;
        self.needsSavingDx = false;
      }
      self.helper.createNotySuccess('Added Diagnoses Saved Successfully!');
      if(callback) callback();
    });

  }

  deleteExamData(){
      const self = this;

      let result = confirm('Are you sure you want to delete the exam data?');
      console.log('CONFIRM', result);

      if(!result) {
        return;
      }

      //data has not been saved, just clear out object...
    if(self.examData.PostOpID == 0 &&
    self.historyData.HPIID == 0 &&
    self.planData.PlanID == 0){
      self.examData = null;
      self.historyData = null;
      self.planData = null;
      return;
    }

      let conditionCounter = 0;
      self.data.deleteExamData(self.examData, self.planData, self.historyData, () => {
          conditionCounter++;
          if(conditionCounter === 3){
            self.helper.createNotySuccess('Deleted exam data.');
            self.examData = null;
            self.historyData = null;
            self.planData = null;
            let bridge = self.getBoundObject();
            if(typeof bridge !== 'undefined'){
              console.log('CALLING REFRESH HISTORY TREE!');
              bridge.phxTelemed_refreshHistoryTree(self.patientId);
            }
          }
      });
  }

  deleteExamDataNoConfirm() {

  }

  saveProcedure(callback) {
    let self = this;


    let tPatCptID = 0;
    if(self.selectedCode.data && self.selectedCode.data.PatientCPTID){
      tPatCptID = self.selectedCode.data.PatientCPTID;
    }

    let patientPx = {
      CptCode: self.selectedCode.code,
      CodeDescr: self.selectedCode.description,
      PatientID: self.patient.data.PatientID,
      ProviderID: self.selectedProvider.ProviderID,
      ExamDateTime: moment(self.date).format(),
      UserID: self.helper._user.UserID,
      Type: 'Visit',
      BodyPart: 'ALL',
      Modifier: self.selectedCode.modifier,
      PatientCPTID : tPatCptID,
      ProcedureID: self.selectedCode.id
    };

    if(patientPx.PatientCPTID == 0){
      self.data.saveSelectedCode(patientPx, (returnData) => {
        self.needsSavingPx = false;

        var px ={
          "id": returnData.PatientCPTID,
          "selected": false,
          "code": returnData.CptCode,
          "description": returnData.CodeDescr,
          "modifier": returnData.Modifier,
          "data": returnData
        };
        self.selectedCode = px;

        self.helper.createNotySuccess('Procedure Saved Successfully!');
        if(callback) callback();
      });
    }
    else{
      self.data.updateSelectedCode(patientPx, (returnData) => {
        self.needsSavingPx = false;

        var px ={
          "id": returnData.PatientCPTID,
          "selected": false,
          "code": returnData.CptCode,
          "description": returnData.CodeDescr,
          "modifier": returnData.Modifier,
          "data": returnData
        };
        self.selectedCode = px;

        self.helper.createNotySuccess('Procedure Updated Successfully!');
        if(callback) callback();
      });
    }
    console.log('SAVE PROCEDURE');
  }

  getBoundObject() {
    let self = this;
    // console.log('LAUNCH VIDEO', bound);
    let bridge = undefined;
    if(typeof bound === 'undefined'){
      if(chrome && chrome.webview && chrome.webview.hostObjects) {
        bridge = chrome.webview.hostObjects.bound;
        console.log('bridge from chrome.webview.hostObjects:', bridge);
        console.log('chrome', chrome);
      }
    } else {
      bridge = bound;
    }
    return bridge;
  }

  launchVideo(){
    let self = this;
    // console.log('LAUNCH VIDEO', bound);
    let bridge = self.getBoundObject();
    /*
    let bridge = undefined;
    if(typeof bound === 'undefined'){
      if(chrome && chrome.webview && chrome.webview.hostObjects) {
        bridge = chrome.webview.hostObjects.bound;
        console.log('bridge from chrome.webview.hostObjects:', bridge);
        console.log('chrome', chrome);
      }
    } else {
      bridge = bound;
    }
     */
   if(typeof bridge !== 'undefined'){
      let providerIdString = '';
      if(self.selectedProvider) {
        providerIdString = self.selectedProvider.ProviderID.toString();
      } else {
        providerIdString = self.providers[0].ProviderID.toString();
      }
      let dateString = self.date.toString();
      let patientIdString = '';
      if(self.patient && self.patient.data) {
        patientIdString = self.patient.data.PatientID.toString();
      } else {
        patientIdString = self.patientId;
      }
      bridge.phxTelemed_openVideo(providerIdString, dateString, patientIdString);
   }else{
     var url = "https://backline-health.com/";
     //var url = "https://www.google.com";
     //self.router.navigate(url);
     //self.displayChat(url);
     window.open(url, "_blank");
   }
  }

  toggleVideo(){
    const self = this;
    self.displayVideo = !self.displayVideo;
    if(self.displaySchedule){
      self.displaySchedule = false;
      self.mainScreenClass = self.displaySchedule ? 'col-md-9' : 'col-md-12';
    }
  }

    startFollowupSaveProcess() {
      const self = this;

      if(self.followupSaveTimeout){
        clearTimeout(self.followupSaveTimeout);
      }

      self.followupSaveTimeout = setTimeout(() => {
        self.saveFollowup(self.examData, self.planData, self.historyData);
        self.followupSaveTimeout = null;
      }, 1500);

    }

  followupTextChange(event){
    let self = this;

    self.startFollowupSaveProcess();
  }

  populateExamWithPreference(pref){
    var self = this;

    self.data.getNewExam(function(newExam){
      newExam.ChartNoteExam = pref.NoteExam;
      self.examData = newExam;
    });
    self.data.getNewHpi(function(newHpi){
      newHpi.HpiText = pref.NoteHistory;
      self.historyData = newHpi;
    });
    self.data.getNewPlan(function(newPlan){
      newPlan.PlanText = pref.NotePlan;
      self.planData = newPlan;
    });

     // self.examData.exam.ChartNoteExam = pref.NoteExam;
     // self.examData.hpi.HpiText = pref.NoteHistory;
     // self.examData.plan.PlanText = pref.NotePlan;
  }

  scheduleRowClick(schedule, createVisit){
    let self = this;

    if(schedule.isNewPatient){
      alert('Telemed visits for new patients are not supported.');
      return;
    }

    self.locationId = schedule.data.Schedule.LocationID;

    if(!createVisit && schedule.latestVisitBodyPart && typeof schedule.latestVisitBodyPart !== 'undefined'){
      self.selectedBodyPart = schedule.latestVisitBodyPart;
    }

    //refresh preferences by schedule provider
    self.filterExamPref();

    console.log('SCHEDULE CLICKED', schedule);
    let dateToLoad = createVisit ? moment().format('MM-DD-YYYY') : schedule.latestVisitDateMoment.format('MM-DD-YYYY');

    // if(!createVisit){
      self.loadDataForSelectedSchedule(schedule.patientId, dateToLoad);
    // }
    let bridge = self.getBoundObject();
    if(typeof bridge !== 'undefined'){
      bridge.phxTelemed_scheduleDoubleClick(schedule.id, createVisit, self.selectedBodyPart);
      if(createVisit){
        schedule.latestVisitDate = dateToLoad;
      }
    }else{

      if(!createVisit)return;

      //update schedule row with created visit date...
      schedule.latestVisitDate = dateToLoad;
      schedule.latestVisitDateMoment = moment(dateToLoad);

      //try to get latest visitcode for selected patient...
      self.data.getLatestVisitCodeForPatient(schedule.patientId, function(res){

        //check to see if date is equal to todays date,
        //if so LOAD it,
        //ELSE
        //IF visit is NOT NULL, use it to populate visit creation popup
        //ELSE
        //display visit creation popup empty

        if(res != null){
          //check returned date against todays date...
          var latestDate =  moment(res.ExamDateTime).format('MM/DD/YYYY');
          if(latestDate === dateToLoad){
              //suggest visit info using previous...
            //no existing visit...
            self.displayVisitCreatePopup(new self.data.getNewCreateVisitObject(res.Visit_Type, res.VisitBodyPart, res.VisitBodySide, dateToLoad));
          }else{
            //no existing visit...
            var vo = new self.data.getNewCreateVisitObject();
            vo.date = dateToLoad;
            self.displayVisitCreatePopup(vo);
          }
        }else{
          //no existing visit...
          var vo = new self.data.getNewCreateVisitObject();
          vo.date = dateToLoad;
          self.displayVisitCreatePopup(vo);
        }
      });

    }
  }


  displayVisitCreatePopup(createVisitObj){
    let self = this;
    const windowHeight = window.innerHeight / 2;
    const windowWidth = window.innerWidth / 2;

    self.dialogService.open({viewModel: CreateVisitPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, visitObject: createVisitObj}}).whenClosed(response => {
      let res = response.output;
      if(res != null){
        //create visit???
        self.createVisit(self.patientId, res, self.selectedProvider.ProviderID, self.helper._user.UserID, self.locationId )
      }
    });
  }


  createVisit(patientId, vObject, providerId, userId, locationId){
    let self = this;
    //get empty visitCode object...
    self.data.getVisitCodeObject(function (vc) {

      //update with data...
      vc.PatientID = patientId;
      vc.ProviderID = providerId;
      vc.UserID = userId;
      vc.LocationID = locationId;
      vc.Visit_Type = vObject.visitObject.visitType;
      vc.VisitBodyPart = vObject.visitObject.bodypart;
      vc.VisitBodySide = vObject.visitObject.bodyside;
      vc.ExamDateTime = vObject.visitObject.date;

      //create new visitcode...
      self.data.createVisitCode(vc, function(res){

      });
    });
  }


  filterExamPref(providerId){
    let self = this;
    var proId = providerId == undefined ? self.selectedProvider.ProviderID : providerId;

    self.data.getFollowUpPref(proId, self.selectedBodyPart, self.prefTypeButtonText, function(res){
      self.followupPrefs = res;
    });
  }

  loadScheduledProviders(callback){
    let self = this;
    self.data.getScheduledProviders(self.date, function(res){
      self.providers = res;
      //add ALL provider...
      let all = {
        "ProviderEntity": "All",
        "ProviderID": 0
      };

      self.providers.splice(0,0,all);

      callback();
    });
  }

  loadScheduleByProvider(){
    let self = this;
    self.data.getSchedule(self.selectedProvider.ProviderID, self.filterScheduleByTelemed, function(r){
      self.schedule = r;
      self.filterExamPref();
      self.data.getWebDocsWithProviderID(self.selectedProvider.ProviderID, function(res){
        self.webdocs = res;

        let document = {
          "Description": "Documents",
          "Id": 0
        };
        self.selectedWebdoc = document;
        //
        // self.webdocs.splice(0,0,document);

      });
    });
  }

  toggleScheduleFilter(){
    var self = this;
    //if we have selected ALL provider (0), return ALL schedules...
    self.filterScheduleByTelemed = self.filterScheduleByTelemed  ? false : true;
    self.loadScheduleByProvider();
  }

  codeSelected(code){
    const self = this;

    if(self.selectedCode != null){
      self.selectedCode.code = code.code;
      self.selectedCode.description = code.description;
      self.selectedCode.modifier = code.modifier;
      self.selectedCode.id = code.id;
    }
    else{
      self.selectedCode = code;
    }
    self.saveProcedure();

  }

  setSelectedWebdoc(doc){
    this.selectedWebdoc = doc;
  }

  openDocument(document){
    let url =  this.helper._server + "/webdocuments/#document?";

    url = url.concat("docid=", document.Id);
    url = url.concat("&locked=", "true");
    url = url.concat("&print=", "false");
    url = url.concat("&jwt=", this.helper._jwt);

    //window.open(url, "_blank");


    this.displayDocumentPopup(url);

  // <div class="fr-box fr-basic fr-top" role="application" style="
  //   position: absolute;
  //   bottom: 0;
  //   top: 0;
  //   ">

  // <div class="fr-wrapper" dir="auto" style="max-height: 747px;overflow: auto;">

  }

  createDxObject(dx){
    var self = this;
    var aDx = {
      "id": 0,
      "code": dx.code,
      "description": dx.description,
      "date": self.helper.getDateWithFormat(self.date, "MM/DD/YYYY"),
      "data": dx.data,
      "selected": true
    };
    return aDx;
  }

  displayTaskForm(){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: Task, model: {popupWidth: windowWidth, popupHeight: windowHeight}}).whenClosed(response => {
      let res = response.output;
      if(res != null && res.launchPatientId != null){
        //load patient???
        self.loadDataForSelectedSchedule(res.launchPatientId, moment());
      }
    });
  }


  displayPatientSearch(){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: PatientSearch, model: {popupWidth: windowWidth, popupHeight: windowHeight}}).whenClosed(response => {
      let aPat = response.output;
      if(aPat != null){
        //load patient???

        //let dateToLoad = createVisit ? moment().format('MM-DD-YYYY') : schedule.latestVisitDate;
        self.loadDataForSelectedSchedule(aPat.id, moment());


        // if(typeof bound !== 'undefined'){
        //   bound.phxTelemed_scheduleDoubleClick(schedule.id, createVisit, self.selectedBodyPart);
        //   if(createVisit){
        //     schedule.latestVisitDate = dateToLoad;
        //   }
        // }

      }
    });
  }

  displayDocumentPopup(url){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: DocumentPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, documentUrl: url}}).whenClosed(response => {

    });
  }

  displayChat(dialogViewUrl){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: DialogView, model: {popupWidth: windowWidth, popupHeight: windowHeight, url: dialogViewUrl}}).whenClosed(response => {

    });
  }

  displayDxPop(){
    let self = this;

    if(!self.isTimeDiffAllowed()){
      return;
    }

    self.dialogService.open({viewModel: DxSearch, model: {"bodypart": self.selectedBodyPart}}).whenClosed(response => {
      let dx = response.output;
      if(dx != null){

        //add to diagnosis???
        var aDx = self.createDxObject(dx);

        self.patientDxs.splice(0, 0, aDx);
        // self.needsSavingDx = true;
        self.saveDiagnoses();
      }
    });
  }

  displayPxPop(){
    let self = this;

    if(!self.isTimeDiffAllowed()){
      return;
    }

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: PxSearch, model: {popupWidth: windowWidth, popupHeight: windowHeight}}).whenClosed(response => {
      let px = response.output;
      if(px != null){

        px.modifier = px.modifier == 'NONE' ? null : px.modifier;

        self.codeSelected(px);
      }
    });
  }

  isTimeDiffAllowed(){
    let self = this;
    let currentExamDate = moment(self.date);
    let now = moment();
    let timeDiff = now.diff(currentExamDate, 'days');

    if(timeDiff > 7){
      alert('Modifying visits older than 7 days is not allowed in the Telemed screen');
      return false;
    }
    return true;
  }

  dxChecked(dx){
    var self = this;

    if(!self.isTimeDiffAllowed()){
      return;
    }

    if(dx.selected){
      //remove
      for(var i = 0; i < self.patientDxs.length; i++){
        var aDx= self.patientDxs[i];
        if(aDx.id == dx.id){
          self.patientDxs.splice(i, 1);
        }
      }
    }
    else{
      var aDx = self.createDxObject(dx);
      aDx.selected = true;
      self.patientDxs.splice(0,0,aDx);
      console.log('INSERTED DX');
    }
    console.log('DX CHECKED!');
    self.saveDiagnoses();
    // self.needsSavingDx = true;
  }

  macroClicked(m){
    var self = this;
    var mcro = m;
    if(self.selectedTextarea!=null && self.caratPosition > -1){
      //insert macro
      var txt = self.selectedTextarea.value;
      var splitTxt = [txt.slice(0, self.caratPosition), txt.slice(self.caratPosition)];
      self.selectedTextarea.value = splitTxt[0] + " " + m + " " + splitTxt[1];

      //update data
      if(self.selectedTextarea.id == 'exam'){
        self.examData.ChartNoteExam = self.selectedTextarea.value;
      }
      if(self.selectedTextarea.id == 'hpi'){
        self.historyData.HpiText = self.selectedTextarea.value;
      }
      if(self.selectedTextarea.id == 'plan'){
        self.planData.PlanText = self.selectedTextarea.value;
      }
    }
  }

  getPreferenceWithId(id){
    let self = this;
    let p =  _.find(self.followupPrefs,(data)=>{
      return data.PostOpID == id
    });

    return p ? p : null;
  }

  createPreferenceClicked(){
    let self = this;
    // let examText = self.examData.exam ? self.examData.exam.ChartNoteExam : null;
    // let hpiText = self.examData.hpi ? self.examData.hpi.HpiText : null;
    // let planText = self.examData.plan ? self.examData.plan.PlanText : null;


    //let selectedPref =
    let pref = self.selectedFollowUpPref;
//{hpiText: hpiText, examText: examText, planText: planText}
    self.dialogService.open({viewModel: PreferenceBuilder, model: pref, lock: false}).whenClosed(response => {

      if(response.wasCancelled) {
        return;
      }

      let dataFromDialog = response.output;
//ProviderID,
// NoteHistory,
// NoteExam,
// NotePlan,
// BodyPart,
// Type = 'Telemed',
// PostOpProcedure,
// Timeframe = '',
// visitCode = ''
      let preference = {
        ProviderID: self.selectedProvider.ProviderID,
        BodyPart: dataFromDialog.bodyPart,
        Type: self.prefTypeButtonText,//'Telemed',
        PostOpProcedure: dataFromDialog.preferenceName,
        NoteHistory: dataFromDialog.hpiText,
        NoteExam: dataFromDialog.examText,
        NotePlan: dataFromDialog.planText,
        Timeframe: '',
        visitCode: '',
        PostOpID: dataFromDialog.id
      };

      if(preference.PostOpID == 0){
        //create new
        self.data.savePreference(preference, () => {
          self.helper.createNotySuccess('Preference Saved Successfully!');
          self.data.getFollowUpPref(self.selectedProvider.ProviderID, self.selectedBodyPart,self.prefTypeButtonText, function(res){
            self.followupPrefs = res;
          });
        });
      }else{
        //update
        self.data.updatePreference(preference, ()=>{
          self.helper.createNotySuccess('Preference Updated Successfully!');
          self.data.getFollowUpPref(self.selectedProvider.ProviderID, self.selectedBodyPart,self.prefTypeButtonText, function(res){
            self.followupPrefs = res;
          });
        })
      }



    });

  }

  setSelectedTextarea(e){
    this.selectedTextarea = e.target;
    this.caratPosition = e.target.selectionStart;
  }

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
