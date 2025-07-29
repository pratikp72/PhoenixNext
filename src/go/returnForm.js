import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';


class Mycheckbox{

  @observable checked;

  constructor(detail, parent, callback){
    this.checked = false;
    this.callback = callback;
    this.detail=detail;
    this.parent = parent;
  }

  select(){
    this.checked = this.checked ? false : true;
  }

  checkedChanged(){
    if(this.callback){
      this.callback();
    }
  }
}

@inject(helper,http, Data, Home)
export class ReturnForm {

  modifiedActivity;
  modifiedActiviesList=['No sports', 'No gym class', 'No swimming', 'Must use crutches','Must wear cast, splint or brace at all times', 'Must be allowed to elevate injured extremity in class']

  // hasRestrictions = false;

  sportStatus;
  sportStatusList = ['No sports', 'Modified sports', 'Normal sports'];

  ambulation;
  ambulationList=['Walking', 'Jogging', 'Running', 'Cutting', 'Leaping', 'Hopping', 'Jumping', 'Quick start and stop'];

  throwing;
  throwingList=['Short distance', 'Long distance', 'Gentle lob', 'Gentle line-drive', 'Hard lin-drive', 'Batting'];

  @bindable excuseFromDatePicker;
  @observable excuseFromDate;
  @bindable excuseToDatePicker;
  @observable excuseToDate;
  @bindable returnToSchoolDatePicker;
  @observable returnToSchoolDate;
  @bindable returnToSportsDatePicker;
  @observable returnToSportsDate;

  showReturnToSports = false;
  showModifiedSports = false;


  excuseCheck;
  excuseDateRangeCheck;
  restrictionsCheck;
  returnToSchoolCheck;

  comments="";

  preferences=[];

  @observable selectedPref;
  selectedPrefChanged(newVal, oldVal){
    if(newVal && newVal.hasOwnProperty("Id")){
      this.concat();
    }
  }

  providerId;

  popupHelper;

  sportNoteData;
  schoolNoteData;
  workNoteData;
  workNoteId=0;

  workRelatedList=['Yes', 'No', 'Do not know'];
  workStatusList=['No work', 'Modified Duties', 'Graduated RTW', 'Full Duties'];
  workCapabilitiesList=['Sedentary Work', 'Light Work', 'Medium Work', 'Heavy Work', 'Very Hard Work'];
  @observable workRelated;
  workRelatedChanged(newVal, oldVal){
    this.concatWork();
  }
  @observable workStatus;
  workStatusChanged(newVal, oldVal){
    this.concatWork();
  }
  @observable workCapabilities;
  workCapabilitiesChanged(newVal, oldVal){
    this.concatWork();
  }
  workNextApptIsDays = true;
  @observable nextApptDate;
  nextApptDateChanged(newVal, oldVal){
    this.concatWork();
  }
  @observable nextApptDateValue;
  nextApptDateValueChanged(newVal, oldVal){
    this.concatWork();
  }
  @observable nextApptDaysWeeksValue;
  nextApptDaysWeeksValueChanged(newVal, oldVal){
    this.concatWork();
  }
  @observable nextApptDaysWeeks;
  nextApptDaysWeeksChanged(newVal, oldVal){
    this.concatWork();
  }

  formTypeSchool=true;

