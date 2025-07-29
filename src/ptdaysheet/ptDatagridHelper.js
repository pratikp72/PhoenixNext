/**
 * Created by montymccune on 11/17/17.
 */

import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject} from 'aurelia-framework';
import moment from 'moment';
import * as _ from 'lodash';
import {EventAggregator} from 'aurelia-event-aggregator';
import {setIsEditing, getIsEditing, runCallback} from "./editingHelper";
import { observable } from 'aurelia-framework';
import {PopupHelper} from '../go/popupHelper';
import {DialogService} from 'aurelia-dialog';
import {TabPopup} from '../ptdaysheet/tabPopup';



class Goal{
  constructor(description, startDate){
    this.description = description;
    this.assessment=null;
    this.tabs=[];
    this.selected = false;
    this.selectedTab=null;
    this.id =0;
    this.editingDescription=false;
    this.dueDate=null;
    this.dateFormat=null;
    this.startDate= startDate==undefined ? null : startDate;
    this.displayDueDate=null;
    this.userId =0;
    this.alertTime=null;
    this.sortableDate = startDate==undefined ? null : moment(startDate).format('YYYY/MM/DD');
    this.isDischarge = false;
    this.sheetId=0;
    this.visible = true;
    this.hasData = false;
    // this.showAssessment = false;
  }

  addTab(tab){
    for(let t = 0; t < this.tabs.length; t++){
      let aTab = this.tabs[t];
      if(aTab.description == tab.description){
        return;
      }
    }
    if(this.tabs.length == 0){
      tab.selected = true;
      this.selectedTab = tab;
    }
    this.tabs.push(tab);
  }

  findTabByDescription(description){
    for(let i = 0; i < this.tabs.length; i++){
      if(this.tabs[i].description === description){
        return this.tabs[i];
      }
    }
    return null;
  }

  hasContent(){
    this.hasData = false;

    for(let i = 0; i < this.tabs.length; i++){
      let aTab = this.tabs[i];
      for(let d = 0; d < aTab.days.length; d++){
        let aDay = aTab.days[d];
        for(let a = 0; a < aDay.activities.length; a++){
          let aAct = aDay.activities[a];
          if(aAct.data != null){
            this.hasData = true;
            return true;
          }
        }
      }
    }
    return false;
  }

}

class Tab {
  constructor(description) {
    this.description = description;

    this.data;
    this.selected = false;
    this.activitylist = [];
    this.activitiesCompletedOnTab = [];
    this.days = [];
    this.currentDay;
    this.activityColumnWidth = 75;
    this.sortDesc = true;
  }

  // activityHasValues(description){
  //   let self = this;
  //   for(let i = 0; i < self.days.length; i++){
  //     let aDay = self.days[i];
  //     if(aDay.activityHasValue(description)){
  //       return true;
  //     }
  //   }
  //   return false;
  // }

  sortActivities(lodash){
    this.sortDesc = this.sortDesc ? false : true;
    var sortStr = this.sortDesc ? 'desc' : 'asc';
    this.activitiesCompletedOnTab = lodash.orderBy(this.activitiesCompletedOnTab, ['id'], [sortStr]);
    for(var d = 0; d < this.days.length; d++){
      this.days[d].sortActivities(lodash);
    }
  }

  addCompletedActivity(activity, addToTop) {
    for (var i = 0; i < this.activitiesCompletedOnTab.length; i++) {
      if (this.activitiesCompletedOnTab[i].description == activity.description) {
        return;
      }
    }

    if(addToTop){
      this.activitiesCompletedOnTab.unshift(activity);
    }else{
      this.activitiesCompletedOnTab.push(activity);
    }
  }

  deleteDay(day, dgHelper) {
    for (let d = 0; d < this.days.length; d++) {
      let aDay = this.days[d];
      if (aDay.date == day.date) {
        //if we found the date to remove,
        //check if it is the visit day
        if (day.date === dgHelper.visitDate) {
          //delete current day
          this.days.splice(d, 1);
        } else {
          //display error alert
          dgHelper.displayAlert("Error", "Cannot delete prior visit", "fa fa-lg fa-exclamation-triangle", "red");
        }
      }
    }
  }

  updateDayTotalTime(day) {
    for (let d = 0; d < this.days.length; d++) {
      let aDay = this.days[d];
      if (aDay.date == day.date) {
        aDay.totalTime = day.totalTime;
      }
    }
  }

  updateDayTimeIn(day, timeIn) {
    for (let d = 0; d < this.days.length; d++) {
      let aDay = this.days[d];
      if (aDay.date == day.date) {
        aDay.timeIn = timeIn;
      }
    }
  }

  removeActivity(activityDescription, sheetId, patientId, helper) {

    for (let i = 0; i < this.activitiesCompletedOnTab.length; i++) {
      if (this.activitiesCompletedOnTab[i].description == activityDescription) {

        let prefId = this.activitiesCompletedOnTab[i].pt_daysheet_pref_ID;

        this.activitiesCompletedOnTab.splice(i, 1);

        //test this...
        helper.selectedGoal.selectedTab.currentDay.deleteActivityWithIndex(i);
        helper.selectedGoal.selectedTab.currentDay.deleteActivityToUpdateWithIndex(i);

        helper.deleteModality(sheetId, patientId, activityDescription);

        //delete pref???
        if(helper.selectedProviderPref){
          //pt_daysheet_pref_ID...
          let prefToRemoveIndex = _.findIndex(helper.providerPrefs, function(p){return p.ID == prefId});
          helper.deleteDaySheetPref(prefId, function(res){
            //remove from list...
            //let index = _.findIndex(helper.providerPrefs, function(p){return p.ID == helper.selectedProviderPref.ID});
            helper.providerPrefs.splice(prefToRemoveIndex, 1);
          });
        }
      }
    }
  }
}

class Modality {
  constructor(description){
    this.description = description;
  }
}


class AlertObject{
  constructor(title, text, iconClass, iconColor){
    this.title = title;
    this.text = text;
    this.iconColor = iconColor ? iconColor : 'black';
    this.iconClass = iconClass;
  }
}

class Day{
  constructor(date){
    this.date = date;
    this.timeIn;
    this.timeOut;
    this.totalTime;
    this.activities = [];
    this.activitiesToUpdate=[];
    this.clockClicked=false;
    this.selected = false;
    this.id = 0;
    this.sheetId = 0;
    this.dayClass;
    this.sortableDate = moment(date).format('YYYY/MM/DD');
    this.sortActivitiesDesc = true;
  }

  deleteActivityWithIndex(index){
    this.activities.splice(index, 1);
  }

  deleteActivityToUpdateWithIndex(index){
    this.activitiesToUpdate.splice(index, 1);
  }

  sortActivities(lodash){

    //create temp array for sorting...
    var sortArray=[];
    for(var i = 0; i < this.activities.length; i++){
      var sortIndex = this.sortActivitiesDesc ? this.activities.length - (i + 1) : i;
      sortArray.push({
        index: sortIndex,
        activity: this.activities[i]
      });
    }



    this.sortActivitiesDesc = this.sortActivitiesDesc ? false : true;
    var sortStr = this.sortActivitiesDesc ? 'desc' : 'asc';

    sortArray = lodash.orderBy(sortArray, ['index'], [sortStr]);

    //update activities list....
    this.activities=[];
    for(var a = 0; a < sortArray.length; a++){
      this.activities.push(sortArray[a].activity);
    }

  }

  displayTimeIn(){
    return moment(this.timeIn).format('h:mm a');
  }

  displayTimeOut(){
    return moment(this.timeOut).format('h:mm a');
  }

  activityHasValue(activityDescription){
    for(let i = 0; i < this.activities.length; i++){
      if(this.activities[i].description == activityDescription){
        if(this.activities[i].value !== undefined &&
          this.activities[i].value == null ||
          this.activities[i].value.length == 0){
          return false;
        }
      }
    }
    return true;
  }
}

class Activity {

  @observable value="";

  constructor(description){
    this.description = description;
    this.longDescription="";
    // this.value="";
    this.selected = false;
    this.styleString = "background-color: white";
    this.selectedStyleString = "background-color: rgb(187,209,233)";
    this.data=null;
    this.id = 0;
    this.actPass=null;//ACT=light green, PASS=coral
    this.backgroundColor="";// = 'transparent';
    this.hasValue = false;
    this.pt_daysheet_pref_ID;
  }

