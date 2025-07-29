/**
 * Created by tylerjones on 11/10/17.
 */

import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {bindable, inject} from 'aurelia-framework';
import {PtDatagridHelper} from './ptDatagridHelper';
import {DialogService} from 'aurelia-dialog';
import {Calculator} from '../ptdaysheet/calculator';
import {BindingSignaler} from 'aurelia-templating-resources';
import {TabPopup} from '../ptdaysheet/tabPopup';
import {DatePopup} from '../ptdaysheet/datePopup';
import {AlertPopup} from '../ptdaysheet/alertPopup';
import moment from 'moment';
import {EventAggregator} from 'aurelia-event-aggregator';
import {DayTimePopup} from '../ptdaysheet/dayTimePopup';
import {StopwatchHelper} from '../ptdaysheet/stopwatchHelper';
import * as _ from "lodash";
import {getIsEditing, setIsEditing} from "./editingHelper";
import {AuthorizePop} from '../ptdaysheet/authorizePop';
import {computedFrom} from 'aurelia-framework';




class AlertObject{
  constructor(title, text, iconClass, iconColor){
    this.title = title;
    this.text = text;
    this.iconColor = iconColor ? iconColor : 'black';
    this.iconClass = iconClass;
    this.showCancel=false;
  }
}

@inject(helper,http,PtDatagridHelper,DialogService, BindingSignaler, EventAggregator, StopwatchHelper)
export class Datagrid {

  //longDescriptionsVisible = true;
  therapyTimer = null;
  lapsedTime=0;
  activityColumnWidth = 100;
  gridMaxHeight = 300;
  screenWidth=500;
  screenHeight=500;
  goalDropdownItems=["Short-Term Goal", "Mid-Term Goal", "Long-Term Goal"];
  bodypartList =['Foot','Ankle', 'Knee', 'Hip', 'Hand', 'Wrist', 'Elbow','Shoulder','Cervical','Thoracic', 'Lumbar'];
  //selectedBodypart=null;
  // @bindable datepicker;
  // selectedDate;
  displayDebugTools=false;
  displayPreferences = false;

  dayColumnWidth = 200;

  columnWidthProperty="width:200px;";

  //test this change

  displayAuthorizationButton = false;
  displayCloseButton = false;
  parent=null;

  prefSaveSubscriber=null;

  assessmentHeight = 0;

  addGoalPlusEnabled = true;

  dialog = false;
  providerList=[];
  selectedProvider=null;

  @computedFrom('selectedProvider', 'datagridHelper.bodyPart')
  get canCreateNewPref() {
    let self = this;
    if(self.selectedProvider && self.datagridHelper.bodyPart){
      return true;
    }else{
      return false;
    }
  }


  constructor(helper, http, PtDatagridHelper,dialogService, bindingSignaler, eventAggregator, StopwatchHelper){
    this.helper = helper;
    this.http = http;
    this.datagridHelper = PtDatagridHelper;
    this.dialogService = dialogService;
    this.bindingSignaler = bindingSignaler;
    this.ea = eventAggregator;
    this.stopwatch = StopwatchHelper;
  }

