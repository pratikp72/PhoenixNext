/**
 * Created by montymccune on 10/15/18.
 */
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable, observable, computedFrom} from 'aurelia-framework';
import {Data} from '../data/go/data';
import * as _ from 'lodash';
import moment from 'moment';
import {DialogService} from 'aurelia-dialog';
import {Router} from 'aurelia-router';
import Packery from  'packery';
import Draggabilly from 'draggabilly';
import {Globals} from './globals';
import {PopupHelper} from './popupHelper';
import {DocumentPopup} from "./documentPopup";
import {Task} from "./task/task";
import {PtPopup} from "./ptPopup";
import {Access} from "../access";
import {PatientSearch} from "./patientSearch";
import {TaskHelper} from './task/taskHelper';
import {EventAggregator} from 'aurelia-event-aggregator';



import Driver from 'driver.js';
import 'driver.js/dist/driver.min.css';



class SaveQueue{
  constructor(helper){
    this.items = [];
    this.dialog=null;
    this.isSaving = false;
    this.visible = false;
    this.helper = helper;
    this.saveCounter = 0;
    this.timer =null;
    this.timeout = 3000;
  }

  addItem(item){
    var add = true;
    for(var i = 0; i < this.items.length; i++){
      if(this.items[i].block.blockType == item.block.blockType){
        add = false;
        break;
      }
    }
    if(add){
      this.items.push(item);
      this.save();
    }
  }

  clear(){
    this.items=[];
    this.isSaving = false;
    this.saveCounter = 0;
    this.dialog = null;
    this.visible = false;
    this.timer = null;
  }

  updateText(value){
    this.dialog.setText(value);
  }

  timerComplete(){
    clearTimeout(this.timer);
    this.timer = null;
    if(this.saveCounter == 0){
      this.dialog.close();
      this.clear();
    }
  }

  save(){
    var self = this;

    self.saveCounter = self.saveCounter + 1;

    self.isSaving = true;

    if(self.dialog == null){
      //do timer...
      self.timer = setTimeout(self.timerComplete.bind(self), self.timeout);
      self.dialog = self.helper.createNoty("Saving...", self.timeout);
      self.dialog.show();
    }

    var itm = self.items.shift();
    self.updateText("Saving " + itm.constructor.name + "...");
    
    itm.save(function(res){
      self.saveCounter = self.saveCounter - 1;
      self.saveCounter = self.saveCounter < 0 ? 0 : self.saveCounter;
      console.log("Saved "+ itm.constructor.name);

      if(self.saveCounter==0 && self.timer == null){
        if(self.dialog != null){
          self.dialog.close();
        }
        self.clear();
      }
    });

  }
}


@inject(helper,http,DialogService, Router, Data, Globals, Access, PopupHelper, TaskHelper, EventAggregator)//
export class Home {


  admin=null;
  colWidth;
  rowHeight;
  sizeList = [1, 2, 3, 4];

  editing = false;
  currentBoard =null;
  userBoards=[];
  pickerList=['schedule', 'patientHx', 'board', 'visit', 'documents', 'task', 'pt', 'demographics', 'workflow'];
  boardPickerModel=null;

  providers=[];
  allProviders=[];
  @observable currentProvider;
  currentProviderChanged(newVal, oldVal){
    if(newVal == undefined || newVal == null){
      this.setSidebarItemDisabledWithTitle(true, 'Workflow');
    }else{
      this.setSidebarItemDisabledWithTitle(false, 'Workflow');
    }
  }

  schedule=[];

  webdocs={
    "default":[],
    "provider":[]
  }

  scheduleVisible = false;
  boardPickerVisible = false;
  visitPickerVisible = false;
  docPickerVisible = false;
  adminVisible = false;
  workflowVisible=false;


  patient=null;
  patientVisits=[];
  currentVisit=null;

  locationId = 0;

  documentCount = 0;

  ptDialog = null;

  saveQueue=null;

  messageTimer=null;
  //messageCount = 0;

  idleCounter = 0;
  idleMinutes=59;

  @observable demographicsVisible = false;
  demographicsVisibleChanged(newVal, oldVal){
    if(!newVal && oldVal){
      this.event.publish("demographicsClosed");
    }
  }
  demographicsMenu=null;
  demographicsNeedsSave=false;
  demographicsDisabled = false;
  // demographicsHiddenFromBodyClick=false;

  appendOverwriteResults= null;

  scrollContainerHeight;

  showAdminButton = false;

  moreIconsVisible = false;


  daysheetParams=null;
  @observable displayDaysheet=false;

  externalapps=[];

  //const driver=null;

  erxEnabled = false
  faxEnabled = false;

  displayDocumentSpinner = false;

  goForms=[];

  showDocumentTray = true;

  mobileView=false;

  sidebarItems=[];
  sidebarMoreItems=[];

  is_visit_today = false

  @computedFrom('goForms')
  get examGoForms(){
    console.log("EXAMGOFORMS!");
    return _.filter(this.goForms, function(f){return f.DisplayInExamDropdown});
  }

  showPatientAlertIcon = false;


  constructor(helper, http, DialogService, Router, Data, Globals, Access, PopupHelper, TaskHelper, EventAggregator){
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.dialogService = DialogService;
    this.router = Router;
    this.globals = Globals;
    this.access = Access;
    this.popupHelper = PopupHelper;
    this.taskHelper = TaskHelper;
    this.event = EventAggregator;

     this.setupChatbotEventListeners();
  }


  setupChatbotEventListeners() {
    var self = this;
    
    // Listen for static patient opening requests
    this.event.subscribe('open-patient-static', function(data) {
        console.log('Opening patient statically:', data.patientName, data.patientId);
        
        // Use your existing loadPatientWithMostRecentVisit method
        self.loadPatientWithMostRecentVisit(data.patientId);
        
        // Show success message in chat after a delay
        setTimeout(function() {
            self.event.publish('message-sent', {
                message: 'Successfully opened ' + data.patientName + '\'s patient record with the most recent visit.',
                type: 'assistant'
            });
        }, 1500);
    });
    
    // Keep your existing office-visits-requested listener for the chatbot API calls
    this.event.subscribe('office-visits-requested', function(data) {
        console.log('Handling chatbot office visits request for:', data.patientName);
        
        // Find the patient in the current schedule and open using rowClick logic
        // This is for the chatbot API response
        // Your existing logic here...
    });
}



  trySelectLoggedInUser(){
    let self = this;
    //first check if we have a scheduledProvider selected, else if logged-in user is a scheduled provider,
    //if so, select it him....
    var userId = self.helper._user.UserID;
    var aProvider = _.find(self.providers, function(p){return p.UserID == userId});
    if(aProvider != undefined){
      //select provider...
      self.currentProvider= aProvider;
    }
  }

  addNewBlockComponentToBoard(blockType, optional){
    let self = this;
    //does this component exist already??
    let exists = self.currentBoard.getBlockWithType(blockType);
    if(exists && exists.blockType != "goForm"){
      return;
    }

    let tLoadData= true;
    let tLeftToRightSort = true;
    let tDataObject = null;
    let tObjectId = 0;
    if(optional){
      tLoadData = optional.hasOwnProperty('loadData') ? optional.loadData : true;
      tLeftToRightSort = optional.hasOwnProperty('leftToRightSort') ? optional.leftToRightSort :true;
      tDataObject = optional.hasOwnProperty('dataObject') ? optional.dataObject : null;
      tObjectId = optional.hasOwnProperty('objectId') ? optional.objectId : 0;
    }

    let options={
      editing: false,
      // widthMult: 2,
      widthMult: "2",
      heightMult: "2",
      loadData: tLoadData,
      leftToRightSort: tLeftToRightSort,
      openPopup: blockType == 'jointInjection' ? true: false,
      dataObject : tDataObject,
      objectId : tObjectId
    }

    let newBlock = self.currentBoard.addBlock(blockType, options);

    //add position object...
    self.currentBoard.addPosition(newBlock.id, newBlock.x);
    self.data.saveVisitBoard(self.currentBoard);
  }

  openDocumentEditor() {
    let self = this;
    self.popupHelper.openDocPop(undefined, true);
  }

  isMobile(){
    //let agent = window.navigator.userAgent;
    // if ((/Android/i.test(navigator.userAgent))) {
    //   return true;
    // }
    // if (/iPad|iPhone|iPod/i.test(navigator.userAgent)) {
    //     return true;
    // }
    return window.orientation ? true : false;
  }

  canTouchEvent(){
    try {
      document.addEventListener("touchstart", ()=>{});
      document.removeEventListener("touchstart", ()=>{})
      return true;
    } catch(e) {
        return false;
    }
  }