  valueChanged(newval, oldval){
    if(newval != null && newval.length > 0){
      this.hasValue = true;
    }else{
      this.hasValue = false;
    }
  }
}

@inject(helper,http,EventAggregator, PopupHelper, DialogService)
export class PtDatagridHelper{

  goals=[];
  @observable selectedGoal;
  selectedModality;
  allModalities=[];
  providerPrefs=[];
  preferenceList=[];
  selectedProviderPref;
  providerId;
  userId;
  bodyPart;
  patientId;
  sheetId;
  visitDate;
  daysheetType;
  assessmentPrefList=[];
  selectedAssessmentPref;

  dischargePrefList=[];
  selectedDischargePref;

  stopwatchInstance=null;

  displayAssessment = false;
  activityTop = 195;

  activityColumnWidth = 100;

  selectedPreferenceIdList=[];

  editMode = false;


  constructor(helper, http, eventAggregator, PopupHelper, DialogService){
    this.helper = helper;
    this.http = http;
    this.ea = eventAggregator;
    this.popupHelper = PopupHelper;
    this.dialogService = DialogService;
  }

  addIdToSelectedPreferenceList(preferenceId){
    let self = this;
    let found=false;
    for(let i = 0; i < self.selectedPreferenceIdList.length; i++){
      if(self.selectedPreferenceIdList[i]==preferenceId){
        found=true;
        break;
      }
    }
    if(!found){
      self.selectedPreferenceIdList.push(preferenceId);
    }
  }

  doesIdExistInSelectedPreferences(preferenceId){
    let self = this;
    for(let i = 0; i < self.selectedPreferenceIdList.length; i++){
      if(self.selectedPreferenceIdList[i]==preferenceId){
        return true;
      }
    }
    return false;
  }


  selectedGoalHasValues(){
    var goal = this.selectedGoal;
    if(goal == null || goal == undefined){
      return false;
    }

    for(let i = 0; i < goal.tabs.length; i++){
      let aTab = goal.tabs[i];
      for(let d = 0; d < aTab.days.length; d++){
        let aDay = aTab.days[d];
        for(let a = 0; a < aDay.activities.length; a++){
          let aAct = aDay.activities[a];
          if(aAct.value != null){
            goal.hasData = true;
            return true;
          }
        }
      }
    }
    return false;
  }

  selectedGoalChanged(newValue, oldValue) {
    //this.isShown = (newValue === 'opt1');

    var test = newValue;
  }

  getActivityBackgroundColorByActPass(value){
    if(value == "ACT"){
      return '#c4f987';
    }else{
      //pass
      return '#ffbba2';
    }
  }

  findSelectedAssessmentPref(value){
    for(let i = 0; i < this.assessmentPrefList.length; i++){
      if(this.assessmentPrefList[i].Description1 === value){
        this.selectedAssessmentPref = this.assessmentPrefList[i];
      }
    }
    //this.selectedAssessmentPref = this.assessmentPrefList.find(x => x.Description1 === value);
  }

  updateDayTotalTimeAcrossAllGoals(day){
    for(let i = 0; i < this.goals.length; i++){
      let aGoal = this.goals[i];
      for(let t = 0; t < aGoal.tabs.length; t++){
        let aTab = aGoal.tabs[t];
        aTab.updateDayTotalTime(day);
      }
    }
  }

  getUniqueTabsFromList(){
    let r = _.uniqBy(this.allModalities, 'Description2');
    return _.reject(r, {'Description2':''});
  }

  findGoalById(id){
    for(let i = 0; i < this.goals.length; i++){
      if(this.goals[i].id === id){
        return this.goals[i];
      }
    }
    return null;
  }

  getDischargeIndex(){
    for(let i = 0; i < this.goals.length; i++){
      if(this.goals[i].isDischarge){
        return i;
      }
    }
    return null;
  }

  getLatestGoal(){
    for(let i = 0; i < this.goals.length; i++){
      if(this.goals[i].isDischarge){
        return this.goals[i - 1];
      }
    }
    return null;
  }

  calculateGoalAlertTime(g){

    var self = this;

    if(g.startDate === "Invalid date"){
      g.displayDueDate="";
      g.alertTime="";
      return;
    }

    //let now = moment();


    let today = moment(self.visitDate);

    if(g.dateFormat=="days"){
      //let startDays = moment(g.startDate);
      let days = parseInt(g.dueDate);
      let daysLeftDays =  moment().diff(today, 'days');
      daysLeftDays = days - daysLeftDays;
      daysLeftDays = daysLeftDays < 0 ? 0 : daysLeftDays;
      daysLeftDays = Math.abs(daysLeftDays);
      g.displayDueDate = daysLeftDays + " days";
      g.alertTime =  daysLeftDays  + " days remain";
    }else if(g.dateFormat=="weeks"){
      //let startWeeks = moment(g.startDate);
      let weeks = parseInt(g.dueDate);
      let daysInWeeks = weeks * 7;
      let daysLeftWeeks =  moment().diff(today, 'days');
      daysLeftWeeks = daysInWeeks - daysLeftWeeks;
      daysLeftWeeks = daysLeftWeeks < 0 ? 0 : daysLeftWeeks;
      daysLeftWeeks = Math.abs(daysLeftWeeks);
      g.displayDueDate = g.dueDate + " weeks";
      g.alertTime =  daysLeftWeeks + " days remain";
    }else if(g.dateFormat=="date"){
      //date
      // let start = moment(g.startDate);
      let deadline = moment(g.dueDate);
      g.displayDueDate = g.dueDate;
      let daysLeft =  deadline.diff(today, 'days');
      daysLeft = daysLeft < 0 ? 0 : daysLeft;
      g.alertTime = Math.abs(daysLeft) + " days remain";
    }else{
      return "";
    }
  }

  addGoal(g){
    let self = this;
    //check for empty default goal before adding...
    if(self.goals.length > 0){
      //get first goal
      let aGoal = self.goals[0];
      if(aGoal.id==0 && aGoal.description == 'Short-Term Goal'){
        //overwrite default goal
        self.goals.splice(0,1,g);
      }else{
        self.goals.push(g);
      }
    }else{
      self.goals.push(g);
    }

    //sort goals by SORTABLE date
    let sortedGoals = _.orderBy(self.goals, ["sortableDate"],["asc"]);
    self.goals = sortedGoals;
    self.selectGoal(g);

    //self.toggleAssessment(true);
  }

  selectGoal(g){
    let self = this;
    for(let i = 0; i < self.goals.length; i++){
      let aGoal = self.goals[i];
      aGoal.selected = false;
    }
    g.selected = true;
    self.selectedGoal = g;

    //self.selectedGoal.hasContent();

    //supress assessment section...
    //if selected goal a default GOAL w/ no descritpion...
    //OR if it is the discharge tab
    // let displayAssessment = true;
    // if(g.description.length == 0 || g.isDischarge){
    //   displayAssessment = false;
    // }
    // self.toggleAssessment(displayAssessment);
  }

  selectCell(day, index){
    let self = this;

    for(let d = 0; d < self.selectedGoal.selectedTab.days.length; d++){
      let aDay = self.selectedGoal.selectedTab.days[d];
      for(let i = 0; i < aDay.activities.length; i++){
        day.activities[i].selected = false;
      }
    }

    // for(let i = 0; i < day.activities.length; i++){
    //   day.activities[i].selected = false;
    // }
    day.activities[index].selected = true;
  }

  selectDay(d){
    let self = this;
    for(let i = 0; i < self.selectedGoal.selectedTab.days.length; i++){
      self.selectedGoal.selectedTab.days[i].selected=false;
      d.dayClass='';
    }

    d.selected = true;
    d.dayClass = 'daysheet-day-active';
    self.selectedGoal.selectedTab.currentDay = d;
  }

  selectTab(tab){
    let self = this;
    for(let i = 0; i < self.selectedGoal.tabs.length; i++){
      let aTab = self.selectedGoal.tabs[i];
      aTab.selected = false;
    }
    tab.selected = true;
    self.selectedGoal.selectedTab = tab;
  }