  activate(params) {

    if(params==undefined)return;
    //console.log('window', window);

    let self = this;

    //here we check for out authentication key
    //IF it hasn't been obtained yet, we look to the query string
    if(typeof this.helper.jwt() === 'undefined' ||
      this.helper.jwt() == null){

      //if we find an API key in the query string
      //we need to re-authenticate to make sure it is still valid
      if (params.hasOwnProperty("jwt")){
        this.helper.processToken(params.jwt);
      }
    }
    else{
      //if we already have the apiKey we dont need to authenticate
      //mustAuthenticate = false;
    }

    if (params.hasOwnProperty("displayPreferences")){
      this.displayPreferences = params.displayPreferences;
    }

    if (params.hasOwnProperty("patientid")){
      this.datagridHelper.patientId = params.patientid;
    }

    if (params.hasOwnProperty("providerid")){
      this.datagridHelper.providerId = params.providerid;
    }

    if (params.hasOwnProperty("bodypart")){
      this.datagridHelper.bodyPart = params.bodypart;
    }

    if (params.hasOwnProperty("userid")){
      this.datagridHelper.userId = params.userid;
    }

    if (params.hasOwnProperty("visitdate")){
      this.datagridHelper.visitDate = params.visitdate;
    }

    if (params.hasOwnProperty("type")){
      this.datagridHelper.daysheetType = params.type;
    }

    if (params.hasOwnProperty("displayCloseButton")){
      this.displayCloseButton = params.displayCloseButton;
    }
    if (params.hasOwnProperty("parent")){
      this.parent = params.parent;
    }

    if (params.hasOwnProperty("dialog")){
      self.dialog = params.dialog;
    }

    if (params.hasOwnProperty("providers")){
      //self.providerList = params.providers;
      //select current provider...
      for(let i = 0; i < params.providers.length; i++){
        let pro = params.providers[i];
        //dont use "ALL" provider...
        if(pro.ProviderEntity != 'All'){
          self.providerList.push(pro);
        }
        if(self.datagridHelper.providerId != null &&
           pro.ProviderID == self.datagridHelper.providerId){
          self.selectedProvider = pro;
        }
      }
    }


    if (params.hasOwnProperty("editMode")){
      this.datagridHelper.editMode =params.editMode;
      this.datagridHelper.displayAssessment = true;
    }

    this.datagridHelper.activate(function(){

    }); // THIS IS A CHANGE

    //this.longDescriptionsVisible = true;

    self.ea.subscribeOnce('showAlert', function(alertObject) {
        self.showAlertPopup(alertObject);
    });

    self.prefSaveSubscriber = self.ea.subscribe('preferenceMessage', function(obj) {
      if(obj.message == 'create'){
        var pid = obj.prefId;
        let desc = obj.description;
        let bp = obj.bodypart;
        let proId = self.selectedProvider ? self.selectedProvider.ProviderID : null;
        self.datagridHelper.saveNewPreference(desc, pid, bp, proId);
      }else if (obj.message == 'update'){
        var pid = obj.prefId;
        let desc = obj.description;
        let bp = obj.bodypart;
        self.datagridHelper.updatePreference(desc, pid, bp);
      }else if(obj.message == 'load'){
        var pid = obj.prefId;
        self.datagridHelper.selectPreferenceByPrefId(pid);
      }
    });

    self.ea.subscribe('resizeDatagrid', function(){
      self.resizeDatagrid();
    })

    self.ea.subscribe('savedaysheet', function(){
      //self.resizeDatagrid();
      self.datagridHelper.saveDaysheet();
    })

    //this i is for calling back into GO after save....
    window.onmessage= function(event){
      if (event.data == 'savedaysheet') {
        self.datagridHelper.saveDaysheet(function(){
          window.top.postMessage('savedaysheetcomplete', '*');
        });
      }
      if(event.data=='gosetup'){
        self.displayAuthorizationButton = true;
      }

      // if(event.data.hasOwnProperty('message')){
      //   if(event.data.message=='loadpreference'){
      //     let pid = event.data.prefId;
      //     self.datagridHelper.selectPreferenceByPrefId(pid);
      //   }
      //   if(event.data.message=='savenewpreference'){
      //     let pid = event.data.prefId;
      //     let desc = event.data.description;
      //     let bp = event.data.bodypart;
      //     self.datagridHelper.saveNewPreference(desc, pid, bp);
      //   }
      //   if(event.data.message=='updatepreference'){
      //     let pid = event.data.prefId;
      //     let desc = event.data.description;
      //     let bp = event.data.bodypart;
      //     self.datagridHelper.updatePreference(desc, pid, bp);
      //   }
      // }


    };

  }

  providerSelected(){
    let self = this;
    if(self.selectedProvider){
      self.datagridHelper.loadProviderPrefsWithIdAndBodypart(self.selectedProvider.ProviderID, self.datagridHelper.bodyPart);
    }
  }

  providerPrefSelected(){
    let self = this;
    self.datagridHelper.selectPreferenceByPrefId(self.datagridHelper.selectedProviderPref.PrefID);
  }

  closeButtonClick(){


    if(!this.datagridHelper.editMode){
      //do save!!!
      this.prefSaveSubscriber.dispose();
      this.datagridHelper.saveDaysheet();
    }

    this.parent.daysheetParams=null;
    this.parent.displayDaysheet=false;

    if(this.dialog){
      this.dialog.close();
    }
  }