  isTouchDevice(){
    return('ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msTouchPoints > 0);
  }

  openPtForPatient() {
    var self = this;

    if (self.displayDaysheet) {
      return;
    }

    // var displayPrefs = false;
    // if(self.canTouchEvent() && self.isMobile()){
    //   displayPrefs = true;
    // }

    let vi = self.currentBoard.visitInfo;
    self.daysheetParams = {
      patientid: vi.patientId,
      providerid: vi.providerId,
      bodypart: vi.selectedBodypart.part,//vi.bodyparts[0].part,
      userid: self.currentBoard.userId,
      visitdate: vi.date,
      type: vi.typeForSave,
      displayCloseButton: true,
      parent: self,
      displayPreferences: false,
      editMode: false
    }
    self.displayDaysheet = true;

    //filter PT...
    self.event.publish('filterPreferencesWithProviderAndType', {providerId: vi.providerId, type: vi.typeForSave});

  }

  displayDaysheetChanged(newVal, oldVal){
    let self = this;
    if(newVal != true){
      //save daysheet...
      self.event.publish('savedaysheet');

      var daysheetType =self.currentBoard.visitInfo.typeForSave;

      //closing of daysheet..
      self.event.publish('filterPreferencesWithProviderAndType', {providerId: self.currentProvider.ProviderID, type: daysheetType});
    }
  }

  updatePatientVisitBoardIdWithVisitCode(visitCode, boardId){
    for(let i = 0; i < this.patientVisits.length; i++){
      if(this.patientVisits[i].ObjectID == visitCode){
        this.patientVisits[i].BoardId = boardId;
        break;
      }
    }
  }


  getPatientName(patientId, callback){
    let self = this;
    // if(patientId && self.patient.data.PatientID.length == 0){
    //   self.data.getWithUrl(`patients/${patientId}`, function(res){
    //     callback(self._parsePatientName(res));
    //   });
    // }else{
    //   callback(self._parsePatientName(self.patient.data));
    // }


    if(patientId){
      self.data.getWithUrl(`patients/${patientId}`, function(res){
        callback(self._parsePatientName(res));
      });
    }else if(self.patient && self.patient.data){
      callback(self._parsePatientName(self.patient.data));
    }else{
      callback("NO PATIENT");
    }
  }

  _parsePatientName(patient){
    if(patient.hasOwnProperty('NameLast')){
      return  patient.NameLast + ", " + patient.NameFirst;
    }else{
      return "";
    }
  }

  setLocationId(id){
    this.locationId = id;
  }

  activate(params) {
    var self = this;
    var myContainerWidth = $('#mycontainer').width();
    var myContainerHeight = $('#mycontainer').height();
    this.colWidth = ((1/12) * myContainerWidth)*3;
    this.rowHeight = ((1/12) * myContainerHeight)*3;
  }

  toggleDemographics(){
    if(this.demographicsVisible){
      this.hideDemographics();
    }else{
      this.showDemographics();
    }
  }

  showDemographics(hidePickers){

    if(this.patient.data.PatientID.length == 0)return;

    if(hidePickers == undefined){
      this.closeAllOtherVisiblePickers('demographics');
    }
    this.demographicsVisible = true;
    //this.event.publish('demographicsvisible');
  }

  hideDemographics(){
    // if(this.demographicsNeedsSave == true){
    //   this.event.publish('savePatientHistory');
    // }else{
    //   this.demographicsVisible = false;
    // }
    this.demographicsVisible = false;
  }

  drfirstDropdownClicked(){
    this.closeAllOtherVisiblePickers('drfirst');
  }

  closeAllOtherVisiblePickers(notThisPicker){
    for(var i = 0; i < this.pickerList.length; i++){
      var pickerDescription = this.pickerList[i];
      if(pickerDescription != notThisPicker){
        //disable picker...
        if(pickerDescription == 'schedule'){
          this.scheduleVisible = false;
        }
        if(pickerDescription == 'patientHx'){

        }
        if(pickerDescription == 'board'){
          this.boardPickerVisible = false;
        }
        if(pickerDescription == 'visit'){
          this.visitPickerVisible = false;
        }
        if(pickerDescription == 'documents') {
          this.docPickerVisible = false;
        }
        if(pickerDescription == 'demographics') {
          this.demographicsVisible = false;
        }
        if(pickerDescription == 'admin') {
          this.adminVisible = false;
        }
        if(pickerDescription == 'workflow') {
          this.workflowVisible = false;
        }
      }
    }
  }

  toggleMoreIcons(){
    this.moreIconsVisible = this.moreIconsVisible ? false : true;
  }

  togglePicker(picker){

    //var ptDisplayed = false;

    if(this.moreIconsVisible){
      this.moreIconsVisible = false;
    }

    //disable all pickers EXCEPT for the one being toggled...
    this.closeAllOtherVisiblePickers(picker);


    //toggle picker...
    if(picker == 'schedule'){
      this.popupHelper.closeActiveDialog();
      this.toggleSchedulePicker();
    }else if(picker == 'patientHx'){

    }else if(picker == 'board'){
      this.popupHelper.closeActiveDialog();
      this.toggleBoardPicker();
    }else if(picker == 'visit'){
      this.popupHelper.closeActiveDialog();
      this.toggleVisitPicker();
    }else if(picker == 'documents'){
      this.popupHelper.closeActiveDialog();
      this.toggleDocumentPicker();
    }else if(picker == 'charges'){
      this.openCharges();
    }else if(picker == 'task'){
      this.displayTaskForm();
    }else if(picker == 'patient'){
      this.displayPatientSearch();
    }else if(picker == 'admin'){
      this.popupHelper.closeActiveDialog();
       this.displayAdmin();
    }else if(picker == 'workflow'){
      this.popupHelper.closeActiveDialog();
      this.toggleWorkflow();
    }else if(picker == 'kiosk'){
      this.displayKioskDashboard();
    }else if(picker == 'returnto'){
      this.openReturnTo();
    }else if(picker == 'ptOrder'){
      this.openPtOrder('./ptOrder');
    }else if(picker == 'camera'){
      this.openCamera();
    }else if(picker == 'phone'){
      this.openPhonecall();
    }else if(picker == 'inboundfax'){
      this.openInboundFax('fax');
    }else if(picker == 'scan'){
      this.openInboundFax('scan');
    }else if(picker == 'surgerySchedule'){
      this.openPtOrder('./surgerySchedule');
    }
  }



  toggleAdmin(){
    this.adminVisible = this.adminVisible ? false : true;
  }

  toggleWorkflow(){
    this.workflowVisible = this.workflowVisible ? false : true;
  }

  toggleVisitPicker(){
    this.visitPickerVisible = this.visitPickerVisible ? false : true;
  }

  toggleSchedulePicker(){
    this.scheduleVisible = this.scheduleVisible ? false : true;
  }

  toggleBoardPicker(){
    this.boardPickerVisible = this.boardPickerVisible ? false : true;
  }

  toggleDocumentPicker(){
    this.docPickerVisible = this.docPickerVisible ? false : true;
  }

  doctrayClick(){
    this.showDocumentTray = this.showDocumentTray ? false : true;
  }

  // toggleBoardLayout(layout, e){
  //   let self = this;
  //   e.stopPropagation();
  //   self.currentBoard.toggleLayout(layout);
  //   self.event.publish('resetBlockSize');
  // }

  toggleBoardLayout(e){
    let self = this;
    e.stopPropagation();
    var layout = self.currentBoard.blockLayout ? 'list' : 'block';
    self.currentBoard.toggleLayout(layout);
    self.event.publish('resetBlockSize');
  }

  testDrFirstReports(erxUserId){
    let self = this;
    let url = 'drfirst/notificationcount?erxUserId=' + erxUserId;

    self.http.get(self.helper.getApiUrl(url), function(res){
      let data = res;
    });
  }

  getProviderForms(providerId){
    let self = this;

    self.goForms=[];

    var url = `goforms/provider?providerId=${providerId}`;
    self.data.getWithUrl(url, function(res){

      //only retrieve GO forms...
      // self.goForms = _.filter(res, function(f){return f.Type == 'GO'});
      self.goForms = _.filter(res, function(f){return f.DisplayInExamDropdown == true});
    });
  }

  openGoFormInstance(instance){
    var self = this;

    var form=null;
    //if this has a formId also, create formObject too..
    if(instance.hasOwnProperty('FormId')){
      form={
        'Description': instance.Description,
        'Id': instance.FormId
      }
    }

    self.openGoForm(form, instance);
  }

  openGoFormPreferenceEditor(form){
    let self = this;

    //if(self.form == null)return;

    let path = '../formbuilder/viewer';
    // const windowHeight = window.innerHeight;
    // const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let options={
      //displayHeader: false,
      bodyPadding: 0,
      icon: 'fa-user'
    }

    //var formId = form ? form.Id : null;
    var description = 'Go Form Preference Editor';

    self.popupHelper.openViewModelPop(path, 
      {
        // jwt: self.helper._jwt, 
        formId: form.Id,//self.form.id, 
        // patientId: self.patient.data.PatientID, 
        providerId: self.currentProvider.ProviderID, 
        // date: date, 
        // instanceId: instanceId, 
        //showToolbar: true,
        showPreferenceToolbar: true,
        showPreferenceToolbarSave: true,
        prefId: 0
      }, description, windowWidth, windowHeight, 0, 0, options, function(res){

    });
  }

  openGoForm(form, instance){
    let self = this;

    //toggle moreItems sidebar item, if needed...
    if(this.moreIconsVisible){
      this.moreIconsVisible = false;
    }

    if(!self.patient && !self.currentProvider){
      return;//some error here??
    }

    let path = '../formbuilder/viewer';
    let aDate = self.helper.parseMMDDYYDateString(self.currentBoard.visitInfo.date, "/");
    let date = self.helper.getMMDDYYYYDateWithDate(aDate);
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let options={
      //displayHeader: false,
      bodyPadding: 0,
      icon: 'fa-list-alt'
    };

    //var instId = instanceId
    var instanceId = instance ? instance.Id : null;
    var formId = form ? form.Id : null;
    var description = form ? form.Description : instance.Description;

    //cache current task...
    self.taskHelper.cacheObjectToTask(self.taskHelper.objectId, self.taskHelper.taskTypeId);

    self.popupHelper.openViewModelPop(path, {
      jwt: self.helper._jwt, 
      formId: formId, 
      patientId: self.patient.data.PatientID, 
      providerId: self.currentProvider.ProviderID, 
      date: date, 
      instanceId: instanceId, 
      showSubmit: true, 
      showSubmitAsToolbar: true,
      showPreferenceToolbar: true
    }, description, windowWidth, windowHeight, 0, 0, options, function(res){
      self.taskHelper.clear();
      //retrieve cached task object...
      self.taskHelper.setObjectToTask(self.taskHelper.cacheObjectId, self.taskHelper.cacheTaskTypeId);
      self.taskHelper.patientId = self.patient.data.PatientID;
      self.taskHelper.userId = self.helper._user.UserID;
      self.taskHelper.date = self.currentBoard.visitInfo.date;
      self.taskHelper.clearCachedTask();
    });
  }