  constructor(helper, http, Data, Home) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
  }

  activate(params) {
    var self = this;

    //self.providerId = params.currentProvider.ProviderID;
    self.popupHelper = params.popupHelper;

    self.patientId = params.currentBoard.visitInfo.patientId;
    self.date = params.currentBoard.visitInfo.date;
    self.providerId= params.currentBoard.visitInfo.providerId;
    self.userId = params.currentBoard.userId;

    self.excuseCheck = new Mycheckbox("Please excuse the student's absence from school today. The student was in our office for evaluation", self, self.concatDelegate);
    self.excuseDateRangeCheck = new Mycheckbox("Please excuse the student's absence from school for date range:",self, self.concatDelegate);
    self.returnToSchoolCheck = new Mycheckbox("May return to school on:", self, self.concatDelegate);
    self.restrictionsCheck = new Mycheckbox("Restrictions", self, self.concatDelegate);

    if(self.providerId){
      let url = `returnto?providerId=${self.providerId}`;
      self.data.getWithUrl(url, function(res){
        self.preferences = res;
      });
    }

    self.load();
  }

  toggleFormType(){
    this.formTypeSchool = this.formTypeSchool ? false : true;
  }

  toggleWorkNextAppt(){
    this.workNextApptIsDays = this.workNextApptIsDays ? false : true;
  }

  openNextApptDate(){
    this.nextApptDate.methods.toggle();
  }

  excuseToDateChanged(){
    this.concat();
  }

  excuseFromDateChanged(){
    this.concat();
  }

  returnToSchoolDateChanged(){
    this.concat();
  }

  returnToSportsDateChanged(){
    this.concat();
  }

  concatDelegate(){
    this.parent.concat();
  }

  valuesSelected(){
    if(!this.excuseCheck.checked &&
      !this.excuseDateRangeCheck.checked &&
      !this.returnToSchoolCheck.checked &&
      !this.restrictionsCheck.checked &&
      !this.showReturnToSports &&
      !this.showModifiedSports &&
      !this.sportStatus){
        return false;
      }
      return true;
  }

  concatWork(){
    let self = this;
    self.comments="";

    if(self.workRelated){
      if(self.workRelated == 'Yes'){
        self.comments += "The injury is work related. "
      }else if(self.workRelated == 'No'){
        self.comments += "The injury is not work related. "
      }
    }

    if(self.workStatus && self.workCapabilities){
      self.comments += "The patient can perform " + self.workStatus.toLowerCase() + ", with the capablity of " + self.workCapabilities.toLowerCase() + ". ";
    }else if(self.workStatus){
      self.comments += "The patient can perform " + self.workStatus.toLowerCase() + ". ";
    }else if(self.workCapabilities){
      self.comments += "The patient is capable of performing " + self.workCapabilities.toLowerCase() + ". ";
    }

    if(self.workNextApptIsDays && self.nextApptDaysWeeksValue && self.nextApptDaysWeeks){
      self.comments += "The patient's next appointment is in " + self.nextApptDaysWeeksValue.toLowerCase() + " " + self.nextApptDaysWeeks.toLowerCase() + ". ";
    }else if(self.nextApptDateValue){
      self.comments += "The patient's next appointment is on " + self.nextApptDateValue.toLowerCase() + ". ";
    }

    self.comments = self.comments.trimEnd();
  }

  concat(){
    let self = this;
    self.comments="";

    if(self.selectedPref){
      self.comments = self.selectedPref.Detail.trim();

      //check for period...
      let period = self.comments.substr(self.comments.length - 1);
      if(period!=='.'){
        //add period...
        self.comments += ". ";
      }else{
        self.comments += " ";
      }
    }

    if(self.excuseCheck.checked){
      self.comments += self.excuseCheck.detail + ". ";
    }

    if(self.excuseDateRangeCheck.checked){
      let final = self.excuseDateRangeCheck.detail;
      if(self.excuseFromDate){
        final += " " + self.excuseFromDate;
      }
      if(self.excuseToDate){
        final += " to " + self.excuseToDate;
      }
      self.comments += final + ". ";
    }

    if(self.returnToSchoolCheck.checked){
      let final = self.returnToSchoolCheck.detail;
      if(self.returnToSchoolDate){
        final += " " + self.returnToSchoolDate;
      }
      self.comments += final + ". ";
    }

    if(self.restrictionsCheck.checked && self.modifiedActivity){
      self.comments += "Restrictions: " + self.modifiedActivity + ". ";
    }

    if(self.showReturnToSports && self.returnToSportsDate){
      self.comments += "Return to sports on: " + self.returnToSportsDate + ". ";
    }

    if(self.showModifiedSports){
      let final = 'The athlete is able to perform: ';
      if(self.ambulation){
        final += self.ambulation;
      }
      if(self.throwing){
        if(self.ambulation){
          final += " and " + self.throwing;
        }else{
          final += self.throwing;
        }
      }
      self.comments += final + ". ";
    }

    if(self.sportStatus === 'Normal sports'){
      self.comments +=  "The athlete is able to perform: Normal sports. ";
    }
  }

  restrictionsSelected(){
    let self = this;
    self.concat();
  }

  sportStatusSelected(){
    let self = this;

    self.showReturnToSports = false;
    self.showModifiedSports = false;

    if(self.sportStatus == 'No sports'){
      self.showReturnToSports = true;
    }else if(self.sportStatus == 'Modified sports'){
      self.showModifiedSports = true;
    }

    self.concat();
  }

  ambulationSelected(){
    this.concat();
  }

  throwingSelected(){
    this.concat();
  }

  // prefSelected(){
  //   this.concat();
  // }

  updatePref(){
    let self = this;
    let url = 'returnto';

    if(!self.selectedPref){
      self.popupHelper.openGenericMessagePop('Please select a preference to update.', 'Save Preference Requirements', ['OK'], true, function(res){

      });
      return;
    }

    let dialog = self.helper.createNoty("Updating Preference...", 1000);
    dialog.show();

    self.selectedPref.Detail = self.comments;

    self.data.putWithUrlAndData(url, self.selectedPref, function(putRes){
      dialog.close();
    });
  }

  createPref(){
    let self = this;
    let url = 'returnto';
    self.popupHelper.openGenericInputPop('Create New Preference', ['Description'],null,false,
      function (res) {

        let pref={
          'Description': res.inputs[0].value,
          'Detail': self.comments,
          'ProviderId': self.providerId
        }

        let dialog = self.helper.createNoty("Saving Preference...", 1000);
        dialog.show();

        self.data.postWithUrlAndData(url, JSON.stringify(pref), function(postRes){
          dialog.close();
          self.preferences.push(postRes);
        });
      });
  }

  save(){
    let self = this;
    let schoolUrl = 'schoolnote';
    let sportUrl = 'sportnote';
    let workUrl = 'worknote';

    let dialog = self.helper.createNoty("Saving Return To...", 3000);
    dialog.show();


    if(self.formTypeSchool){

      //SCHOOL / SPORT NOTE...

      if(!self.schoolNoteData){
        //create new...
        let schoolNote={
          'ExamDateTime': self.date,
          'UserID': self.userId,
          'PatientID': self.patientId,
          'ProviderId': self.providerId,
          'Comments': self.comments
        }
  
        self.data.postWithUrlAndData(schoolUrl, JSON.stringify(schoolNote), function(saveRes){
          self.schoolNoteData = saveRes;
          self.helper.notySuccess(dialog, 'Return To... saved!');
          //dialog.close();
        });
      }else{
        //update...
        self.schoolNoteData.Comments = self.comments;
        self.data.putWithUrlAndData(schoolUrl, self.schoolNoteData, function(updateRes){
          self.helper.notySuccess(dialog, 'Return To... saved!');
          //dialog.close();
        });
      }
  
      if(!self.sportNoteData){
        //create new...
        let sportNote={
          'ExamDateTime': self.date,
          'UserID': self.userId,
          'PatientID': self.patientId,
          'ProviderId': self.providerId,
          'Comments': self.comments
        }
  
        self.data.postWithUrlAndData(sportUrl, JSON.stringify(sportNote), function(saveRes){
          self.sportNoteData = saveRes;
          self.helper.notySuccess(dialog, 'Return To... saved!');
         // dialog.close();
        });
      }else{
        //update...
        self.sportNoteData.Comments = self.comments;
        self.data.putWithUrlAndData(sportUrl, self.sportNoteData, function(updateRes){
          self.helper.notySuccess(dialog, 'Return To... saved!');
         // dialog.close();
        });
      }
    }else{
      //WORK NOTE!!!!

      self.workNoteData={
        ExamDateTime: self.date,
        PatientID: self.patientId,
        WorkNoteID: self.workNoteId
      }

      self.workNoteData.InstComments = self.comments;

      if(self.nextApptDateValue){
        self.workNoteData.NextApptDate = self.nextApptDateValue;
      }

      if(self.nextApptDaysWeeksValue){
        self.workNoteData.NextApptIn = self.nextApptDaysWeeksValue;
      }

      if(self.nextApptDaysWeeks){
        if(self.nextApptDaysWeeks == 'days'){
          self.workNoteData.NextApptInDays = 1;
        }else{
          self.workNoteData.NextApptInWks = 1;
        }
      }

      if(self.workRelated){
        if(self.workRelated == 'Yes'){
          self.workNoteData.WorkRelatedYes = 1;
        }else if(self.workRelated == 'No'){
          self.workNoteData.WorkRelatedNo = 1;
        }else{
          self.workNoteData.WorkRelatedDontKnow = 1;
        }
      }

      // workStatusList=['No work', 'Modified Duties', 'Graduated RTW', 'Full Duties'];
      if(self.workStatus){
        if(self.workStatus == self.workStatusList[0]){
          self.workNoteData.WorkStatusNoWork = 1;
        }else if(self.workStatus == self.workStatusList[1]){
          self.workNoteData.WorkStatusModDuty = 1;
        }else if(self.workStatus == self.workStatusList[2]){
          self.workNoteData.WorkStatusGraduated = 1;
        }else if(self.workStatus == self.workStatusList[3]){
          self.workNoteData.WorkStatusFull = 1;
        }
      }

      // workCapabilitiesList=['Sedentary Work', 'Light Work', 'Medium Work', 'Heavy Work', 'Very Hard Work'];
      if(self.workCapabilities){
        if(self.workCapabilities == self.workCapabilitiesList[0]){
          self.workNoteData.SedentrayWrk = 1;
        }else if(self.workCapabilities == self.workCapabilitiesList[1]){
          self.workNoteData.LightWrk = 1;
        }else if(self.workCapabilities == self.workCapabilitiesList[2]){
          self.workNoteData.MediumWrk = 1;
        }else if(self.workCapabilities == self.workCapabilitiesList[3]){
          self.workNoteData.HeavyWrk = 1;
        }else if(self.workCapabilities == self.workCapabilitiesList[4]){
          self.workNoteData.VeryHeavyWrk = 1;
        }
      }

      if(self.workNoteData.WorkNoteID == 0){
        self.data.postWithUrlAndData(workUrl, JSON.stringify(self.workNoteData), function(saveRes){
          self.workNoteData = saveRes;
          self.workNoteId = saveRes.WorkNoteID;
          self.helper.notySuccess(dialog, 'Return To... saved!');
        // dialog.close();
        });
      }else{
        //update...
        self.data.putWithUrlAndData(workUrl, self.workNoteData, function(updateRes){
          self.helper.notySuccess(dialog, 'Return To... saved!');
        // dialog.close();
        });
      }

    }

  }

  load(){
    let self = this;
    let schoolUrl = `schoolnote?patientId=${self.patientId}&providerId=${self.providerId}&date=${self.date}`;
    let sportUrl = `sportnote?patientId=${self.patientId}&providerId=${self.providerId}&date=${self.date}`;
    let workUrl = `worknote?patientId=${self.patientId}&providerId=${self.providerId}&date=${self.date}`;

    self.data.getWithUrl(schoolUrl, function(schoolres){
      self.schoolNoteData = schoolres;
      if(schoolres != null){
        self.comments = schoolres.Comments;
      }
    });

    self.data.getWithUrl(sportUrl, function(sportres){
      self.sportNoteData = sportres;
    });

    self.data.getWithUrl(workUrl, function(workRes){
      if(workRes){
        self.workNoteData = workRes;
        self.formTypeSchool = false;

        //self.comments 

        if(self.workNoteData.NextApptDate){
          self.workNextApptIsDays = false;
          self.nextApptDateValue = self.workNoteData.NextApptDate;
        }

        self.nextApptDaysWeeksValue = self.workNoteData.NextApptIn;
        
        if(self.workNoteData.NextApptInDays == 1){
          self.nextApptDaysWeeks == 'days';
        }
        if(self.workNoteData.NextApptInWks == 1){
          self.nextApptDaysWeeks == 'weeks';
        }

        if(self.workNoteData.WorkRelatedYes == 1){
          self.workRelated = 'Yes';
        }
        if(self.workNoteData.WorkRelatedNo == 1){
          self.workRelated = 'No';
        }
        if(self.workNoteData.WorkRelatedDontKnow == 1){
          self.workRelated = 'Do not know';
        }
  
        if(self.workNoteData.WorkStatusNoWork == 1){
          self.workStatus = self.workStatusList[0];
        }
        if(self.workNoteData.WorkStatusModDuty == 1){
          self.workStatus = self.workStatusList[1];
        }
        if(self.workNoteData.WorkStatusGraduated == 1){
          self.workStatus = self.workStatusList[2];
        }
        if(self.workNoteData.WorkStatusFull == 1){
          self.workStatus = self.workStatusList[3];
        }
  
        if(self.workNoteData.SedentrayWrk == 1){
          self.workCapabilities = self.workCapabilitiesList[0];
        }
        if(self.workNoteData.LightWrk == 1){
          self.workCapabilities = self.workCapabilitiesList[1];
        }
        if(self.workNoteData.MediumWrk == 1){
          self.workCapabilities = self.workCapabilitiesList[2];
        }
        if(self.workNoteData.HeavyWrk == 1){
          self.workCapabilities = self.workCapabilitiesList[3];
        }
        if(self.workNoteData.VeryHeavyWrk == 1){
          self.workCapabilities = self.workCapabilitiesList[4];
        }

      }
    });

  }

}