  deactivate(){
    if(!this.datagridHelper.editMode){
      this.datagridHelper.saveDaysheet();
    }
  }

  detached(){
    if(!this.datagridHelper.editMode){
      this.datagridHelper.saveDaysheet();
    }
  }

  unbind(){
    if(!this.datagridHelper.editMode){
      this.datagridHelper.saveDaysheet();
    }
  }

  showAlertPopup(alertObject, callback){
    let self = this;
    self.dialogService.open({viewModel: AlertPopup, model: alertObject}).whenClosed(response => {
      let r = response;
      if(callback){
        callback(response);
      }
    });
  }

  showHideDebugTools(){
    this.displayDebugTools = this.displayDebugTools ? false : true;
  }

  showDatePopup(){
    let self = this;
    self.dialogService.open({viewModel: DatePopup, model: null}).whenClosed(response => {

      let display = response.output.display;
      let value = response.output.date;

      let result = "";
      if(display==="days" || display === "weeks"){
        result = value;
      }else{
        let d = moment(response.output.date, "MM/DD/YYYY");
        result = d.format("MM/DD/YYYY");
      }
      self.datagridHelper.selectedGoal.dueDate = result;
      self.datagridHelper.selectedGoal.dateFormat = display;

      self.datagridHelper.calculateGoalAlertTime(self.datagridHelper.selectedGoal);
      // let start = moment().format("MM/DD/YYYY");
      // self.datagridHelper.selectedGoal.startDate = start;

      //update changes to goal...
      self.datagridHelper.saveGoal(self.datagridHelper.selectedGoal, function(res){

      });

    });
  }

  attached() {
    console.log("daysheet LOADED");

    let self = this;

    // $('#assessmentDropdownItems').on('click', function (event) {
    //   // The event won't be propagated up to the document NODE and
    //   // therefore delegated events won't be fired
    //   if (event.target.className == 'fa fa-eye mx-1 au-target') {
    //
    //     $(event.target).popover('toggle');
    //     event.stopPropagation();
    //   }
    // });

    // $('#assessmentDropdown').on('hide.bs.dropdown', function () {
    //   $('.popover').remove();
    // })


    $('#dischargeDropdownItems').click(function(e) {
      e.stopPropagation();
    });

    // document.addEventListener('aurelia-composed', () => {
    //     self.resizeDatagrid();
    // });



    //activityHeader.addEventListener("load", self.resizeActivityColumn);

    // if(this.mainCard && this.grid){
    //   this.gridMaxHeight = this.mainCard.clientHeight - this.grid.clientHeight;
    // }

    // if(this.mainCard && this.toolbar){
    //   this.gridMaxHeight = this.mainCard.clientHeight - (this.toolbar.clientHeight + 54);
    // }

    this.resizeDatagrid();

    this.screenWidth = $(window).width();// - 4;
    this.screenHeight = $(window).height();// + 10;

    $('html').css('overflow','hidden');


    let dt = $('[data-toggle="tooltip"]');//.tooltip();
    if(dt){
      if(dt[0].tooltip){
        dt[0].tooltip();
      }
    }

    // setTimeout(function(){
    //   self.resizeActivityColumn(self)
    // }, 3000);

    self.resizeActivityColumn(self);


    window.top.postMessage('datagridattached', '*');

    if(self.datagridHelper.displayAssessment){
      self.assessmentHeight =  self.assessmentdiv.clientHeight;
    }else{
      self.assessmentHeight = 0;
    }


  }

  showCalculator(d){

  }

  setupPopovers(){
    $('#assessmentDropdownItems').on('click', function (event) {
      // The event won't be propagated up to the document NODE and
      // therefore delegated events won't be fired
      if (event.target.className == 'fa fa-eye mx-1 au-target') {

        $(event.target).popover('toggle');
        event.stopPropagation();
      }
    });

    $('#assessmentDropdown').on('hide.bs.dropdown', function () {
      $('.popover').remove();
    })
  }