  findTab(description){
    for(var i = 0; i < this.tabs.length; i++){
      if(this.tabs[i].description === description){
        return this.tabs[i];
      }
    }
    return null;
  }

  displayAlert(title, text, iconClass, iconColor){
    let self = this;
    let alert = new AlertObject(title, text, iconClass, iconColor);
    self.ea.publish('showAlert', alert);
  }

  loadProviderPrefsWithIdAndBodypart(providerId, bodypart){
    let self = this;
    self.providerId = providerId;
    self.allModalities=[];
    self.providerPrefs = [];
    self.preferenceList = [];
    self.assessmentPrefList = [];
    self.dischargePrefList = [];

    self.getModalities(providerId, function(res){
      self.allModalities = res;
    });

    //get provider prefs
    self.getProviderPrefs(providerId, bodypart, function(prefs){
      self.providerPrefs = prefs;
      self.preferenceList = _.uniqBy(prefs, 'PrefDescription');
    });

    self.getAssessmentPrefs(providerId, function(res){
      self.assessmentPrefList = res;
    });

    self.getDischargePrefs(providerId, function(res){
      self.dischargePrefList = res;
    });
  }

  activate(callback){
    let self = this;

    if(self.editMode){
      self.goals=[];
      self.tabs =[];
      self.selectedGoal = null;   
    }

    self.getModalities(self.providerId, function(modRes){

      self.allModalities = modRes;

      //get provider prefs
      self.loadProviderPrefsWithIdAndBodypart(self.providerId, self.bodyPart);

      self.getDaySheets(self.patientId, function(sheetRes){
        self.loadDaysheet(sheetRes, modRes, self.editMode);

        if(callback){
          callback();
        }
      });
    });
  }

  selectPreferenceByPrefId(id){
    let self = this;

    //have we already selected this
    // if(self.doesIdExistInSelectedPreferences(id)){
    //   return;
    // }
    // self.addIdToSelectedPreferenceList(id);

    let prefRes = _.find(self.providerPrefs, { 'PrefID': id});
    this.selectedProviderPref = prefRes;
    this.preferenceSelected();
  }

  preferenceSelected(prefId){
    let p = this.selectedProviderPref;
    let id = prefId == undefined ? p.PrefID : prefId;
    let prefRes = _.filter(this.providerPrefs, { 'PrefID': id});

    //change bodypart w/ preference...
    //this.bodyPart = p.Bodypart;

    //populate grid with preference
    this.addProviderPref(prefRes);
  }

  activityExists(a, day){
    for(var i = 0; i < day.activities.length; i++){
      if(day.activities[i].description === a){
        return true;
      }
    }
    return false;
  }

  findDay(date, tab){
    for(var i = 0; i < tab.days.length; i++){
      if(tab.days[i].date === date){
        return tab.days[i];
      }
    }
    return null;
  }

  setCurrentGoalAssessmsnetWithSelectedAssessmentPref(pref){
    this.selectedAssessmentPref = pref;
    this.selectedGoal.assessment = pref.Description3;
    this.selectedGoal.description = pref.Description1;
  }

  setDischargeWithPref(pref){
    let self = this;

    this.selectedDischargePref = pref;
    //update discharge Goal
    let disGoal = _.find(this.goals, function(g){return g.isDischarge});
    disGoal.assessment = pref.Description3;

    let aGoal= _.find(this.goals, function(g) { return !g.isDischarge; });
    if(aGoal != undefined){
      //goas.tabs.days.sheetId
      if(aGoal.tabs.length > 0 &&
         aGoal.tabs[0].days.length > 0){
        let sheetId = aGoal.tabs[0].days[0].sheetId;

        //save discharge to sheetId
        let url = "ptdaysheet/discharge";
        let tSheets = {
          "Sheets":[]
        }

        let newDischarge={
          // "ID":id,
          // "BodyPart": bodypart,
          // "Type": "PT",
          "SheetID":sheetId,
          // "DayID":dayId,
          // "ProviderID": providerId,
          // "UserID": userId,
          // "PatientID": patientId,
          // "ExamDateTime": date,
          // "Modality": activity,
          // "Value": value,
          // "SheetDescription": sheetDescription,
          // "GoalId": goalId,
          // "TotalTime": totalTime,
          // "ActPass": actPass,
          "Discharge": pref.Description3,
          // "Goal":{
          //   "Assessment": assessment,
          //   "Description": goalDescription,
          //   "StartDate": goalStartDate,
          //   "DueDate": goalDueDate,
          //   "DateFormat": goalDateFormat,
          //   "id": goalId,
          //   "UserId": goalUserId,
          //   "SheetID": sheetId
          // }
        }


        tSheets.Sheets.push(newDischarge);

        let n = self.helper.createNoty("Saving Discharge...", 3000);
        n.show();

        self.http.post(self.helper.getApiUrl(url), tSheets, function (res) {
          //callback(res);

          self.helper.notySuccess(n, "Discharge saved!");


        }, function (err) {

          self.helper.notyError(n, "Discharge Failed to Save");

          let e = err;
        });


      }
    }
  }

  saveDischargePref(description, text, existingPref){
    let self = this;
    let url = 'listcombo';
    let id = existingPref != null ? existingPref.ListID : 0;
    let p = self.createDischargePrefObject(id, description, null, text, self.providerId, self.bodyPart);

    let n = self.helper.createNoty("Saving Discharge Preference...", 3000);
    n.show();


    self.http.post(self.helper.getApiUrl(url), p, function (res) {
      //callback(res);

      if(id == 0){
        self.dischargePrefList.push(res);
      }
      self.selectedDischargePref=res;

      self.helper.notySuccess(n, "Discharge Preference saved!");


    }, function (err) {

      self.helper.notyError(n, "Discharge Preference Failed to Save");

      let e = err;
    });
  }


  saveAssessmentPref(description, text, existingPref){
    let self = this;
    let url = 'listcombo';
    let id = existingPref != null ? existingPref.ListID : 0;
    let p = self.createAssessmentPrefObject(id, description, null, text, self.providerId, self.bodyPart);

    let n = self.helper.createNoty("Saving Preference...", 3000);
    n.show();


    self.http.post(self.helper.getApiUrl(url), p, function (res) {
      //callback(res);

      if(id == 0){
        self.assessmentPrefList.push(res);
      }
      self.selectedAssessmentPref=res;

      self.helper.notySuccess(n, "Preference saved!");


    }, function (err) {

      self.helper.notyError(n, "Preference Failed to Save");

      let e = err;
    });
  }

  createAssessmentPrefObject(id, d1, d2, d3, providerId, bodyPart){
    let pref ={
      "ListID": id,
      "Description1": d1,
      "Description2": d2,
      "Description3": d3,
      "ListType": "Assessment",
      "ProviderID": providerId,
      "BodyPart": bodyPart
    };
    return pref;
  }

  createDischargePrefObject(id, d1, d2, d3, providerId, bodyPart){
    let pref ={
      "ListID": id,
      "Description1": d1,
      "Description2": d2,
      "Description3": d3,
      "ListType": "Discharge",
      "ProviderID": providerId,
      "BodyPart": bodyPart
    };
    return pref;
  }

  checkForExistingPref(description){
    for(let i = 0; i < this.assessmentPrefList.length; i++){
      let aPref = this.assessmentPrefList[i];
      if(aPref.Description1 === description){
        return aPref;
      }
    }
    return  null;
  }

  checkForExistingDischargePref(description){
    for(let i = 0; i < this.dischargePrefList.length; i++){
      let aPref = this.dischargePrefList[i];
      if(aPref.Description1 === description){
        return aPref;
      }
    }
    return  null;
  }

  addProviderPref(pref){
    let self = this;
    this.loadDaysheet(pref, self.allModalities, true);
  }

  addDischargeTab(text){
    let self = this;
    let dTab = new Goal("Discharge", self.visitDate);
    dTab.isDischarge = true;
    dTab.assessment = text;
    dTab.userId = self.userId;
    self.goals.push(dTab);
  }