  getDrFirstUrl(patientId, mode, callback){
    var self = this;

    //only do this for rxUsers...
    if(self.helper._user.ErxUserID == null ||
      self.helper._user.ErxUserID.length == 0)
      return;//disbale the iOS rx toolbutton???

   // self.testDrFirstReports(self.helper._user.ErxUserID);


    var patId = patientId == null ? "": patientId;
    var screen = mode == null ? 'message' : mode;
    var url = "drfirst/url?screen="+ screen + "&userId=" + self.helper._user.ErxUserID + "&patientId=" + patId;
    self.http.get(self.helper.getApiUrl(url), function (res) {

      //self.drFirstUrl = res;

      //let wk = window.webkit;

      if(self.webkit != undefined){

        var url ={'url': res}

        webkit.messageHandlers.launchDrFirst.postMessage(url);
      }

      if(callback){
        callback(res);
      }

    }, function (err) {
        let e = err;
    });
  }

  initPackery(columnWidthClass){
    let self = this;
    self.globals.packery = new Packery( '#blockContainer', {
      itemSelector: '.block',//block
      columnWidth: columnWidthClass,
      // columnWidth: '.pack-w25',
      percentPosition: true
    });
    self.globals.packery.on( 'dragItemPositioned', function( draggedItem ) {
      self.currentBoard.hasChanged = true;
    });
  }


  didClickInsideDemographics(elementClicked){
    let self = this;
    let parents = $(elementClicked).parents('#demo');
    if(parents.length || elementClicked.classList.contains('demo')){
      return true;
    }
    return false;
  }

  didClickInsideSchedule(elementClicked){
    let self = this;
    var container = document.getElementById('providerschedule');
    if (container != null && container !== elementClicked && !container.contains(elementClicked)) {
      return false;
    }
    return true;
  }

  didClickInsideWorkflow(elementClicked){
    let self = this;
    var container = document.getElementById('workflow');
    if (container !== elementClicked && !container.contains(elementClicked)) {
      return false;
    }
    return true;
  }

  didClickInsideBoardpicker(elementClicked){
    let self = this;
    if(elementClicked.id == 'boardpicker')return true;

    let parents = $(elementClicked).parents('#boardpicker');
    if(parents.length || elementClicked.classList.contains('boardpicker')){
      return true;
    }
    return false;
  }


  tryDriverSample(){

    //let self = this;
    //document.activeElement.blur();

    const driver = new Driver({
      animate: false
    });

    //driver.document.activeElement = driver.document.body;

    driver.defineSteps([
      {
        element: '#toolbar-demographics',
        popover: {
          //className: 'first-step-popover-class',
          title: 'Patient Details',
          description: 'Click here to access the current patients demographics, visit history, review past history and document images.',
          position: 'right'
        }
      },
      {
        element: '#toolbar-patient-search',
        popover: {
          title: 'Patient Search',
          description: 'Click here to search for a patient.',
          position: 'right'
        }
      },
      {
        element: '#toolbar-schedule',
        popover: {
          title: 'Provider Schedule',
          description: 'Click here to review visit schedule by provider and location.',
          position: 'right'
        }
      },
      {
        element: '#toolbar-messaging',
        popover: {
          title: 'Messaging / Tasking',
          description: 'Click here to review assigned tasks and patient or staff messages.',
          position: 'right'
        }
      },
      {
        element: '#toolbar-workflow',
        popover: {
          title: 'Workflow',
          description: 'Click here to review patient work flow status: Diagnosis, Plan, Document created, History reviewed, Visit Code selected, x-ray review and more.',
          position: 'right'
        }
      },
      {
        element: '#toolbar-kiosk',
        popover: {
          title: 'Patient Kiosk',
          description: 'Click here to review Kiosk Check-in Progress.',
          position: 'right'
        }
      },
      {
        element: '#toolbar-phonecall',
        popover: {
          title: 'Patient Phone Conversations',
          description: 'Click here to check your phone call messages.',
          position: 'right'
        }
      },
      {
        element: '#toolbar-prescription',
        popover: {
          title: 'Prescription Writer',
          description: 'Click here to prescribe medications, view pharmacy messages or prescription reports.',
          position: 'right'
        }
      },
      {
        element: '#toolbar-more',
        popover: {
          title: 'More Items',
          description: 'Click here to access external apps, submit charges, therapy orders, return to school and return to work notes.',
          position: 'right'
        }
      },
      {
        element: '#toolbar-admin',
        popover: {
          title: 'Settings',
          description: 'Click here for settings, including file maintenance and additional administrative features.',
          position: 'right'
        }
      }
    ]);
    // Start the introduction
    driver.start();

  }

  setup(){
    var self = this;

    // const driver = new Driver({
    //   animate: false
    // });

    // self.tryDriverSample();

    //self.testVideo();

    window.onresize = function(){ self.getOrientation(); }

    self.taskHelper.setup();

    //events for idle resetting logout...
    $(window).on("tap",function(){
      self.idleCounter = 0;
    });
    // Zero the idle timer on mouse movement.
    $(window).mousemove(function (e) {
      self.idleCounter = 0;
    });
    $(window).keypress(function (e) {
      self.idleCounter = 0;
    });

    $(self.home).click(function(event) {

      if(self.demographicsVisible){
        let isDemographics = self.didClickInsideDemographics(event.target);
        if(!isDemographics){
          self.hideDemographics();
          //self.demographicsHiddenFromBodyClick = true;
        }
      }
      if(self.boardPickerVisible){
        let isBoardpicker = self.didClickInsideBoardpicker(event.target);
        if(!isBoardpicker){
          self.boardPickerVisible = false;
        }
      }
      if(self.scheduleVisible){
        let isSchedule = self.didClickInsideSchedule(event.target);
        if(!isSchedule){
          self.scheduleVisible = false;
        }
      }
      if(self.workflowVisible){
        let isWorkflow = self.didClickInsideWorkflow(event.target);
        if(!isWorkflow){
          self.workflowVisible = false;
        }
      }
    });

    self.saveQueue = new SaveQueue(self.helper);

    self.initPackery('.pack-w25');

    // //empty patient...
    // self.patient = self.data.getPatientEmpty(admin);

    self.data.getUserBoardData(function(res){
      self.userBoards = res;
      //self.currentBoard = self.userBoards[0];
      self.boardPickerModel = self.setupBoardPickerModel();
    });


    //check for message/task and workflow sidebar items...
    setTimeout(function(){
      self.updateSidebarItemBadges();
    }, 1000)


    self.data.getAdmin(function(a){

      // //empty patient...
      // self.patient = self.data.getPatientEmpty(a);

      self.admin = a;

      self.globals.admin = a;

      let timeoutSeconds = a.AutoLogOffTimeout;
      if(timeoutSeconds != 0){
        self.idleMinutes = timeoutSeconds / 60;
      }

      self.demographicsDisabled = a.HL7Enabled;

      //get xray viewer...
      self.helper.xraypath = a.MedstratURL;

      self.data.getWithUrl(`tenant?tenantId=${a.TenantId}`, function(res){
        //setup imageRoot...
        self.helper.imageTenantRoot = res.ImageRoot;
        self.helper.imageRoot = res.ImageRoot;
        self.globals.selfHosted = res.Tenant.SelfHosted;

        //empty patient...
        self.patient = self.data.getPatientEmpty(a);
      });

    });

    self.messageTimer = setInterval(function(){
      self.updateSidebarItemBadges.call(self);

      //use this timer event to add to timeout interval...
      self.idleCounter = self.idleCounter + 1;
      //check if we've been idle for more than X seconds...
      if(self.idleCounter > self.idleMinutes){
        //logout...ux-dialog-container
        self.logout();
      }

    }, 60000);

    self.loadScheduledProviders(null, function(){
      self.trySelectLoggedInUser();
    });

    self.data.getProviders(true, function(pros){
      self.allProviders = pros;
    })

    self.getDrFirstUrl(null, null);

    self.showAdminButton = self.helper._user.RoleName.toUpperCase() == 'ADMINISTRATOR' ? true : false;

    //self.scrollContainerHeight = window.innerHeight - 56; //toolbar height
    self.refreshHeight();

    self.data.getWithUrl('externalapps/all', function(res){
      if(!res) {
        return;
      }
      for(let i = 0; i < res.length; i++){
        if(res[i].Enabled){
          self.externalapps.push(res[i]);
        }
      }
    });

    // self.testThumbnails(function(res){
    //   let r = res;
    // });
    self.data.getBodypartList();



    //user...
    self.data.getUser(self.helper._user.UserID, function(res){

      self.checkUserLicense(res);

      //update UserData...
      self.helper._user.UserData = res;
      self.erxEnabled = self.helper._user.UserData.eRx;
      self.faxEnabled = self.helper._user.UserData.eFaxUser ? true : false;

      //get provider object...
      self.helper._user.ProviderData = null;
      self.data.getProvider(res.ProviderID, function(provider){
        self.helper._user.ProviderData = provider;
      });

    });
  }

  setSidebarItemDisabledWithTitle(disabled, title){
    var model = this.sidebarRef.currentController.view.bindingContext;
    var foundItm = _.find(model.sidebarItems, function(s){return s.title == title});
    if(!foundItm){
      //search more items...
      foundItm = _.find(model.sidebarItemsMore, function(s){return s.title == title});
    }
    //if we have an item...
    if(foundItm){
      foundItm.disabled = disabled;
    }
  }

  updateWorkflowSidebarItemBadge(count){
    var model = this.sidebarRef.currentController.view.bindingContext;
    var foundItm = _.find(model.sidebarItems, function(s){return s.title == 'Workflow'});
    if(!foundItm){
      //search more items...
      foundItm = _.find(model.sidebarItemsMore, function(s){return s.title == 'Workflow'});
    }
    //if we have an item...
    if(foundItm){
      foundItm.badgeCount = count;    
    }
  }

  updateSidebarItemBadges(){
    
    var itemsWithBadges=['Messaging/Tasking', 'Workflow'];

    if(this.sidebarRef){

      var model = this.sidebarRef.currentController.view.bindingContext;

      var foundItm=null;

      for(var i = 0; i < itemsWithBadges.length; i++){
        //search items...
        foundItm = _.find(model.sidebarItems, function(s){return s.title == itemsWithBadges[i]});
        if(!foundItm){
          //search more items...
          foundItm = _.find(model.sidebarItemsMore, function(s){return s.title == itemsWithBadges[i]});
        }

        //if we have an item...
        if(foundItm){
          if(foundItm.title == 'Messaging/Tasking'){
            this.updateMessageBadgeWithSidebarItem(foundItm);
          }else if(foundItm.title == 'Workflow'){
            //workflow...???
            //foundItm.badgeCount = count;
          }
        }
      }
    }
  }