  resizeDatagrid(){

    var self = this;

    if(this.mainCard && this.toolbar){
      // this.gridMaxHeight = this.mainCard.clientHeight - (this.toolbar.clientHeight + 54);
      this.gridMaxHeight = (this.toolbar.clientHeight - (54 + 44));


      //self.resizeActivityColumn();

    }
  }

  dischargeClick(event){
    if (event.target.className == 'fa fa-eye mx-1 au-target') {

      $(event.target).popover('toggle');
      //event.stopPropagation();
    }
  }

  blockClose(e){
    e.preventDefault();
  }

  editDayTimeClick(day){
    let self = this;
    self.dialogService.open({viewModel: DayTimePopup, model: day}).whenClosed(response => {
      day.totalTime = response.output;
    });
  }



  deleteDayClick(day){
    this.datagridHelper.selectedGoal.selectedTab.deleteDay(day, this.datagridHelper);
  }

  refreshClick(){
    this.datagridHelper.activate();
  }

  resizeActivityColumn(ctx){

    setTimeout(function(){


      let self = ctx;
      self.activityColumnWidth = 100;

      self.columnWidthProperty="width:200px;";

      let t = $("#daysheetTable tr");

      $("#daysheetTable tr").each(function(){
        let txtEl = $(this).find("td:first");
        if(txtEl.length > 0){
          let font =self.getFont(txtEl);
          let txt = txtEl.text();

          let w = self.getTextWidth(txt, font);

          if(w > self.activityColumnWidth){
            self.activityColumnWidth = w + 20;
          }
        }
      });


      if(self.datagridHelper.selectedGoal == undefined ||
          self.datagridHelper.selectedGoal.selectedTab == null)return;

      let days = self.datagridHelper.selectedGoal.selectedTab.days.length;

      let sWidth = $(window).width();

      let totalWidth = self.activityColumnWidth + (days * self.dayColumnWidth);
      if(totalWidth < sWidth){
        self.columnWidthProperty = "";
      }


      self.setupPopovers();


    }, 1000);


    // let self = ctx;
    // self.activityColumnWidth = 20;
    //
    // let t = $("#daysheetTable tr");
    //
    // $("#daysheetTable tr").each(function(){
    //     let txtEl = $(this).find("td:first");
    //     if(txtEl.length > 0){
    //       let font =self.getFont(txtEl);
    //       let txt = txtEl.text();
    //
    //      let w = self.getTextWidth(txt, font);
    //
    //       if(w > self.activityColumnWidth){
    //         self.activityColumnWidth = w + 20;
    //       }
    //     }
    // });
  }

  getTextWidth(text, font) {
    // re-use canvas object for better performance
    var canvas = this.getTextWidth.canvas || (this.getTextWidth.canvas = document.createElement("canvas"));
    var context = canvas.getContext("2d");
    context.font = font;
    var metrics = context.measureText(text);
    return metrics.width;
  }



  getFont(el){
    var style = window.getComputedStyle(el[0], null);
    var size = style.getPropertyValue('font-size');
    var weight = style.getPropertyValue('font-weight');
    var fontSize = parseFloat(size);
    return (fontSize + 1) + 'px Arial ';// + weight;
  }

  tabClicked(tab){
    let self = this;
    this.datagridHelper.selectTab(tab);

    self.resizeActivityColumn(self);
  }

  sortActivitiesClick(){
    this.datagridHelper.selectedGoal.selectedTab.sortActivities(_);
  }

  addModalityClick() {
    this.datagridHelper.addModality(null, null, null, true);

    //daysheetTable
    //let elem = document.getElementById("daysheetTable");
    //window.scrollTo(0, this.grid.offsetHeight);
    $(this.grid).scrollTop(this.grid.offsetHeight);
  }


  calendarClick(){
    this.datagridHelper.addEmptyDay();
  }

  goalClicked(g){
    this.datagridHelper.selectGoal(g);
  }

  selectFirstGoal(){
    let firstGoal = this.datagridHelper.goals[0];
    this.datagridHelper.selectGoal(firstGoal);
  }

  rowClicked(row, day, cIndex, rIndex){
    // this.datagridHelper.selectRow(row);
    this.datagridHelper.selectDay(day, cIndex, rIndex);

    this.datagridHelper.selectCell(day, rIndex);
  }