  checkForLegacyDataOnGoal(goal){

    //populate dataList from goal...
    let dataList = [];

    for(let t = 0; t < goal.tabs.length; t++){
      let aTab = goal.tabs[t];
      for(let d = 0; d < aTab.days.length; d++){
          let aDay = aTab.days[d];
          for(let a = 0; a < aDay.activities.length; a++){
            let aActivity = aDay.activities[a];
            if(aActivity.data != null){
              if(aActivity.data.GoalId == null &&
                aActivity.data.BodyPart == this.bodyPart){
                let sortable ={
                  "date": moment(aActivity.data.ExamDateTime),
                  "data": aActivity.data
                }
                dataList.push(sortable);
              }
            }
          }
      }
    }

    let res = _.orderBy(dataList, ["date"],['asc']);
    return res.length > 0 ? res[0].data : null;
  }


  filterMostRecentGoalsByDescriptionAndDate(goals, aGoal){
    //finds any potential duplicate descriptions,
    //returning most recent by StartDate...
    let removeDuplicateGoalsArray=[];
    let found = _.find(goals, function(o) { return o.OD_PT_DaySheet_Goal.Description == aGoal.OD_PT_DaySheet_Goal.Description; });
    if(found){
      //check to see which goal is most current...
      let fDate = new Date(found.OD_PT_DaySheet_Goal.StartDate);
      let aDate = new Date(aGoal.OD_PT_DaySheet_Goal.StartDate);
      return fDate > aDate ? found : aGoal;
    }else{
      return aGoal;
    }
  }

  removeGoalDataFromDaysheets(daysheets){
    let final=[];
    for(let i = 0; i < daysheets.length; i++){
      let item = JSON.parse(JSON.stringify(daysheets[i]));
      item.GoalId = null;
      item.OD_PT_DaySheet_Goal = null;
      final.push(item);
    }
    return final;
  }

  clearDaysheet(){
    let self = this;
    self.goals=[];
    self.tabs=[];
  }

  loadDaysheet(daysheets, modalities, isPreference){
    let self = this;
    //test

    // if(self.editMode){
    //   self.goals=[];
    //   self.tabs =[];
    //   self.selectedGoal = null;   
    //   return;
    // }

    if(!isPreference || self.editMode){
      self.goals=[];
      self.tabs =[];
    }else{
      //is there data already?, if so return from adding preference...
      for(let g = 0; g < self.goals.length; g++){
        let aGoal = self.goals[g];
        if(aGoal.hasContent()){
          return;
        }
      }
    }

    //Don't filter NULL PT_GOals when loading a preference...
    // if(!isPreference){
    //   daysheets = _.reject(daysheets, {'OD_PT_DaySheet_Goal':null});
    // }

    //filter by daysheetType
    if(!isPreference){
      daysheets = _.filter(daysheets, function(d){return d.Type == self.daysheetType })
    }


    //check for discharge
    let dis = _.orderBy(daysheets, [function(d){ return moment(d.ExamDateTime).format('YYYY/MM/DD');}],['desc']);
    dis = _.find(dis, function(s) { return s.Discharge != null; });
    if(dis != undefined){
      let dDate = new Date(dis.ExamDateTime);
      let vDate = new Date(self.visitDate);
      if(vDate > dDate){
        //filter out all discharge data <= SheetID
        daysheets = _.reject(daysheets, function(s) { return s.SheetID <= dis.SheetID; });
      }
    }

    //get goals
    let tGoals = _.uniqBy(daysheets, 'OD_PT_DaySheet_Goal.Id');
    // tGoals = _.reject(tGoals, {'OD_PT_DaySheet_Goal':null});
    let finalGoals = [];
    //only get goals that are equal to or less than  GOAL StartDate
    for(let g = 0; g < tGoals.length; g++){
      if(tGoals[g].GoalId == null){
        continue;
      }
      let aDate = new Date(tGoals[g].OD_PT_DaySheet_Goal.StartDate);
      let vDate = new Date(self.visitDate);
      if(aDate <= vDate){
        //let f = self.filterMostRecentGoalsByDescriptionAndDate(finalGoals, tGoals[g]);
        finalGoals.push(tGoals[g]);
      }
    }


    //order goals by goal ID
    tGoals = _.sortBy(finalGoals, ['OD_PT_DaySheet_Goal.Id']);
    //tGoals = finalGoals;



    //get sheetId
    let tSheetIds = _.orderBy(daysheets, ["SheetID"],['desc']);

    self.sheetId = tSheetIds.length > 0 ? tSheetIds[0].SheetID : 0;
    //for instances where there are NO goals
    if(tGoals.length == 0){
      tGoals.push(self.createGoal(""));
    }

    //if(self.sheetId == 0){
      // if(daysheets.length > 0){
      //   tGoals.push(daysheets[0]);
      // }else {
      //   tGoals.push(self.createGoal("Short-Term Goal"));
      //}
    //}

    let dischargeTxt = null;

    //loop over goals
    for(let g = 0; g < tGoals.length; g++){
      let addGoal = false;
      let defaultGoal = false;
      //create new goal
      let aGoalId = tGoals[g].OD_PT_DaySheet_Goal == null ? 0 : tGoals[g].OD_PT_DaySheet_Goal.Id;
      let aGoal = null;
      if(aGoalId == 0){
        //no goals exist
        //create default goal
        defaultGoal = true;
        aGoal = new Goal("", self.visitDate);
        aGoal.userId = self.userId;
        aGoal.visible = false;
        addGoal = true;
        //supress assessment section...
        let showAssessment = self.editMode ? true : false;
        self.toggleAssessment(showAssessment);//false
      }else{
        //look to see if we have this goal already loaded
        aGoal = self.findGoalById(aGoalId);
        if(aGoal == null){
          let goalRes = self.createGoalFromExisting(tGoals[g].OD_PT_DaySheet_Goal, isPreference);
          aGoal = goalRes.goal;
          addGoal = goalRes.addGoal;
        }
        self.toggleAssessment(true);
      }

      // if(self.goals.length === 0){
      //   aGoal.selected = true;
      //   self.selectedGoal = aGoal;
      // }

      //self.selectGoal(aGoal);

      //1/11/23
      //if this is a preference, clear out any prefviously associated GOAL data...
      if(isPreference){
        defaultGoal = true;
        daysheets = self.removeGoalDataFromDaysheets(daysheets);
      }

      //get tabs for goal
      let daysheetsByGoalId = _.filter(daysheets, { 'GoalId': defaultGoal ? null : aGoalId});//aGoal.id});
      //order by OD_PT_Daysheet.ID...
      daysheetsByGoalId =_.orderBy(daysheetsByGoalId, 'ID', 'ASC');//DESC
      let tabDescriptions = _.uniqBy(daysheetsByGoalId, 'SheetDescription');
      for(let t = 0; t < tabDescriptions.length; t++){
        let addTab = false;
        let ts = tabDescriptions[t];

        let newTab = aGoal.findTabByDescription(ts.SheetDescription);
        if(newTab == null){
          // if(ts.SheetDescription == null){
          //   //check if we have a 'daysheet' modality,
          //   //if so
          // }

          let tempDesc = ts.SheetDescription == null ? 'Daysheet' : ts.SheetDescription;
          let defaultTab = ts.SheetDescription == null ? true : false;

          let finalModalityList = modalities;
          //if this is a default tab, filter modality list for unique items...
          if(defaultTab){
            finalModalityList = _.uniqBy(modalities, "Description1");
          }
          newTab = self.createNewTab(tempDesc, finalModalityList, defaultTab);
          addTab = true;
        }

        //select first tab
        if(aGoal.tabs.length === 0){
          newTab.selected = true;
          aGoal.selectedTab = newTab;
        }

        //get all sheets via description and bodypart, and sort by dayId only returning data where Discharge == NULL
        //this will prevent any "completed" data from displaying
        let descPred = {'SheetDescription': ts.SheetDescription };
        if(!isPreference){
          //add bodypart to predicate filter
          descPred.BodyPart = self.bodyPart;
        }
        // let tDescs = _.filter(daysheetsByGoalId, { 'SheetDescription': ts.SheetDescription, 'BodyPart': self.bodyPart });
        let tDescs = _.filter(daysheetsByGoalId, descPred);
        let sortedDays = _.orderBy(tDescs, ['DayID'], ['desc']);
        let dayCount = !isPreference ? sortedDays.length : 1;

        //get all unique activities across all days...
        let uniqueActivitiesAcrossAllDaysForSheetDescription = _.uniqBy(sortedDays, 'Modality');

        //try order by id for most recent on top...
        uniqueActivitiesAcrossAllDaysForSheetDescription = _.orderBy(uniqueActivitiesAcrossAllDaysForSheetDescription, ['ID'], ['desc']);

        let uniqueActivityList =[];
        for(let a = 0; a < uniqueActivitiesAcrossAllDaysForSheetDescription.length; a++){
          let newAct = new Activity(uniqueActivitiesAcrossAllDaysForSheetDescription[a].Modality);
          if(uniqueActivitiesAcrossAllDaysForSheetDescription[a].hasOwnProperty('PrefID')){
            newAct.pt_daysheet_pref_ID = uniqueActivitiesAcrossAllDaysForSheetDescription[a].ID
          }
          uniqueActivityList.push(newAct);
        }

        for(let d = 0; d < dayCount; d++){
          //add days to tab
          let aDaySheet = sortedDays[d];

          //check for discharge here
          if(aDaySheet.Discharge != null && dischargeTxt == null){
            dischargeTxt = aDaySheet.Discharge;
          }

          let newDay = !isPreference ? self.addDay(newTab, aDaySheet, uniqueActivityList) : self.addDayToTabFromPref(newTab, uniqueActivityList);

          if(!isPreference){
            self.addActivityValue(newDay, aDaySheet.Modality, aDaySheet);
            //when adding data, set hasData on goal to display addGoal +....
            aGoal.hasData = true;
          }
        }
        if(addTab){
          aGoal.tabs.push(newTab);
        }



        // self.ea.publish('resizeDatagrid');

        //callback();


      }

      self.ea.publish('resizeDatagrid');

      if(addGoal){

        self.calculateGoalAlertTime(aGoal);

        //self.goals.push(aGoal);
        self.addGoal(aGoal);

        self.enableDisableActivityDelete();
      }
    }

    if(!isPreference){
      self.addDischargeTab(dischargeTxt);
    }

  }