  openFax(documentName, objectId, documentType){

    let self = this;

    //is fax open already???
    //if so, just add selected item to faxItems...
    if(self.popupHelper.activeController &&
        self.popupHelper.activeController.settings.model.header == "Fax"){
      self.popupHelper.activeController.settings.model.viewModel.faxItems.push({"Description": documentName, "Id": objectId});
      return;
    }

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    let halfW = windowWidth / 2;
    let halfH = windowHeight / 2;

    var options={
      closeActiveDialog:false,
      icon: 'fa-fax',
      bodyPadding: 0
    }

    var data={
      faxItems: [{"Description": documentName, "Id": objectId, "Type": documentType}]
    }

    self.popupHelper.openViewModelPop('../fax/outboundFax', data,'Fax',
      halfW,
      halfH,
      halfH / 2,
      0,//halfW / 2,
      options,function(res){

        self.popupHelper.activeController = null;

        if(res.cancelled && res.cancelled){
          return;
        }

    });
  }


  checkUserLicense(user){
    let self = this;

    //check license...
    if(user.License){
      //get claims...
      self.data.getWithUrl(`license/claims?token=${user.License}`, function(claims){
        //do we have an expiration date?
        if(claims && claims.hasOwnProperty('ExpireDate')){
          var expDate = moment.unix(claims.ExpireDate);
          //how many days left??
          var remainingDays =  expDate.diff(moment(), 'days');
          if(remainingDays <= 0){
            //disable visit creation...
            user.License = null;
          }else{
            //show remaining day alert...
            var txt = `You have ${remainingDays} days remaining in your trial license.`;
            self.popupHelper.openGenericMessagePop(txt, "License Trial", [], false, function(res){
              if(callback){
                callback(res);
              }
            }, {alertType: 'warning'});//htmlTemplate: template, 
          }
        }
      });
    }
    // else{
    //   //no license - disable visit creation...
    // }
  }

  refreshHeight(){
    this.scrollContainerHeight = window.innerHeight - 56; //toolbar height
  }

  testThumbnails(callback){
    //http://localhost:8090/dicomweb/studies/1.3.6.1.4.1.11157.2017.10.23.10.57.32.169/series/1.3.6.1.4.1.11157.2017.10.23.11.3.5.170/thumbnail

    let self = this;
    let url = `${self.helper._server}:8090/dicomweb/studies/1.3.6.1.4.1.11157.2017.10.23.10.57.32.169/series/1.3.6.1.4.1.11157.2017.10.23.11.3.5.170/thumbnail`

    return $.ajax({
      type: 'GET',
      url: url,
      contentType: "image/jpeg"
      // beforeSend: function(request){
      //   request.setRequestHeader("Authorization-Token", _this.helper.jwt());
      // }
    }).fail(function(err) {
          callback(err);
      })
      .done(function(data) {
        callback(data);
      });
  }


  testCharges(){
    let self = this;
    self.data.getWithUrl('charges/all', function(res){
      if(res && res.length > 0){
        //get first item...
        let aCharge = res[0];

        let detailUrl = `charges/detail?visitId=${aCharge.VisitCodeID}`;
        self.data.getWithUrl(detailUrl, function(detail){
          let deets = detail;
        });

      }
    });
  }

  launchDrFirst(mode){

    let self = this;

    self.moreIconsVisible = false;

    let patientId = null;

    if(mode == 'patient'){
      patientId = self.patient ? self.patient.data.PatientID : null;
    }

    const windowHeight = '100%';
    const windowWidth = '100%';

    let options={
      closeActiveDialog: false,
      width: windowWidth,
      height: windowHeight,
      top: 0,
      left:0,
      title: "",
      popupHeight: '100%'
      // popupHeight: windowHeight - 41 //minus toolbar height
    }

    self.getDrFirstUrl(patientId, mode,function(url){
      self.popupHelper.openUrlPathPop(url, options);
    });

  }

  launchExternalApp(app){

    this.moreIconsVisible = false;

    // const windowHeight = window.innerHeight;
    // const windowWidth = window.innerWidth;

    // let options={
    //   closeActiveDialog: false,
    //   width: windowWidth,
    //   height: windowHeight,
    //   top: 0,
    //   left:0,
    //   title: "",
    //   popupHeight: windowHeight - 41 //minus toolbar height
    // }

    const windowHeight = '100%';
    const windowWidth = '100%';

    let options={
      closeActiveDialog: false,
      width: windowWidth,
      height: windowHeight,
      top: 0,
      left:0,
      title: "",
      popupHeight: '100%'
      // popupHeight: windowHeight - 41 //minus toolbar height
    }

    this.popupHelper.openUrlPathPop(app.ExternalAppPathOrUrl, options);

  }

  logout(){
    let self = this;
    //logout...
    let dxo = $("ux-dialog-overlay");
    if(dxo.length > 0){
      //close down dxs...
      for(let d = 0; d < dxo.length; d++){
        let dx = dxo[d];
        $(dx).remove();
      }
    }
    let dxs = $("ux-dialog-container");
    if(dxs.length > 0){
      //close down dxs...
      for(let d = 0; d < dxs.length; d++){
        let dx = dxs[d];
        $(dx).remove();
      }
    }
    self.router.navigate('#/login/login');
  }


  updateMessageBadgeWithSidebarItem(item){
    let self = this;
    self.data.getMessageConversationsWithUserId(self.helper._user.UserID, function(conversations){

      let unreadMessages = 0;

      //remove ARCHIVED messages...
      let nonArchived = _.filter(conversations, function(m){return m.Status != 'ARCHIVED'})

      //sort by conversationId...
      let grouped = _.groupBy(nonArchived, 'ConversationID');
      let groupKeys = Object.keys(grouped);

      for(let k = 0; k < groupKeys.length; k++){
        let conv = grouped[groupKeys[k]];
        if(conv.length > 0){
          //check if most recent reply == logged in user...
          let isSender = self.globals.checkConversationResultIsSender(conv[0], self.helper._user.UserID);
          unreadMessages = !isSender ? unreadMessages + 1 : unreadMessages + 0;
        }
      }

      if(unreadMessages > 0){
        //display message badge here...
        item.badgeCount = unreadMessages;
      }
    });
  }

  getProviderFromScheduledProviderList(providerId){
    return _.find(this.providers, function(p){return p.ProviderID == providerId});
  }

  loadScheduledProviders(date, callback){

    var self = this;

    self.providers=[];

    self.data.getScheduledProviders(date, function(res){

      self.providers = _.sortBy(res, function(p){return p.ProviderEntity});
      //add ALL provider...
      let all = {
        "ProviderEntity": "All",
        "ProviderID": 0
      };

      self.providers.splice(0,0,all);

      if(callback){
        callback();
      }
    });


  }

  setupBoardPickerModel(){
    var self = this;
    return {
      "home": self,
      "userBoards": self.userBoards == null ? [] : self.userBoards,
      "components": self.data.getBlockTypes()
    };
  }

  attached(){
    var self = this;

    //this removes all records of previously displayed patient alerts...
    self.globals.clear_patient_alerts();

    self.setup();

    self.event.subscribe('goFormPdfSaved', function(doc){

      //does this PDF exist???
      var foundPdf = _.find(self.currentBoard.documents, 
        function(d){return d.blockType == 'document' && d.id == doc.DocumentID});

      //add pdf to tray if it doesnt exist...
      if(!foundPdf){
        //get task type...
        self.data.getWithUrl(`tasktype?description=Goform&type=Goform`, function(tt){

          //get new history result object...
          var hxRes = self.data.getHistoryResultObject();
          hxRes.TaskTypeID=tt.Id;
          hxRes.TaskTypeDescription=tt.Description;
          hxRes.TaskType=tt.Type;
          hxRes.Locked=false;
          hxRes.Description=doc.DocumentName;
          hxRes.Type='document';
          hxRes.ExamDateTime=doc.CreationDate;
          hxRes.CreateDate=doc.CreationDate;
          hxRes.ProviderID=doc.ProviderID;
          hxRes.ObjectID=doc.DocumentID;
          hxRes.DocPath=doc.DocumentLocation;
         // hxRes.Part=doc.
          //hxRes.Details: null,
          //hxRes.DetailsMore: null,
          //hxRes.BoardId: null

          var aBlock = self.data.getNewBlock();

          //clean up DocumentLocation for description...
          const docLocation = doc.DocumentLocation;
          var splitDash = docLocation.split('-');
          var filename = splitDash[splitDash.length - 1];
          //remove extention...
          filename = filename.replace('.pdf', "");


          aBlock.description = filename;//doc.DocumentType;
          aBlock.blockType = 'document';
          aBlock.widthMult = 1;
          aBlock.heightMult = 1;
          aBlock.data = hxRes;
          aBlock.id = doc.DocumentID;
          self.currentBoard.documents.push(aBlock);
          //update document counter...
          self.documentCount = self.home.documentCount + 1;

        });

      }
    });

    self.event.subscribe('goFormSaved', function(form){

      //does this goForm DOCUMENT exist???
      var foundDoc = _.find(self.currentBoard.documents, 
        function(f){return f.blockType == 'goForm' && f.id == form.Id});

      //add document to tray if it doesnt exist...
      if(!foundDoc){
        var aBlock = self.data.getNewBlock();
        aBlock.description = form.Description;
        aBlock.blockType = 'goForm';
        aBlock.widthMult = 1;
        aBlock.heightMult = 1;
        aBlock.data = {'CreateDate': form.Date};
        aBlock.id = form.Id;
  
        self.currentBoard.documents.push(aBlock);
        self.documentCount = self.home.documentCount + 1;
      }

      //update existing goForm block with instanceId???
      var foundGoForm = _.find(self.currentBoard.blocks, 
        function(b){return b.blockType == 'goForm' && b.goFormId == form.FormId});
      if(foundGoForm){
        foundGoForm.goFormInstanceId = form.Id;

        //update board...
        self.data.saveVisitBoard(self.currentBoard);
        self.currentBoard.hasChanged=false;

      }

    });

    self.event.subscribe('daysheet_saved', function(){

      //refresh procedure card...
      let b = self.currentBoard;
      let procedureBlock = self.currentBoard.getBlockWithType('procedure');
      if(procedureBlock){
        procedureBlock.childModel.load();
      }

    });

   //window.onresize = function(){ self.goResized(); }

    //check size here...
    if(window.innerWidth <= 576){
      //console.log("MOBILE VIEW!");
      self.globals.mobileView = true;
    }

    window.localStorage.clear();
    window.localStorage.setItem(self.helper._user.UserName, self.helper._user.RoleName)
    //var usr = window.localStorage[self.helper._user.UserName]

    self.globals.isTouchDevice = self.isTouchDevice();

  }