  preferenceItemSelected(){
    this.datagridHelper.preferenceSelected();
  }


  saveClick(){
    this.datagridHelper.saveDaysheet();
    //this.datagridHelper.savePreference();

  }

  priorClick(){
    this.datagridHelper.populatePriorValues();
  }



  editGoalDescription(g){
    g.editingDescription = true;
    this.datagridHelper.selectGoal(g);
  }

  copyForwardGoalActivities(goal, date, copyData){
    let self = this;
    goal.startDate = date;//self.helper.getDateWithFormat(date, "MM/DD/YY");
    goal.userId = self.datagridHelper.userId;

    for(let g = 0; g < self.datagridHelper.goals.length; g++){
      let aGoal = self.datagridHelper.goals[g];
      if(aGoal.id == goal.id){
        //get previous for copy, that is NOT Discharge

        let tGoals = _.reject(self.datagridHelper.goals, function(o) { return o.isDischarge; });
        tGoals = _.orderBy(tGoals, ['id'], ['asc']);

        let copyGoal = tGoals[tGoals.length -1];
        //copy previous tab data IF ITS NOT the same Goal
        if(copyGoal.description != goal.description &&
        copyGoal.id != goal.id){
          self.datagridHelper.copyActivityiesFromGoalToGoal(copyGoal.id, goal, copyData);
        }
      }
    }

    //set assessment visible
    self.datagridHelper.toggleAssessment(true);

  }

  toggleGoalVisibility(){
    let self = this;
    let visible = self.datagridHelper.displayAssessment ? false : true;
    self.datagridHelper.toggleAssessment(visible);
  }

  goalDropDownClick(item, goal){
    goal.description = item;
  }

  newGoalClick(){

    //check for empty goal here...
    //if we have one, update it.
    let aGoal = this.datagridHelper.goals[0];
    if(aGoal.id == 0 && aGoal.description ==""){
      //update this empty goal
      aGoal.visible = true;
      this.editGoalDescription(aGoal);
    }else{
      aGoal = this.datagridHelper.createGoal();
      aGoal.editingDescription = true;
      this.datagridHelper.goals.push(aGoal);
      this.datagridHelper.selectGoal(aGoal);
    }

    this.addGoalPlusEnabled = false;
  }

  

  goalCreateCancelClick(goal){

    //find discharge tab...
    let dischargeIndex = this.datagridHelper.getDischargeIndex();
    if(this.datagridHelper.goals.length - 1 > dischargeIndex){
      //delete tab to right of discharge...
      this.datagridHelper.goals.splice(dischargeIndex + 1, 1);
    }

    //get latest goal...
    let latest = this.datagridHelper.getLatestGoal();
    if(latest.id == 0 && latest.description ==""){
      latest.visible = false;
      latest.editingDescription = false;
    }
    //set it as current...
    this.datagridHelper.selectGoal(latest);
    this.addGoalPlusEnabled = true;
  }

  goalCheckClick(goal){
    let self = this;
    goal.editingDescription = false;

    self.addGoalPlusEnabled = true;

    //we must have a description...
    if(goal.description.length ==0){

      let gIndex = 0;
      //find index of empty goal...
      let goalCount = self.datagridHelper.goals.length;
      for(let i = 0; i < goalCount; i++){
        let aGoal = self.datagridHelper.goals[i];
        if(aGoal.id == goal.id &&
        aGoal.description == goal.description){
          //remove this one...
          gIndex = i;
        }
      }

      //select first goal...
      self.datagridHelper.selectGoal(self.datagridHelper.goals[gIndex]);
      self.datagridHelper.goals[gIndex].visible = false;
      return;
    }

    let goalDate = self.helper.getDateWithFormat(self.datagridHelper.visitDate, "MM/DD/YYYY");
    //check for first-time legacy goal scenario...
    let legacySheet =  self.datagridHelper.checkForLegacyDataOnGoal(goal);
    let copyData = false;
    if(legacySheet != null){
      //we have legacy data, set goal StartDate to this date...
      goalDate = self.helper.getISODateToFormat(legacySheet.ExamDateTime, "MM/DD/YYYY");
      copyData =true;
    }

    //does similar goal already exist for sheet??
    self.datagridHelper.checkForExistingGoal(goal.description, self.datagridHelper.sheetId, function(res){
      if(res == null){
        //no goal exists, create one...
        self.copyForwardGoalActivities(goal, goalDate, copyData);

        //for existing daysheets NO goal...
        //get first daysheet
        if(legacySheet != null){
          //save goal
          goal.StartDate = goalDate;
          goal.sheetId = legacySheet.SheetID;
          self.datagridHelper.saveGoal(goal, function(res){
            //now update all legacy daysheets with new goal id...
            self.datagridHelper.updateDaysheetWithGoalIds(goal.sheetId, res.Id);
          });
        }


      }else{
        //goal already exists...
        //overwrite StartDate OR cancel....????
        let warningDesc = "Goal already exists!";
        let bodyText = res.Description + " exists for patient on: " + self.helper.getISODateToFormat(res.StartDate, "MM/DD/YY") + ".";

        let alert = new AlertObject(warningDesc, bodyText, "fa fa-lg fa-hand-paper-o", "orange");
        self.showAlertPopup(alert, function(r){
          if(!r.wasCancelled){
            //reset goal to hidden
            goal.visible = false;
            goal.description="";
          }
        });
      }
    });
  }