  toggleAssessment(visible){
    this.displayAssessment = visible;
    this.activityTop = visible ? 195 : 54;
  }


  createGoal(description){
    let d = description == undefined ? "":description;
    d = d == null ? "" : d;
     return new Goal(d);
  }

  createGoalFromExisting(od_pt_daysheet_goal, isPreference){
    //create new goal
    let self = this;
    let sDate = isPreference ? self.visitDate : (od_pt_daysheet_goal.StartDate == null ? self.visitDate : self.helper.getISODateToFormat(od_pt_daysheet_goal.StartDate, "MM/DD/YY"));
    let aGoal = self.findGoalById(od_pt_daysheet_goal.Id);
    if(aGoal == null){
      aGoal = new Goal(od_pt_daysheet_goal.Description, sDate);
      aGoal.assessment = od_pt_daysheet_goal.Assessment;
      //aGoal.id = od_pt_daysheet_goal.Id;

      if(!isPreference){
        aGoal.id = od_pt_daysheet_goal.Id;
        aGoal.sheetId = od_pt_daysheet_goal.SheetID;
        aGoal.dueDate = od_pt_daysheet_goal.DueDate;
        aGoal.dateFormat = od_pt_daysheet_goal.DateFormat;
      }

      let goalUser = od_pt_daysheet_goal.UserId;
      if(goalUser == null || goalUser == 0){
        goalUser = self.userId;
      }
      aGoal.userId = goalUser;
      return {"goal": aGoal, "addGoal": true}
    }
    return {"goal": aGoal, "addGoal": false}
  }

  addEmptyDay(){
    return this.addDay(this.selectedGoal.selectedTab,undefined, this.selectedGoal.selectedTab.activitiesCompletedOnTab, true, true);
  }

  addDayToTabFromPref(tab, activities){
    for(let i = 0; i < activities.length; i++){
      tab.activitiesCompletedOnTab.push(activities[i]);
    }
    this.addDay(tab,undefined, tab.activitiesCompletedOnTab, true, true);
  }

  addDay(tab, daysheet, uniqueActivitiesAcrossAllDaysForSheetDescription, addToTop, addActivitiesToUpdate){
    let self = this;
    let aDate =  daysheet != undefined ? self.helper.getISODateToFormat(daysheet.ExamDateTime, "MM/DD/YY") : self.visitDate;

    let foundDay = self.findDay(aDate,tab);
    if(foundDay==null){
      foundDay = new Day(aDate);
      //foundDay.tab = tab;
      foundDay.id = daysheet == undefined ? 0 : daysheet.DayID;
      foundDay.sheetId = self.sheetId;
      foundDay.totalTime = daysheet != undefined ? daysheet.TotalTime : null;

      if(addToTop){
        for(let d = 0; d < tab.days.length; d++){
            tab.days[d].selected = false;
        }
        foundDay.selected = true;
        tab.currentDay = foundDay;
        tab.days.unshift(foundDay);
      }else {
        if(tab.days.length == 0){
          //select first day
          tab.currentDay = foundDay;
          tab.currentDay.selected = true;
        }
        tab.days.push(foundDay);
      }

      //resort days array by date
      let sorted = _.orderBy(tab.days, ['sortableDate'],['desc']);
      tab.days = sorted;

      //add all possible activities to day
      for(let a = 0; a < uniqueActivitiesAcrossAllDaysForSheetDescription.length; a++){
        let aActivity = new Activity(uniqueActivitiesAcrossAllDaysForSheetDescription[a].description);
        foundDay.activities.push(aActivity);
        tab.addCompletedActivity(aActivity, addToTop);

        if(addActivitiesToUpdate)
          foundDay.activitiesToUpdate.push(aActivity);
      }
    }

    return foundDay;
  }


  addModality(modality, tab, day, addToTop){
    let modalityToUpdate, tabToUpdate, dayToUpdate;
    modalityToUpdate = modality == null ? this.selectedModality : modality;
    tabToUpdate = tab == null ? this.selectedGoal.selectedTab : tab;
    dayToUpdate = day == null ? tabToUpdate.currentDay : day;
    tabToUpdate.addCompletedActivity(modalityToUpdate, addToTop);
    if(dayToUpdate){
      // if(addToTop){
      //   dayToUpdate.activities.unshift(modalityToUpdate);
      // }else{
      //   dayToUpdate.activities.push(modalityToUpdate);
      // }

      //update each tab day...
      for(var d = 0; d < tabToUpdate.days.length; d++){
        var clone = d == 0 ? modalityToUpdate : _.cloneDeep(modalityToUpdate);
        if(addToTop){       
          tabToUpdate.days[d].activities.unshift(clone);
        }else{
          tabToUpdate.days[d].activities.push(clone);
        }
      }

      dayToUpdate.activitiesToUpdate.push(modalityToUpdate);
    }
  }

  addActivityValue(day, activityDescription, daysheet){
    var self = this;
    //get activity from day
    for(var d = 0; d < day.activities.length; d++){
      if(day.activities[d].description == activityDescription){
        day.activities[d].value = daysheet.Value;
        day.activities[d].id = daysheet.ID;
        day.activities[d].data = daysheet;
        day.activities[d].actPass = daysheet.ActPass;
        day.activities[d].backgroundColor = daysheet.ActPass == null ? '' : self.getActivityBackgroundColorByActPass(daysheet.ActPass);
      }
    }
  }

  enableDisableActivityDelete(){
    let self = this;
    //try setting activities as having value...
    if(self.selectedGoal && self.selectedGoal.selectedTab){
      for(let a = 0; a < self.selectedGoal.selectedTab.activitiesCompletedOnTab.length; a++){
        let desc = self.selectedGoal.selectedTab.activitiesCompletedOnTab[a].description;
        for(let d = 0; d < self.selectedGoal.selectedTab.days.length; d++){
          let aDay = self.selectedGoal.selectedTab.days[d];
          if(aDay.activityHasValue(desc)){
            self.selectedGoal.selectedTab.activitiesCompletedOnTab[a].hasValue = true;
          }
        }
      }
    }
  }