  // goResized(){
  //   let h = window.innerHeight;
  //   let w = window.innerWidth;
  //   console.log("Width:" + w + ", height:" + h);
  // }

  getOrientation(){

    let self = this;
    self.refreshHeight();
    
    var orientation = window.innerWidth > window.innerHeight ? "Landscape" : "Portrait";
    return orientation;
  }

  getUserBoardById(boardId){
    var self = this;
    for(var i = 0; i < self.userBoards.length; i++){
      var aBoard = self.userBoards[i];
      if(aBoard.id == boardId){
        return aBoard;
      }
    }
    return null;
  }

  clearBoard(){
    var self = this;
    self.currentBoard = self.data.getNewBoard();
    self.currentBoard.description = "";
    self.documentCount = 0;
  }

  loadEmptyBoard(visitInfo, callback){
    var self = this;
    self.clearBoard();
    self.currentBoard.visitInfo = visitInfo;
    callback();
  }

  loadBoardWithPatientVisitData(visitData, providerId, callback){
    var self = this;

    var res=[];

    self.documentCount = 0;

    res = self.data.filterPatientVisitData(visitData, providerId);

    var visit = _.find(visitData, function(d){return d.Type == 'Visit'});

   // if(res.length > 0){

      var aBoard = self.data.getNewBoard();
      aBoard.description = "";
      aBoard.patientId = self.patient.data.PatientID;
      aBoard.providerId = visit.ProviderID;
      aBoard.userId = self.helper._user.UserID;
      aBoard.date = self.helper.getISODateToFormat(visit.ExamDateTime, "MM/DD/YYYY");
      if(visit.BoardId != null){
        aBoard.id = visit.BoardId;
      }


      var defaultBlocks = self.data.getBlocksWithVisitData(visitData);// self.data.getDefaultFollowUpBlocks();
      aBoard.blocks = defaultBlocks;

      var docs = _.filter(res, function(d){return d.type == 'document'});

      for(var i = 0; i < docs.length; i++){
        var block = docs[i];
        var aBlock = self.data.getNewBlock();
        aBlock.description = block.data.Description;

        aBlock.setBlockType(block.type);

        //aBlock.blockType =  block.type;//  'document';
        aBlock.widthMult = 2;
        aBlock.heightMult = 2;
        aBlock.data = block.data;
        // aBlock.id = block.data.ObjectID;
        aBlock.id = i;
        aBlock.objectId = block.data.ObjectID;

        if(block.type == 'document'){

          if(aBlock.data && aBlock.data.Bodyparts) {
            for(var bp = 0; bp < aBlock.data.Bodyparts.length; bp++){
              aBlock.bodyparts.push(aBlock.data.Bodyparts[bp]);
            }
          }

          aBoard.documents.push(aBlock);
          self.documentCount = self.documentCount + 1;
        }
      }

      self.currentBoard = aBoard;

      if(visit){
        let bodyparts = self.data.parseVisitBodyparts(visit.Part);
        var vInfo = self.data.getVisitInfo(aBoard.date, aBoard.patientId, visit.ProviderID, visit.Description, bodyparts, visit.BoardId == null ? aBoard.id : visit.BoardId, visit.ObjectID, visit.Locked);
        vInfo.bodyside = visit.DetailsMore;
        //vInfo.boardId = visit.BoardId;
        self.currentBoard.visitInfo = vInfo;

        //load visit code here...
        self.data.getVisitCode(vInfo.visitCodeId, function(vRes){
          self.currentBoard.visitInfo.visitCode = vRes;

          if(self.currentBoard.id == 0){
            //update visit board...
            self.data.saveVisitBoard(self.currentBoard, function(res){

              self.currentBoard.id = res.id;
              self.currentBoard.visitInfo.boardId = res.id;

              //update patientVisit list w/ boardId...
              self.updatePatientVisitBoardIdWithVisitCode(vRes.VisitCodeID, res.id);

              if(callback){
                callback(self.currentBoard);
              }
            })
          }else{
            if(callback){
              callback(self.currentBoard);
            }
          }
        });
      }


    //}
  }

  loadBoard(visitInfo, callback){
    var self = this;
    var aDate=  moment(visitInfo.date).format("MM-DD-YYYY");

    self.documentCount = 0;

    self.data.getPatientVisitData(visitInfo.patientId, moment(visitInfo.date).format("MM-DD-YYYY"), function(visitData){
      // var docs = self.getDocumentsFromPatientVisitData(visitData, visitInfo.providerId);

      self.getDocumentsFromPatientVisitData(visitData, visitInfo, function(docs){

        if(docs.length > 0){
          self.documentCount = docs.length;
        }
  
        if(visitInfo.boardId != null){
          //load w/ BoardId...
          self.data.getVisitBoardDataWithBoardId(visitInfo.boardId, function(res){
            self._getVisitBoardDataCallback(res, docs, visitInfo, callback);
          });
        }else{
          //load w/ patient, provider and date..
          self.data.getVisitBoardData(visitInfo.patientId, visitInfo.providerId, aDate, function(res){
            self._getVisitBoardDataCallback(res, docs, visitInfo, callback);
          });
        }


      });

    });
  }

  _getVisitBoardDataCallback(res, docs, visitInfo, callback){
    let self = this;
    self.currentBoard = res;
    self.currentBoard.documents = docs;
    self.currentBoard.visitInfo = visitInfo;

    //do we have a goForm docunemt???
    // var foundGoForm = _.find(self.currentBoard.documents, function(g){return g.blockType == 'goForm'});
    // if(foundGoForm){
    //   //do we have an exam card???
    //   var foundExamCard = _.find(self.currentBoard.blocks, function(b){return b.blockType == 'exam'});
    //   if(!foundExamCard){
    //     //create one...
    //     foundExamCard = self.data.getNewBlock();
    //     foundExamCard.setBlockType('exam');
    //     foundExamCard.widthMult = 2;
    //     foundExamCard.heightMult = 2;
    //     foundExamCard.id = self.currentBoard.blocks.length + 1;
    //     foundExamCard.x = 0;
    //     self.currentBoard.blocks.push(foundExamCard);
    //   }

    //   foundExamCard.loadData = false;
    //   //foundExamCard.dontSave = true;
    //   foundExamCard.goFormDetails = foundGoForm.description;
    // }

    //load visit code here...
    self.data.getVisitCode(visitInfo.visitCodeId, function(vRes){
      self.currentBoard.visitInfo.visitCode = vRes;

      if(callback){
        callback(self.currentBoard);
      }
    });
  }

  getDocumentsFromPatientVisitData(visitData, visitInfo, callback) {
    var self = this;
    var docs = [];

    var visit = _.find(visitData, function(v){return v.hasOwnProperty('ExamDateTime')});
    var visitDate = visit ? moment(visit.ExamDateTime).format('MM-DD-YYYY') : moment().format('MM-DD-YYYY');

    var res = self.data.filterPatientVisitData(visitData, visitInfo.providerId);

    //check for existing exams that need to have go forms...
    var examParts=[];
    var og_exams = _.filter(visitData, function(d){return d.Type == 'Exam' && d.ProviderID == visitInfo.providerId});
    if(og_exams.length > 0){
      for(var d = 0; d < og_exams.length; d++){
        var eData = og_exams[d];
        examParts.push(eData.Part);
      }
    }

    var dataObj={
      "PatientId":self.patient.data.PatientID,
      "ProviderID":visitInfo.providerId,
      "Date":visitDate,
      "Bodyparts":examParts
    }

    var goInstanceUrl = `goforms/instances/and/ogexams`;
    self.data.postWithUrlAndData(goInstanceUrl, JSON.stringify(dataObj), function(goRes){
      if (goRes && goRes.length > 0) {
        for (var i = 0; i < goRes.length; i++) {
          var goForm = goRes[i];
  
          var aBlock = self.data.getNewBlock();
          aBlock.description = goForm.Description;
          aBlock.blockType = 'goForm';
          aBlock.widthMult = 1;
          aBlock.heightMult = 1;
          aBlock.data = {'CreateDate': goForm.Date, 'formId': goForm.FormId, 'ObjectID': goForm.Id};
          aBlock.id = goForm.Id;
          //aBlock.objectId = goForm.Id;
          docs.push(aBlock);   
        }
      }

      if (res && res.length > 0) {
        for (var i = 0; i < res.length; i++) {
          var block = res[i];
  
          if(block.type == 'document'){// && block.data.TaskTypeDescription != "XRAY"){
            var aBlock = self.data.getNewBlock();
            if(block.data && block.data.Bodyparts){
              for(var bp = 0; bp < block.data.Bodyparts.length; bp++){
                aBlock.bodyparts.push(block.data.Bodyparts[bp]);
              }
            }

            //add patientId to data...
            block.data.PatientID = visitInfo.patientId;

            aBlock.description = block.data.Description;
            aBlock.blockType = 'document';
            aBlock.widthMult = 1;
            aBlock.heightMult = 1;
            aBlock.data = block.data;
            aBlock.id = block.data.ObjectID;
  
            docs.push(aBlock);
          }
        }
      }

      callback(docs);

    });
  }