  // newTabClick(){
  //   let self = this;
  //   //filter modality list by unique tab descriptions
  //   let tabs = this.datagridHelper.getUniqueTabsFromList();

  //   self.dialogService.open({viewModel: TabPopup, model: tabs}).whenClosed(response => {
  //     for(let i = 0; i < response.output.length; i++){
  //       let aTab = self.datagridHelper.createNewTab(response.output[i].Description2, self.datagridHelper.allModalities);
  //       self.datagridHelper.selectedGoal.addTab(aTab);
  //     }
  //   });
  // }

  dayClockClicked(day, goal){

    let self = this;

    //set stopwatch instance on helper object for calling from Phoenix on close...
    if(self.datagridHelper.stopwatchInstance == null){
      self.datagridHelper.stopwatchInstance = self.stopwatch;
    }

    self.stopwatch.displayStopwatch = true;

    self.stopwatch.show({"day":day, "goal":goal, "helper": self.datagridHelper }, function(){
      self.stopwatch.displayStopwatch = false;
    });
  }


  subtractInOutTime(day){
    let testDiff = moment.duration(day.timeOut.diff(day.timeIn));

    //add to total Time
    if(day.totalTime != null){
      let tt = moment(day.totalTime, ":ss");
      let m = moment.duration({
        seconds: tt.second(),
        minutes: tt.minute(),
        hours: tt.hour()
      });
      testDiff.add(m);
    }

    day.totalTime = this.formatTimeWihDuration(testDiff);

    this.datagridHelper.updateDayTotalTimeAcrossAllGoals(day);
  }

  formatTimeWihDuration(duration){
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
    return time.format(format);
  }


  formatTime(ticks){
    var duration = moment.duration(ticks * 1000);
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
    return time.format(format);
  }

  addAssessmentPrefClick(d){
    this.datagridHelper.setCurrentGoalAssessmsnetWithSelectedAssessmentPref(d);
  }


  assessmentGoalCheck(){
    let self = this;
    let alert = new AlertObject("Create Goal", "You must create a goal before saving Assessment data", "fa fa-lg fa-file-o", "green");
    alert.showCancel = true;

    let sGoal = self.datagridHelper.selectedGoal;
    if(sGoal == null || sGoal == undefined ||
    sGoal.description.length == 0){

      this.showAlertPopup(alert, function(r){
        if(!r.wasCancelled){
          //we said YES, create new goal...
          self.newGoalClick();
        }
        else{
          //they said no, delete assessment...
          sGoal.assessment = "";
        }
      });

    }
    else{
      //update changes to goal...
      self.datagridHelper.saveGoal(self.datagridHelper.selectedGoal, function(res){

      });
    }
  }


  addDischargePrefClick(d){
    let self = this;
    let alert = new AlertObject("warning", "Continue will disconnect future PT visits from Prior Day Sheet Data", "fa fa-lg fa-hand-paper-o", "orange");
    alert.showCancel = true;
    this.showAlertPopup(alert, function(r){
      if(!r.wasCancelled){
        self.datagridHelper.setDischargeWithPref(d);
      }
    });
  }