  createNewTab(description, modalities, addAllModalities){
    let self = this;
    let aTab = new Tab(description);
    //let now = moment().format('MM/DD/YY');

    //filter modalities...
    let filteredModalities = addAllModalities ? modalities : _.filter(modalities, function(m){return m.Description2 == description && (m.BodyPart == self.bodyPart || m.BodyPart == "")});
    for(let m = 0; m < filteredModalities.length; m++){
      let tMod = filteredModalities[m];
      aTab.activitylist.push(new Activity(tMod.Description1));     
    }

    //add activitylist to dropdown
    // for(let m = 0; m < modalities.length; m++){
    //   let tMod = modalities[m];
    //   if(tMod.Description2 == description || addAllModalities){
    //     //if the current modality description equals tab description, add it to activitylist
    //     aTab.activitylist.push(new Activity(tMod.Description1));
    //   }
    // }
    return aTab;
  }

  populatePriorValues(){
      //look to selectedGoal for any previous data
    let self = this;
    if(self.selectedGoal &&
      self.selectedGoal.selectedTab &&
      self.selectedGoal.selectedTab.currentDay){

      let dayToUpdate = self.selectedGoal.selectedTab.currentDay;
      //is current day TODAY? if not, create a new day
      let today = moment(self.visitDate);
      let currentDate = moment(dayToUpdate.date);
      if(today.year() != currentDate.year() ||
        today.month() != currentDate.month() ||
        today.date() != currentDate.date()){
        //create new day
        let newDay = self.addEmptyDay();
        //update data w/ previous
        for(let i = 0; i < dayToUpdate.activities.length; i++){
          //do act/pass coloring...
          let actPass = dayToUpdate.activities[i].actPass;
          if(actPass != null){
            newDay.activities[i].backgroundColor = self.getActivityBackgroundColorByActPass(actPass);
            newDay.activities[i].actPass = actPass;
          }
          newDay.activities[i].value = dayToUpdate.activities[i].value;

          //see if activity already exists...

          //newDay.activitiesToUpdate.push(newDay.activities[i]);
        }
      }else{
        //update existing day
        //get previous day data
        let prior = self.selectedGoal.selectedTab.days[1];
        for(let i = 0; i < prior.activities.length; i++){
          //do act/pass coloring...
          let actPass = prior.activities[i].actPass;
          if(actPass != null){
            dayToUpdate.activities[i].backgroundColor = self.getActivityBackgroundColorByActPass(actPass);
            dayToUpdate.activities[i].actPass = actPass;
          }
          dayToUpdate.activities[i].value = prior.activities[i].value;

          dayToUpdate.activitiesToUpdate.push(dayToUpdate.activities[i]);
        }
      }
    }
  }


  copyValuesFromDayToDay(fromDay, toDay){
    for(let i = 0; i < fromDay.activities.length; i++){
      //do act/pass coloring...
      let actPass = fromDay.activities[i].actPass;
      if(actPass != null){
        toDay.activities[i].backgroundColor = self.getActivityBackgroundColorByActPass(actPass);
        toDay.activities[i].actPass = actPass;
      }
      toDay.activities[i].value = fromDay.activities[i].value;
    }
  }

  copyActivityiesFromGoalToGoal(goalIdCopyFrom, goalObjectToCopyTo, copyData){
    //goals=>tabs=>days
    //let method1 = Object.assign({}, obj);
    //find goal to copy from via id
    let self = this;
    for(let g = 0; g < self.goals.length; g++){
      let aGoal = self.goals[g];
      if(aGoal.id == goalIdCopyFrom){
        //found it, loop through tabs
        for(let t = 0; t < aGoal.tabs.length; t++){
          let aTab = aGoal.tabs[t];
          let copiedTab = Object.assign({}, aTab);
          copiedTab.days=[];
          //zero out new data
          for(let d = 0; d < aTab.days.length; d++){
            let aDay = aTab.days[d];
            let copiedDay = Object.assign({}, aDay);
            copiedDay.activities=[];
            for(let a = 0; a < aDay.activities.length; a++){
              let aAct = aDay.activities[a];
              let copiedActivity = Object.assign({}, aAct);

              if(copyData){
                //copy data too
                this.addActivityValue(copiedDay, aAct.description, aAct.data);
              }
              else{
                copiedActivity.data = null;
              }
              copiedActivity.id = 0;
              copiedDay.activities.push(copiedActivity);
            }
            copiedTab.days.push(copiedDay);
          }
          goalObjectToCopyTo.addTab(copiedTab);
          //goalObjectToCopyTo.tabs.push(copiedTab);
        }
      }
    }
  }

  updateDaysheetWithGoalIds(sheetId, goalId){
    //ptdaysheet/updategoalids
    // public int SheetId { get; set; }
    // public int GoalId { get; set; }

    let goalObj = {
      "SheetId": sheetId,
      "GoalId": goalId
    }

    let self = this;
    let url = 'ptdaysheet/updategoalids';
    self.http.post(self.helper.getApiUrl(url), goalObj);
    // self.http.post(self.helper.getApiUrl(url), goalObj, function (res) {
    //   callback(res);
    // }, function (err) {
    //   let e = err;
    // });
  }

  saveGoal(goal, callback){

    if(goal.isDischarge)return;

    let self = this;
    let url = "ptdaysheet/goal";

    let gUserId = goal.userId;
    if(gUserId == undefined ||
        gUserId == 0 ||
        gUserId == null){
      gUserId = self.userId;
    }

    let tGoal = {
      "Id":goal.id,
      "Assessment":goal.assessment,
      "Description":goal.description,
      "UserId":gUserId,
      "StartDate": goal.startDate,
      "SheetID": goal.sheetId,
      "DueDate": goal.dueDate,
      "DateFormat": goal.dateFormat
    }
    self.http.post(self.helper.getApiUrl(url), tGoal, function (res) {
      callback(res);
    }, function (err) {
      let e = err;
    });
  }

  createPrefSaveObject(prefId, description, postOpPrefId, bodypart, isNew, callback){
    //new changes
    let self = this;
    let tSheets = {
      "Prefs":[],
      "PostOpPrefId": postOpPrefId
    }

    if(isNew){
      callback(tSheets);
      return
    }
    /*
    let hasGoals = true;
    if(!self.goals || self.goals.length === 0) {
      let aPref ={
        "pref":{
          "PrefID":prefId,
          "ProviderID":self.providerId,
          "UserID":self.userId,
          "PrefDescription":description,
          "ID": 0
        }
      };
      tSheets.Prefs.push(aPref);
      alert("You're saving a pref with no goal.");
      hasGoals = false;
      //callback(tSheets);
      //return;
    }
    if(hasGoals) {

     */
      for (let g = 0; g < self.goals.length; g++) {
        //get each goal
        let aGoal = self.goals[g];
        let aPref ={
          "pref":{
            "PrefID":prefId,
            "ProviderID":self.providerId,
            "UserID":self.userId,
            "PrefDescription":description,
            "ID": 0
          }
        };

        if(!aGoal.tabs || aGoal.tabs.length === 0) {
          tSheets.Prefs.push(aPref);
        }

        for (let t = 0; t < aGoal.tabs.length; t++) {
          let aTab = aGoal.tabs[t];

          if(!aTab.activitiesCompletedOnTab || aTab.activitiesCompletedOnTab.length === 0) {
            tSheets.Prefs.push(aPref);
          }

          for (let d = 0; d < aTab.activitiesCompletedOnTab.length; d++) {
            let aAct = aTab.activitiesCompletedOnTab[d];

            //find unique pref ID by description, sheet descriptiojn, and modality
            let foundPref = _.find(self.providerPrefs, {
              'SheetDescription': aTab.description,
              'Modality': aAct.description,
              'PrefDescription': description
            });
            let uniquePrefId = foundPref === undefined ? 0 : foundPref.ID;

            //self.selectedAssessmentPref.Description1;

            aPref = {
              "pref": {
                "PrefID": prefId,
                "ProviderID": self.providerId,
                "UserID": self.userId,
                "PrefDescription": description,
                "Modality": aAct.description,
                "SheetDescription": aTab.description,
                "GoalId": aGoal.id,
                "ID": uniquePrefId,
                "Bodypart": bodypart
              },
              "goal": {
                "Id": aGoal.id,
                "Description": aGoal.description,
                "Assessment": aGoal.assessment,
                "UserID": aGoal.userId,
                "DateFormat": aGoal.dateFormat,
                "StartDate": aGoal.startDate,
                "DueDate": aGoal.dueDate,
                "SheetID": prefId
              }
            }
            tSheets.Prefs.push(aPref);
          }
        }
      }
    //}
    callback(tSheets);
  }