  loadProviderWebdocs(proId){
    var self = this;
    self.data.getWebDocsWithProviderID(proId, function(res){

      //sort default and provider docs...
      var defDocs = _.filter(res, function(d){return d.ProviderId == 0});
      defDocs = _.sortBy(defDocs, function (d) {return d.Description});

      var proDocs = _.filter(res, function(d){return d.ProviderId == proId});
      proDocs = _.sortBy(proDocs, function (d) {return d.Description});

      self.webdocs.default = defDocs;
      self.webdocs.provider = proDocs;
    });
  }

  loadVisit(visitInfo, callback){
    var self = this;

    self.is_visit_today = self.helper.is_today(visitInfo.date)

    self.taskHelper.clear();

    self.loadProviderWebdocs(visitInfo.providerId);

    if(visitInfo.boardId == null){
        self.clearBoard();
      //load VisitData to load any documents for legacy visits...
      self.data.getPatientVisitData(visitInfo.patientId, moment(visitInfo.date).format("MM-DD-YYYY"), function(res){

        if(res && res.length == 0){
          self.loadEmptyBoard(visitInfo, function(res){
            if(callback){
              callback();
            }
          });
        }else{
          self.loadBoardWithPatientVisitData(res, visitInfo.providerId, function(board){

            //set task info here...
            var tt = self.taskHelper.getTaskTypeWithTypeAndDescription("board", "board");
            self.taskHelper.setObjectToTask(board.visitInfo.boardId, tt.Id);
            self.taskHelper.patientId = visitInfo.patientId;
            self.taskHelper.userId = self.helper._user.UserID;
            self.taskHelper.date = visitInfo.date;

            if(callback){
              callback();
            }
          });
        }
      });
    }else{
      //load the board...
      self.loadBoard(visitInfo, function(board){

        //set task info here...
        var tt = self.taskHelper.getTaskTypeWithTypeAndDescription("board", "board");
        self.taskHelper.setObjectToTask(board.visitInfo.boardId, tt.Id);
        self.taskHelper.patientId = visitInfo.patientId;
        self.taskHelper.userId = self.helper._user.UserID;
        self.taskHelper.date = visitInfo.date;

        if(callback){
          callback();
        }
      });
    }
  }

  loadVisitFromPrevious(visitInfo, previousBoard){
    var self = this;
    self.clearBoard();
    //load the board...
    self.currentBoard = previousBoard;
    self.currentBoard.visitInfo = visitInfo;

    if(previousBoard.documents.length > 0){
      self.documentCount = previousBoard.documents.length;
    }else{
      self.documentCount = 0;
    }
  }

  visitRowClicked(visitInfo){
    var self = this;

    self.loadVisit(visitInfo);
    self.toggleVisitPicker();
  }

  clearPatient(){
    var self = this;
    self.patient = self.data.getPatientEmpty(self.admin);
    self.patientVisits = [];
    self.currentVisit = null;
  }

  sendPatientToDrFirst(patientId){
    let self = this;
    if(self.erxEnabled){
      self.data.getWithUrl(`drfirst/patient?patientId=${patientId}`, function(res){
        var pat = res;
      });
    }
  }

  loadPatient(patientId, callback){
    var self = this;

    if(self.displayDaysheet){
      self.displayDaysheet = false;
      self.daysheetParams = null;
    }

    self.sendPatientToDrFirst(patientId);

    self.taskHelper.clear();

    var noty = self.helper.createNoty("loading patient...", 3000);
    noty.show();


    //close for pt dialog...
    if(self.ptDialog != null){
      self.ptDialog.canClose = true;
      self.ptDialog.controller.cancel();
      self.ptDialog = null;
    }

    self.clearPatient();
    self.clearBoard();

    self.data.getPatient(patientId, function(res){

      self.patient = res;



      self.doPatientAlerts(self.patient.data.PatientID);

      //self.getDrFirstUrl(patientId);

      //get patients visits...
      self.data.getPatientVisitsAndDocuments(patientId, function(res){

        if(!res) {
          noty.close();
          callback(self.patient);
          return;
        }

        //update visits with provider names...
        for(let v = 0; v < res.length; v++){
          let providerName = self.getProviderName(res[v].ProviderID);
          res[v].ProviderName = providerName;
          //fix possible nulls in Locked...
          if(res[v].Locked == null){
            res[v].Locked = 1;
          }

          res[v].selected = false;//add selected here...

          //od_visit alert...
          self.showPatientAlertIcon = res[v].HasPatientAlert;
        }

        self.patientVisits = res;

        noty.close();

        callback(self.patient);
      });
    });
  }

  getProviderName(providerId){
    let self = this;
    let aProvider = self.getProviderWithId(providerId);
    return aProvider ? aProvider.NameFirst.substring(0, 1) + " "  + aProvider.NameLast : "";
  }

  getProviderWithId(providerId){
    let self = this;
    return  _.find(self.allProviders, function(p){ return p.ProviderID == providerId});
  }

  doPatientAlerts(patientId){
    let self = this;

    //check if we have already displayed this alert...
    var alert_res = self.globals.check_patient_alert(patientId);
    if(alert_res){
      return;
    }

    //set alert status so we dont show it again...
    self.globals.add_patient_alert(patientId);

    let urlGet = 'alerts?location=general';// + 28;//41;
    let alertRun={
      Alerts:[]
    }

    self.data.getWithUrl(urlGet, function(res){
      if(!res){
        return;
      }
      for(let i = 0; i < res.length; i++){
        let alertParam={
          Alert: res[i],
          Params:[]
        }
        alertParam.Params.push({Param: 'PATIENTID', Value:patientId});
        alertRun.Alerts.push(alertParam);
      }
      self.data.postWithUrlAndData('alert/run', JSON.stringify(alertRun), function(alertRes){
        if(alertRes.hasOwnProperty('Response')){
          if(alertRes.Response.length > 0){
            self.popupHelper.openAlertPop(alertRes, {}, function(){

            });
          }
        }
      });
    });
  }


  getBodypartSideFromVisitWithBodypart(bodypart, callback){
    //check if we have MULTIPLE SIDES for same bodypart in visit...
    if(this.currentBoard && this.currentBoard.visitInfo){
      let bps = _.filter(this.currentBoard.visitInfo.bodyparts, function(b){return b.part.toUpperCase() == bodypart.toUpperCase()});
      if(bps.length > 1){
        //display bodyside picker...
        this.popupHelper.openBodysidePickerPop(function(side){
          //return proper bodypart w/ side...
          let bp = _.find(bps, function(bp){return bp.side.toUpperCase() == side.toUpperCase()});
          callback(bp);
        }, `Please select bodyside for ${bodypart}.`);
      }else{
        //return bodypart...
        callback(bps[0]);
      }
    }else{
      //no currentBoard / visitInfo...
      callback(null);
    }
  }



  webdocClick(webdoc){
    var self = this;
    var patientId = self.currentBoard.visitInfo.patientId;
    var date = self.currentBoard.visitInfo.date;
    var providerId= self.currentBoard.visitInfo.providerId;
    var userId = self.currentBoard.userId;

    // var noty = self.helper.createNoty("Generating " + webdoc.Description + "...", 3000);
    // noty.show();

    let addSql=[];

    if(self.currentBoard.visitInfo.bodyparts && self.currentBoard.visitInfo.bodyparts.length > 1){
      self.popupHelper.openBodypartPickerPop(self.currentBoard.visitInfo.bodyparts, function (pickerRes){
        let bodypartArray=[];
        for(let b = 0; b < pickerRes.bodyparts.length; b++){
          bodypartArray.push(pickerRes.bodyparts[b].part);
        }
        addSql = self.data.buildAdditionalSqlFromBodyparts(bodypartArray);
        //self._generateDocument(webdoc, patientId, providerId, userId, date, addSql);
        self._createDocumentName(webdoc, patientId, providerId, userId, date, pickerRes, function(res){

          if(res == null){
            return;
          }else if(res.documentId==null || res.documentId == 0){
            self._generateDocumentExtractName(webdoc, patientId, providerId, userId, date, addSql, res.filepath, pickerRes.bodyparts);
          }else{
            //open exisitng...
            self.popupHelper.openDocPop(res.documentId);
          }
        });
      });
    }else{
      self._createDocumentName(webdoc, patientId, providerId, userId, date, null, function(res){

        if(res == null){
          return;
        }else if(res.documentId==null || res.documentId == 0){
      
          self._generateDocumentExtractName(webdoc, patientId, providerId, userId, date, addSql, res.filepath, self.currentBoard.visitInfo.bodyparts);
        }else{
          //open exisitng...
          self.popupHelper.openDocPop(res.documentId);
        }


      });
    }
  }


  _createDocumentName(webdoc, patientId, providerId, userId, date, bodypartsides, callback){
    let self = this;
    self.data.createDocumentName(webdoc, patientId, providerId, userId, date, false, bodypartsides,
      function(doc){

        if(doc.locked){
          //deal w/ locked document..
          let message = `This ${webdoc.Description} is locked. Please unlock to modify or create an addendum.`;
          let header = 'Document Locked!';
          let options=['OK'];
          self.popupHelper.openGenericMessagePop(message, header, options, true, function(res){
            callback(null);
            return;
          });
        }
        if(doc.exists){
          //document exists...
          let message = `A ${webdoc.Description} has already been created for this patient for the current date. Do you want to recreate?`;
          let header = 'Document Exists!';
          let options=['YES', 'NO'];
          self.popupHelper.openGenericMessagePop(message, header, options, true, function(res){
            if(res.result == 'NO'){
              callback(doc);
            }else{
              doc.documentId = 0;//recreate document...
              callback(doc);
            }
          });
        }else{
          callback(doc);//zero
        }
    });
  }