  saveAssessmentPrefClick(){
    let txt = this.assessmentTextarea;
    let input = this.assessmentInput;

    let aPref = this.datagridHelper.checkForExistingPref(input.value);
    this.datagridHelper.saveAssessmentPref(input.value, txt.value, aPref);
  }

  saveDischargePrefClick(){
    let txt = this.dischargeTextarea;
    let input = this.dischargeInput;

    let aPref = this.datagridHelper.checkForExistingDischargePref(input.value);
    this.datagridHelper.saveDischargePref(input.value, txt.value, aPref);
  }

  prefLoad(){
    this.datagridHelper.selectPreferenceByPrefId(13);
  }


  therapyTimerTick(a) {
    a.lapsedTime += 1;
  }

  addToActivitiesToUpdate(day, activitySelected) {
    let self = this;
    //does this activity already exist in update list???
    let foundActivity = _.find(day.activitiesToUpdate, {'description': activitySelected.description, 'id': activitySelected.id});
    if(foundActivity == undefined){
      day.activitiesToUpdate.push(activitySelected);
    } else {
      //update
      foundActivity.value = activitySelected.value;
      foundActivity.actPass = activitySelected.actPass;
    }
    self.bindingSignaler.signal("my-refresh");
  }

  cellDoubleClickedNoCalc(day, activitySelected) {
    let self = this;
    let goal = self.datagridHelper.goals.find((g) => {
      return g.selected === true;
    });
    let tab = goal.tabs.find((t) => {
      return t.selected === true;
    });

    setIsEditing(true, () => {
      let dayId = day.id;
      let activityId = activitySelected.id;
      let goalId = goal.id;
      let tabId = tab.id;

      const getDayAndActivity = () => {
        console.log('what up people?');
        let goal = self.datagridHelper.goals.find((g) => {
          return g.id === goalId;
        });
        let tab = goal.tabs.find((t) => {
          return t.id === tabId;
        });
        let day = tab.days.find((d) => {
          return d.id === dayId;
        });
        let activity = day.activities.find((a) => {
          return a.id === activityId;
        });
        self.addToActivitiesToUpdate(day, activity);
        setIsEditing(false, null);
      };
      getDayAndActivity();
    });
  }



  cellDoubleClicked(day, activitySelected){
    let self = this;
    setIsEditing(true);

    let dgh = this.datagridHelper;
    console.log('dgh', dgh);

    if(!activitySelected)return;

    self.dialogService.open({viewModel: Calculator, model: {activity: activitySelected, helper: self.datagridHelper}}).whenClosed(response => {
      console.log('DIALOG RETURN VALUE:', response);


      activitySelected.value = response.output.value;
      activitySelected.actPass = response.output.actPass;
      activitySelected.backgroundColor = response.output.backgroundColor;

      self.addToActivitiesToUpdate(day, activitySelected);
    });
  }

  displayLongDescriptions(){
    this.longDescriptionsVisible = this.longDescriptionsVisible ? false : true;
  }

  valueChangedCallback(day, activityIndex){
    let aAct = day.activities[activityIndex];

    let foundActivity = _.find(day.activitiesToUpdate, {'description': aAct.description, 'id': aAct.id});
    if(foundActivity == undefined){
      day.activitiesToUpdate.push(day.activities[activityIndex]);
    }

    //update goal.hasData....
    this.datagridHelper.selectedGoalHasValues();

    setIsEditing(false, null);
    // else{
    //   //update
    //   foundActivity.value = activitySelected.value;
    //   foundActivity.actPass = activitySelected.actPass;
    // }
  }

  authorizePopup(){
    let self = this;
    const windowHeight = window.innerHeight;// / 2;
    const windowWidth = window.innerWidth;// / 2;
    var data = {
      patientId: self.datagridHelper.patientId,
      userId: self.datagridHelper.userId,
      parentWidth: windowWidth,
      parentHeight: windowHeight
    }
    self.dialogService.open({viewModel: AuthorizePop, model: data}).whenClosed(response => {
      //day.totalTime = response.output;
    });
  }

}