  newPreferenceClick() {
    let self = this;
    self.popupHelper.openGenericInputPop("Description", ['Create New Preference'], "Create", false, function (res){
      self.saveNewPreference(res.inputs[0].value, 0, self.bodyPart, self.providerId, function(res){

        //TODO: display tab picker...
        self.createTabWithPopup(function(tabResults){

          //update pref res SheetDescription w/ first result from tabResults...
          res.SheetDescription= tabResults[0].description;

          //try this...
          self.clearDaysheet();
          self.providerPrefs.push(res);
          self.preferenceList.push(res);// = _.uniqBy(prefs, 'PrefDescription');

          self.selectPreferenceByPrefId(res.PrefID);

        });

      });
    });
  }

  // newTabClick(callback){
  //   let self = this;
  //   //filter modality list by unique tab descriptions
  //   let tabs = self.getUniqueTabsFromList();

  //   let firstTabDescription =null;

  //   self.dialogService.open({viewModel: TabPopup, model: tabs}).whenClosed(response => {
  //     for(let i = 0; i < response.output.length; i++){
  //       if(i == 0){
  //         firstTabDescription = response.output[i].Description2;
  //       }
  //       let aTab = self.createNewTab(response.output[i].Description2, self.allModalities);
  //       self.selectedGoal.addTab(aTab);
  //     }
  //     if(callback){
  //       callback(firstTabDescription);
  //     }
  //   });
  // }

  newTabClick(){
    let self = this;
    //filter modality list by unique tab descriptions
    // let tabs = self.getUniqueTabsFromList();

    // let firstTabDescription =null;

    // self.dialogService.open({viewModel: TabPopup, model: tabs}).whenClosed(response => {
    //   for(let i = 0; i < response.output.length; i++){
    //     if(i == 0){
    //       firstTabDescription = response.output[i].Description2;
    //     }
    //     let aTab = self.createNewTab(response.output[i].Description2, self.allModalities);
    //     self.selectedGoal.addTab(aTab);
    //   }
    //   if(callback){
    //     callback(firstTabDescription);
    //   }
    // });
    self.createTabWithPopup(function(tabRes){
      for(let t = 0; t < tabRes.length; t++){
        self.selectedGoal.addTab(tabRes[t]);
      }
    })
  }

  createTabWithPopup(callback){
    let self = this;
    //filter modality list by unique tab descriptions
    let tabs = self.getUniqueTabsFromList();

    let tabResults=[];

    self.dialogService.open({viewModel: TabPopup, model: tabs}).whenClosed(response => {
      for(let i = 0; i < response.output.length; i++){
        let aTab = self.createNewTab(response.output[i].Description2, self.allModalities);
        tabResults.push(aTab);
        //self.selectedGoal.addTab(aTab);
      }
      if(callback){
        callback(tabResults);
      }
    });
  }


  removeActivity(){
    let self = this;
    if(self.selectedProviderPref){
      //let postOpPrefId = self.selectedProviderPref.PrefID;
      let description = self.selectedProviderPref.PrefDescription;
      self.updatePreference(description, self.selectedProviderPref.PrefID, self.bodyPart);
    }
  }


  // saveNewPreference(description, postOpPrefId, bodypart, callback){
  //     let self = this;
  //     //generate new PrefID
  //     let url = "ptdaysheet/pref/generate/id";
  //     self.http.get(self.helper.getApiUrl(url), function(id){
  //       if(id){

  //         let n = self.helper.createNoty("Saving Preference...", 3000);
  //         n.show();

  //         self.createPrefSaveObject(id, description, postOpPrefId, bodypart, true, function(saveObj){

  //           url = "ptdaysheet/pref";
  //           self.http.post(self.helper.getApiUrl(url), saveObj, function (res) {
  //             callback(res);
  //             self.helper.notySuccess(n, 'Preference Saved!');
  //           }, function (err) {
  //             self.helper.notyError(n, "Preference Failed to save.");
  //             let e = err;
  //           });
  //         });
  //       }
  //     });
  // }

  saveNewPreference(description, postOpPrefId, bodypart, providerId, callback){
    let self = this;
    //get new Pref...
    let url = "ptdaysheet/pref/new";
    self.http.get(self.helper.getApiUrl(url), function(newPref){
      if(newPref){

        // let n = self.helper.createNoty("Saving Preference...", 3000);
        // n.show();
        newPref.PrefDescription = description;
        newPref.ID = postOpPrefId;
        newPref.ProviderID = providerId;
        newPref.UserID = self.userId;
        newPref.Bodypart = bodypart;

        self.selectedProviderPref = newPref;

        callback(newPref);
      }
    });
}

  updatePreference(description, postOpPrefId, bodypart){
    let self = this;
    let url = "";
    let prefId=null, prefDescription=null;

    if(self.selectedProviderPref == null ||
    self.selectedProviderPref == undefined){
      //try to find it
      let foundPref = _.find(this.preferenceList, { 'PrefDescription': description});
      if(foundPref != undefined){
        prefId = foundPref.PrefID;
        prefDescription = foundPref.PrefDescription;
      }
    }else{
      prefId = self.selectedProviderPref.PrefID;
      prefDescription = self.selectedProviderPref.PrefDescription;
    }

    if(prefId != null && prefDescription != null){

      let n = self.helper.createNoty("Saving Preference...", 3000);
      n.show();

      self.createPrefSaveObject(prefId, prefDescription, postOpPrefId, bodypart, false, function(saveObj){
        url = "ptdaysheet/pref";
        self.http.post(self.helper.getApiUrl(url), saveObj, function (res) {
          //callback(res);
          self.helper.notySuccess(n, 'Preference Saved!');
        }, function (err) {

          self.helper.notyError(n, "Preference Failed to save.");
          let e = err;
        });
      });
    }
  }

  getBoundObject() {
    let self = this;
    // console.log('LAUNCH VIDEO', bound);
    let bridge = undefined;
    if(typeof bound === 'undefined'){
      if(typeof chrome !== "undefined") {
        if(chrome.webview && chrome.webview.hostObjects){
          bridge = chrome.webview.hostObjects.bound;
          console.log('bridge from chrome.webview.hostObjects:', bridge);
          console.log('chrome', chrome);
        }
      }
    } else {
      bridge = bound;
    }
    return bridge;
  }

  callbackToWindowsOnSave(){
    let self = this;
    let bridge = self.getBoundObject();
    if(typeof bridge !== 'undefined'){

      //bridge.save_complete();
      bridge.FollowUpExam_SaveComplete();
    }
  }

  saveInitiated(){
    let self = this;
    let bridge = self.getBoundObject();
    if(typeof bridge !== 'undefined'){

      //bridge.save_complete();
      bridge.FollowUpExam_SaveInitiated();
    }
  }