  _generateDocumentExtractName(webdoc, patientId, providerId, userId, date, addSql, filepath, bodyparts){
    let self = this;

    var noty = self.helper.createNoty("Generating " + webdoc.Description + "...", 3000);
    noty.show();

    self.data.generateDocumentExtractName(webdoc, patientId, providerId, userId, date, addSql, filepath, function(res){
      var aBlock = self.data.getNewBlock();
      aBlock.description = res.DocumentType;
      aBlock.blockType = 'document';

      if(bodyparts){
        for(var i = 0; i < bodyparts.length; i++){
          aBlock.bodyparts.push(bodyparts[i].part);
        }
      }

      //hack for fixing CreationDate=>CreateDate....
      res.CreateDate = res.CreationDate;

      aBlock.data = res;
      aBlock.id = res.DocumentID;

      var success = self.currentBoard.addDocument(aBlock);
      if(success){
        self.documentCount = self.documentCount + 1;
      }

      //get task type...
      let tt = self.taskHelper.getTaskTypeWithTypeAndDescription("DOCUMENT", res.DocumentType);

      //launch document...
      self.popupHelper.openDocPop(res.DocumentID, undefined, tt.Id);

      noty.close();

      //expand document tray...
      $(self.docTray).collapse('show');
    });
  }




  _generateDocument(webdoc, patientId, providerId, userId, date, addSql){
    let self = this;

    var noty = self.helper.createNoty("Generating " + webdoc.Description + "...", 3000);
    noty.show();

    self.data.generateDocument(webdoc, patientId, providerId, userId, date, addSql, function(res){
      var aBlock = self.data.getNewBlock();
      aBlock.description = res.DocumentType;
      aBlock.blockType = 'document';

      //hack for fixing CreationDate=>CreateDate....
      res.CreateDate = res.CreationDate;

      aBlock.data = res;
      aBlock.id = res.DocumentID;

      var success = self.currentBoard.addDocument(aBlock);
      if(success){
        self.documentCount = self.documentCount + 1;


        //launch document...
        self.popupHelper.openDocPop(res.DocumentID);
      }

      noty.close();

      //expand document tray...
      $(self.docTray).collapse('show');
    });
  }