  saveDaysheet(callback){

    let self = this;

    if(getIsEditing()) {
      runCallback();
      setIsEditing(false, null);
    }

    //get any data passed from parms here...
    let dischargeValue = null;

    let disRes= _.find(self.goals, function(g) { return g.isDischarge; });
    dischargeValue = disRes == undefined ? "" : disRes.assessment;

    let dayCountCheck = 0;

    //do stopwatch ....
    if(this.stopwatchInstance != null &&
      this.stopwatchInstance.displayStopwatch &&
      this.stopwatchInstance.day.clockClicked){
      //update stopwatch before closing...
      this.stopwatchInstance.timerClick();
    }

    //goals=>tabs=>days=>activities

    let url = "ptdaysheet";
    let tSheets = {
      "Sheets":[]
    }
    for(let g = 0; g < self.goals.length; g++){
      //get each goal
      let aGoal = self.goals[g];

      //dont try to save discharge
      if(aGoal.isDischarge){
        continue;
      }

      for(let t = 0; t < aGoal.tabs.length; t++){
        let aTab = aGoal.tabs[t];
        for(let d= 0; d < aTab.days.length; d++){

          dayCountCheck++;//for determining if we need to display SAVE alert...

          let aDay = aTab.days[d];

          for(let a = 0; a < aDay.activitiesToUpdate.length; a++){

            let aAct = aDay.activitiesToUpdate[a];

            if(aAct.data == null){
              //create new daysheet
              let newSheet = self.createDaysheetObject(0, self.bodyPart, aDay.sheetId,
                0, self.providerId, self.userId, self.patientId, aDay.date,
                aAct.description, aAct.value, aTab.description,
                aGoal.id, aGoal.assessment, aGoal.description,
                aGoal.startDate, aGoal.dueDate, aGoal.dateFormat, aGoal.userId, aDay.totalTime, aAct.actPass, dischargeValue, self.daysheetType);
              tSheets.Sheets.push(newSheet);
            }else{
                tSheets.Sheets.push(self.createDaysheetObjectWithActivityGoalAndDay(aAct, aGoal, aDay, dischargeValue));
            }
          }

          //remove updated activities...
          aDay.activitiesToUpdate = [];


        }
      }
    }

    //we must have at least a DAY, to save data...
    if(dayCountCheck==0){
      let warningDesc = "No Date Created!";
      let bodyText = "Please create Activity date to save.";
      self.displayAlert(warningDesc, bodyText, "fa fa-lg fa-hand-paper-o", "red");
      if(callback){
        callback();
      }
      return false;
    }

    if(tSheets.Sheets.length == 0){
      self.callbackToWindowsOnSave();
      if(callback){
        callback();
      }
      return true;
    }

    let n = self.helper.createNoty("Saving Daysheet...", 3000);
    n.show();


    self.http.post(self.helper.getApiUrl(url), tSheets, function (res) {
      //callback(res);

      self.callbackToWindowsOnSave();

      self.ea.publish('daysheet_saved');

      if(callback){
        callback();
      }

      self.helper.notySuccess(n, 'Daysheet Saved!');


      self.getDaySheets(self.patientId, function(r){
        self.loadDaysheet(r, self.allModalities, false);
      });



      return true;
    },undefined, function (err) {

      self.helper.notyError(n, "Daysheet Failed to save.");
      self.callbackToWindowsOnSave();

      if(callback){
        callback();
      }

      return false;
    }, function(){
      self.saveInitiated();
    });
  }





  createDaysheetObject(id, bodypart, sheetId, dayId, providerId, userId, patientId, date, activity, value, sheetDescription, goalId, assessment, goalDescription, goalStartDate, goalDueDate, goalDateFormat, goalUserId, totalTime, actPass, discharge, daysheetType){
    let newAct={
      "ID":id,
      "BodyPart": bodypart,
      "Type": daysheetType,
      "SheetID":sheetId,
      "DayID":dayId,
      "ProviderID": providerId,
      "UserID": userId,
      "PatientID": patientId,
      "ExamDateTime": date,
      "Modality": activity,
      "Value": value,
      "SheetDescription": sheetDescription,
      "GoalId": goalId,
      "TotalTime": totalTime,
      "ActPass": actPass,
      "Discharge": discharge,
      "Goal":{
        "Assessment": assessment,
        "Description": goalDescription,
        "StartDate": goalStartDate,
        "DueDate": goalDueDate,
        "DateFormat": goalDateFormat,
        "id": goalId,
        "UserId": goalUserId,
        "SheetID": sheetId
      }
    }
    return newAct;
  }

  createDaysheetObjectWithActivityGoalAndDay(activity, goal, day, discharge){

    let self = this;


    //check if this activity was created BEFORE goal...
    //if so, DONT associate goal data with daysheet object.
    //if(activity.data.ExamDateTime)
    let examDate = moment(activity.data.ExamDateTime);
    let startDate = moment(goal.startDate);
    let deleteGoal = false;
    if(activity.data.GoalId == null &&
      examDate < startDate){
      //do not associate this daysheet w/ goal...
      //create EMPTY goal object
      deleteGoal = true;
    }

    let daysheet = this.createDaysheetObject(activity.data.ID, activity.data.BodyPart,
      activity.data.SheetID, activity.data.DayID, activity.data.ProviderID,
      activity.data.UserID, activity.data.PatientID, activity.data.ExamDateTime,
      activity.data.Modality, activity.value, activity.data.SheetDescription,
      goal.id, goal.assessment, goal.description, goal.startDate,
      goal.dueDate, goal.dateFormat, goal.userId, day.totalTime, activity.actPass, discharge, self.daysheetType);

    if(deleteGoal){
      daysheet.Goal = null;
    }


    return daysheet;
  }


//   getActivityFontSize(text){
//     let self = this;
//     // $("#daysheetTable tr").each(function(){
//     //   let txtEl = $(this).find("td:first");
//     //   if(txtEl.length > 0){
//         self.getFontSize(text);
//         let txt = txtEl.text();
//         if(w > self.activityColumnWidth){
//           self.activityColumnWidth = w;
//          }
//     //   }
//     // });
//   }
//
//   getFontSize(el){
//     var style = window.getComputedStyle(el, null).getPropertyValue('font-size');
//     var fontSize = parseFloat(style);
// // now you have a proper float for the font size (yes, it can be a float, not just an integer)
//     el.style.fontSize = (fontSize + 1) + 'px';
//   }



  //Data retrieval **********************************


  getAssessmentPrefs(providerId, callback){
    let self = this;
    let url = "listcombo?listType=assessment&providerId=" + providerId;
    self.http.get(self.helper.getApiUrl(url), function(json){
      if (json != null && json.length > 0) {
        callback(json);
      }
    });
  }

  getDischargePrefs(providerId, callback){
    let self = this;
    let url = "listcombo?listType=discharge&providerId=" + providerId;
    self.http.get(self.helper.getApiUrl(url), function(json){
      if (json != null && json.length > 0) {
        callback(json);
      }
    });
  }

  filterModalitiesByBodypartAndDescription2(bodypart, description2){
    let self = this;
    return _.filter(self.allModalities, function(m){return m.Description2 == description2 && m.BodyPart == bodypart});
  }

  getModalities(providerId, callback){
    var self = this;
    var url = "modalities?type=&providerId=" + providerId;
    self.http.get(self.helper.getApiUrl(url), function(json){
      if (json != null) {
        callback(json);
      }
    });
  }

  getProviderPrefs(providerId, bodypart, callback){
    var self = this;
    var url = "ptdaysheet/prefs?providerId=" + providerId +"&bodypart="+bodypart;// "&userId=" + userId;
    self.http.get(self.helper.getApiUrl(url), function(json){
      if (json != null && json.length > 0) {
        callback(json);
      }
    });
  }

  getDaySheets(patientId, callback){
    let self = this;

    if(self.editMode){
      callback([]);
      return;
    }

    let url = "ptdaysheet?patientId=" + patientId + "&date=" + self.visitDate + "&bodypart=" + self.bodyPart;
    self.http.get(self.helper.getApiUrl(url), function(json){
      if (json != null) {
        callback(json);
      }
    });
  }

  deleteModality(sheetId, patientId, modalityDescription){
    let self = this;
    let url = "ptdaysheet/modality/delete";
    let toDelete = {
      "sheetId": sheetId,
      "patientId": patientId,
      "modalityDescription": modalityDescription
    }

    self.http.put(self.helper.getApiUrl(url), toDelete, function (res) {
        let success = res;
    });
  }

  deleteDaySheetPref(id, callback){
    let self = this;
    let url = `ptdaysheet/pref/delete?id=${id}`;
    self.http.del(self.helper.getApiUrl(url), function (res) {
        callback(res);
    });
  }

  checkForExistingGoal(description, sheetId, callback){
    var self = this;
    let url = 'ptdaysheet/goal?sheetId=' + sheetId + '&description=' + description;
    self.http.get(self.helper.getApiUrl(url), function(json){
      if (json != null) {
        callback(json);
      }else{
        callback(null);
      }
    });
  }
}