  displayDocumentPopup(url){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: DocumentPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, documentUrl: url}}).whenClosed(response => {

    });
  }

  displayAdmin(){
    let self = this;
    self.adminVisible = true;
  }

  displayKioskDashboard(){
    let self = this;
    let path = '../phxCheckinDashboard/home';
    let date = moment().format('MM/DD/YYYY');
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let options={
      displayHeader: false,
      bodyPadding: 0
    }

    self.popupHelper.openViewModelPop(path, {jwt: self.helper._jwt, userid: self.helper._user.UserID, date: date}, "Kiosk", windowWidth, windowHeight, 0, 0, options, function(res){

    });
  }


  openCharges(){
    let self = this;
    let path = './submitCharges';
    let date = moment().format('MM/DD/YYYY');
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let third = windowWidth / 3;

    let width = third * 2;
    let left = third / 2;

    // let height = windowHeight / 2;
    // let qHeight = windowHeight / 4;
    // let top = qHeight;

    let height = windowHeight - 10;
    let top = 0;


    let options={
      displayHeader: false,
      bodyPadding: 0
    }

    self.popupHelper.openViewModelPop(path, self, "", width, height, top, left, options, function(res){

    });
  }

  openCamera(callback){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let third = windowWidth / 3;

    let topThird = windowHeight / 3;

    let width = 'auto';
    let left = third / 2;
    let height='auto';
    let top = topThird / 2;

    let options={
      bodyPadding: 0,
      scrollHeight: 300
    }
    self.popupHelper.openViewModelPop('./camera', self,'',width,height,top,quarter,options,function(res){
        let imgData = res.image;
        callback(imgData);
    });
  }

  openInboundFax(type){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // let left = self.sidebar.clientWidth;
    // let width = windowWidth - left;
    let left = windowWidth / 2;
    let width = left;
    let top = 0;//self.bluebar.clientHeight;
    let height=windowHeight;// - top;


    let options={
      bodyPadding: 0,
      scrollHeight: 300,
      dropshadow: false,
      displayHeader: false
    }

    let vmObj={
      home: self,
      'filewatcherType': type
    }

    self.popupHelper.openViewModelPop('../fax/inbound', vmObj,'',width,height,top,left,options,function(res){
        // let imgData = res.image;
        // callback(imgData);
    });
  }


  openPhonecall(){
    let self = this;

    let path = './phoneCall';
    let date = moment().format('MM/DD/YYYY');
    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let third = windowWidth / 3;

    let width = third * 2;
    let left = third / 2;

    // let height = windowHeight / 2;
    // let qHeight = windowHeight / 4;
    // let top = qHeight;

    let height = windowHeight;// - 10;
    let top = 0;


    let options={
      displayHeader: false,
      bodyPadding: 0,
      overlayTop : 50,
      overflowY: "hidden"
    }

    //cache current task...
    self.taskHelper.cacheObjectToTask(self.taskHelper.objectId, self.taskHelper.taskTypeId);

    self.popupHelper.openViewModelPop(path, self, "", width, height, top, left, options, function(res){

      //retrieve cached task object...
      self.taskHelper.setObjectToTask(self.taskHelper.cacheObjectId, self.taskHelper.cacheTaskTypeId);
      self.taskHelper.clearCachedTask();
    });

  }


  taskObject(patientId, providerId, date, objectId, taskTypeId, openTaskedObject){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.popupHelper.openTaskPop(patientId, providerId, date,
      objectId, taskTypeId, self,
      function(res){
        if(openTaskedObject){
          self.openTask(res.taskToOpen);
        }
      }, null, {closeActiveDialog: false});
  }

  taskObjectList(TaskPopupObjects, openTaskedObject){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.popupHelper.openTaskPopNew(TaskPopupObjects, self,
      function(res){
        if(openTaskedObject){
          self.openTask(res.taskToOpen);
        }
      }, null, {closeActiveDialog: false});
  }

  openDocument(documentId, taskTypeId){
    var self = this;
    //cache current tasktype / object id so we can load it back once xray OR document is closed....
    self.taskHelper.cacheCurrentTask();
    self.popupHelper.openDocPop(documentId, undefined, taskTypeId);  
  }

  openPdf(documentPath, patientId){

    let self = this;

    console.log('openPdf', documentPath);

    self.taskHelper.cacheCurrentTask();
    self.popupHelper.openPdfPop(patientId, documentPath, function(){}, false);

    var splitArray = documentPath.split("\\");
    var length = splitArray.length;
    var patientId=null;
    var filepath = null;
    if(length > 0){
      //get last two items in array...
      patientId = splitArray[length - 2];
      filepath = splitArray[length - 1]
    }
    if(patientId != null && filepath != null) {
      self.popupHelper.openPdfPop(patientId, filepath, function(){}, true);
    }
    if(documentPath){
      self.popupHelper.openPdfPop(patientId, documentPath, function(){}, false);
    }
  }


  openReturnTo(){
    let self = this;

    if(self.currentBoard == null || self.currentBoard.visitInfo == null){
      return;
    }

    let path = './returnForm';
    let date = moment().format('MM/DD/YYYY');
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let third = windowWidth / 3;

    let width = third * 2;
    let left = third / 2;

    let height = windowHeight - 10;
    let top = 0;

    let options={
      displayHeader: false,
      bodyPadding: 0
    }

    self.popupHelper.openViewModelPop(path, self, "", width, height, top, left, options, function(res){

    });
  }


  openPtOrder(path){
    let self = this;

    if(!self.currentBoard && !self.currentBoard.visitInfo){
      return;
    }

    //let path = './ptOrder';
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    //let quarter = windowWidth / 4;
    let third = windowWidth / 3;

    let width = third * 2;
    let left = third / 2;

    let height = windowHeight - 10;
    let top = 0;

    // if(path.includes("surgery")){
    //   //change top / height...
    //   let thirdHeight = windowHeight / 3;
    //   top = thirdHeight / 2;
    //   height = thirdHeight * 2;
    // }

    let options={
      displayHeader: false,
      bodyPadding: 0
    }

    self.popupHelper.openViewModelPop(path, self, "", width, height, top, left, options, function(res){

    });
  }




  displayTaskForm(){
    let self = this;

    self.popupHelper.openMessagePop(function(response){
        let res = response;
        if(res != null){
            //open task....
          self.openTask(res);
        }
    }, self.popupHelper, self);

  }

  openTask(task){
    var self = this;
    self.loadPatient(task.PatientID, function(res){
      //open visit for the date...
      var tDate = self.helper.getDateWithFormat(task.Date, 'MM/DD/YYYY');

      var visit = _.find(self.patientVisits, function(v) {
        var vDate = self.helper.getISODateToFormat(v.ExamDateTime, 'MM/DD/YYYY');
        return vDate == tDate
      });


      var visitInfo = null;

      if(visit != null && visit != undefined){
        var vData = visit;
        var vDate = self.helper.getISODateToFormat(vData.ExamDateTime, "MM/DD/YYYY");
        let bodyparts = self.data.parseVisitBodyparts(vData.Part);
        visitInfo = self.data.getVisitInfo(vDate, task.PatientID, vData.ProviderID, vData.Desccription, bodyparts, vData.BoardId, vData.ObjectID, vData.Locked);
      }else{
        //no visit found....
        var vDate = self.helper.getISODateToFormat(task.DateCreated, "MM/DD/YYYY");
        visitInfo = self.data.getVisitInfo(vDate, task.PatientID, task.ProviderID, "", undefined, null,"", false);
      }

      self.loadVisit(visitInfo, function(){

        if(task.Type == 'DOCUMENT'){
          //launch document...
          self.popupHelper.openDocPop(task.formID);
        }else if(task.Type == 'PHONE'){
          //launch Phone call...
          //self.popupHelper.openDocPop(task.formID);
          self.openPhonecall();
        }else{
          //get task type...
          var tt = self.taskHelper.getTypeWithId(task.TypeID);
          if(tt != undefined){

            //xray...
            if(tt.Description.toLowerCase()=='xray'){
              //load xray info...
              self.data.getXrayWithId(task.formID, function(res){
                self.popupHelper.openXrayPop(res.ImagePath);
              });
            }

            //board...
            if(tt.TypeAsString.toLowerCase() == 'board'){
              self.data.loadVisitBoardWithId(task.formID, function(res){

                var vDate = self.helper.getISODateToFormat(res.ExamDateTime, "MM/DD/YYYY");
                var vi = self.data.getVisitInfo(vDate, res.PatientId, res.ProviderId, "", [], 0, res.VisitCodeId, false);


                //self.loadVisit(vi);
                self.loadBoard(vi);

              });
            }

          }
        }
      });
    });
  }

 loadPatientWithMostRecentVisit(patientId) {
    var self = this;

    self.loadPatient(patientId, function(res) {

        if(self.patientVisits.length > 0) {

            //visit data...
            var vData = null;

            //check for multiple visits on same day...
            var multiVisits = _.filter(self.patientVisits, function(v) {
                return self.helper.getISODateToFormat(v.ExamDateTime, "MM/DD/YYYY") == self.globals.scheduleDate
            })

            if(multiVisits.length > 1) {
                //return visit with current provider...
                vData = _.find(multiVisits, function(v) {
                    return v.ProviderID == self.currentProvider.ProviderID
                })
            } else {
                //just get first visit...
                vData = self.patientVisits[0];
            }

            //select visit in visit picker...
            for(let v = 0; v < self.patientVisits.length; v++) {
                if(self.patientVisits[v].ObjectID == vData.ObjectID) {
                    self.patientVisits[v].selected = true;
                } else {
                    self.patientVisits[v].selected = false;
                }
            }

            var vDate = self.helper.getISODateToFormat(vData.ExamDateTime, "MM/DD/YYYY");
            let bodyparts = self.data.parseVisitBodyparts(vData.Part);
            var vi = self.data.getVisitInfo(vDate, res.data.PatientID, vData.ProviderID, vData.Description, bodyparts, vData.BoardId, vData.ObjectID, vData.Locked);
            vi.providerName = vData.ProviderName;
            self.loadVisit(vi);
        } else {
            //NO VISITS!!!
            var vi = self.data.getVisitInfo(vDate, patientId);
            self.loadVisit(vi);
        }
    });
}

  

  loadPatientWithDate(patientId, date){
    var self = this;
    self.loadPatient(patientId, function(res){
      if(self.patientVisits.length > 0){
        var vData = _.find(self.patientVisits, function(v){return moment(v.ExamDateTime).format('MM/DD/YYYY') == date})
        if(vData){
          var vDate = self.helper.getISODateToFormat(vData.ExamDateTime, "MM/DD/YYYY");
          let bodyparts = self.data.parseVisitBodyparts(vData.Part);
          var vi = self.data.getVisitInfo(vDate, res.data.PatientID, vData.ProviderID, vData.Description, bodyparts, vData.BoardId, vData.ObjectID, vData.Locked);
          self.loadVisit(vi);
        }
      }
    });
  }

  loadPatientWithDateAndProviderId(patientId, date, providerId){
    var self = this;
    self.loadPatient(patientId, function(res){
      if(self.patientVisits.length > 0){
        var vData = _.find(self.patientVisits, function(v){return moment(v.ExamDateTime).format('MM/DD/YYYY') == date && v.ProviderID == providerId})
        if(vData){
          var vDate = self.helper.getISODateToFormat(vData.ExamDateTime, "MM/DD/YYYY");
          let bodyparts = self.data.parseVisitBodyparts(vData.Part);
          var vi = self.data.getVisitInfo(vDate, res.data.PatientID, vData.ProviderID, vData.Description, bodyparts, vData.BoardId, vData.ObjectID, vData.Locked);
          self.loadVisit(vi);
        }
      }
    });
  }

  createPatient(callback){

    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    let width = windowWidth - 71;
    let left = 71;//third / 2;

    let height = windowHeight;// - 10;
    let top = 0;

    let options={
      bodyPadding: 0,
      displayHeader: false
    }

    //get new patient object...
    self.data.getWithUrl('patient', function(newPatient){

      self.popupHelper.openViewModelPop('./patientDetails', 
        {"disableDemographics": false, 
        "scrollHeight": windowHeight - 50, 
        "patient": newPatient,
        "displayInPopup": true},
        'New Patient',
        width,
        height,
        top,
        left,
        options,function(res){

          if(res.cancelled)return;
  
          if(callback){
            callback(res);
          }

      });

    });
  } 

  displayPatientSearch(){
    let self = this;
    self.popupHelper.openPatientPop(true, false, function(patientId){
      //load patient???
      if(!patientId.hasOwnProperty('cancelled') && !patientId.createPatient){
        self.loadPatientWithMostRecentVisit(patientId);
      }else if(patientId.hasOwnProperty('createPatient')){
        self.createPatient();
      }
    });
  }

  updateExisitingBlockTypes(boardType){
    let self = this;
    for(let i = 0; i < self.currentBoard.blocks.length; i++){
      let aBlock = self.currentBoard.blocks[i];
      if(aBlock.blockType === 'hpi'){
        aBlock.childModel.boardType = boardType;
        if(aBlock.childModel.data){
          aBlock.childModel.data.HpiType = boardType;
        }
      }else if(aBlock.blockType === 'plan'){
        aBlock.childModel.boardType = boardType;
        if(aBlock.childModel.data){
          for(let p = 0; p < aBlock.childModel.data.length; p++){
            let aPlan = aBlock.childModel.data[p];
            aPlan.PlanType = boardType;
          }
        }
      }else if(aBlock.blockType === 'exam'){
        aBlock.childModel.boardType = boardType;
        if(aBlock.childModel.data){
          aBlock.childModel.data.TYPE = boardType;
        }
      }
    }
  }

  openProcedureSearch(){

    var self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.popupHelper.openProcedureSearchPop('VISIT', false, function(pxs){
      if(pxs != null){

        for(let i = 0; i < pxs.length; i++){
          var px = pxs[i]
          //add bodypart, bodyside
          px.bodypart = self.currentBoard.visitInfo.bodypart;
          px.bodyside = self.currentBoard.visitInfo.bodyside;
          //px.jcodeunits = 1;

          self.data.saveProcedure(px, self.currentBoard.visitInfo.patientId, self.currentBoard.providerId, self.currentBoard.visitInfo.date, function(res){

            self.currentBoard.visitInfo.visitCode.Visit_Code_Selected = res.CptCode;

            self.data.updateVisitCode(self.currentBoard.visitInfo.visitCode, function(vcRes){
              self.currentBoard.visitInfo.visitCode = vcRes;
            });
          });
        }
      }
    });
  }

  openVisitPopup(){
    let self = this;
    self.popupHelper.openCreateVisitPopup(self.currentBoard.visitInfo, self, function(res){

      let visitObj = res.visitObject;
      let visitType = visitObj.visitType;
      let bps = visitObj.bodyparts;


      let bodypartsString = self.data.bodypartsToString(bps);

      var visitTypeChanged = false;
      if(self.currentBoard.visitInfo.visitCode.Visit_Type != visitType){
        visitTypeChanged = true;
      }

      var visitProviderChanged = false;
      var originalVisitCodeProviderId = self.currentBoard.visitInfo.visitCode.ProviderID;
      if(self.currentBoard.visitInfo.visitCode.ProviderID != visitObj.providerId){
        visitProviderChanged = true;
      }

      self.currentBoard.visitInfo.visitCode.Visit_Type = visitType;

      self.currentBoard.visitInfo.visitCode.VisitBodyParts = bodypartsString;

      self.currentBoard.visitInfo.visitCode.ProviderID = visitObj.providerId;
      self.currentBoard.providerId = visitObj.providerId;
      self.currentBoard.visitInfo.providerName = self.getProviderName(visitObj.providerId);
      self.currentBoard.visitInfo.visitCode.BillingProvider = visitObj.billingProviderId;


      self.data.updateVisitCode(self.currentBoard.visitInfo.visitCode, function(vcRes){
        self.visitType = visitType;

        self.currentBoard.visitInfo.visitType = visitType;
        self.currentBoard.visitInfo.bodyparts = bps;
  
        self.currentBoard.visitInfo.isPt = false;
        if(visitType.toLowerCase() == 'pt visit' || visitType.toLowerCase() == 'ot visit'){
          self.currentBoard.visitInfo.isPt = true;
        }

        //has visit type changed??? if so, check if we need to update
        //exam, plan, hpi types...
        if(visitTypeChanged){
          var blockType = 'FOLLOW';
          if(self.currentBoard.visitInfo.isPt){
            blockType = visitType.toUpperCase();
            blockType = blockType.replace("VISIT", "");
            blockType = blockType.trimEnd()
          }
          self.currentBoard.visitInfo.typeForSave = blockType;
          self.updateExisitingBlockTypes(blockType);
        }
   
        //update visit description w/ objectId and visitCodeId
        let visitToUpdate = _.find(self.patientVisits, function(v){return v.ObjectID == self.currentBoard.visitInfo.visitCodeId});
        if(visitToUpdate){
          visitToUpdate.Description = visitType;
          visitToUpdate.Part = bodypartsString;
          visitToUpdate.ProviderID = visitObj.providerId;
          visitToUpdate.ProviderName = self.getProviderName(visitObj.providerId);
        }

        if(visitProviderChanged){

          //update visit board provider...
          self.data.saveVisitBoard(self.currentBoard, function(res){

            //update visit provider...
            var obj={
              'NewProviderID': visitObj.providerId,
              'ExistingProviderID': originalVisitCodeProviderId,
              'ExistingPatientID': self.currentBoard.visitInfo.visitCode.PatientID,
              'ExistingDate': moment(self.currentBoard.visitInfo.visitCode.ExamDateTime).format('MM-DD-YYYY')
            }
            self.data.putWithUrlAndData('visit/changeprovider', obj, function(res){

              //set all blocks to locked so to NOT save current provider on blocks back to db...
              self.setBlocksToLocked(self.currentBoard.blocks);

              //reload visit...
              self.loadVisit(self.currentBoard.visitInfo);
            });


          });

        }else{
          //reload visit...
          self.loadVisit(self.currentBoard.visitInfo);
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
}
