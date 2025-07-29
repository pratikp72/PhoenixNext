import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import * as _ from 'lodash';
import {EventAggregator} from 'aurelia-event-aggregator';
import moment from 'moment';

// class PicklistItem{
//   constructor(name, data, options){
//     this.name = name;
//     this.options=options;
//     this.selectedOption=null;
//     this.data = data;
//   }
// }

class PicklistItem{
  constructor(data, options, value, editing){
    this.name = data.ColumnFriendlyName;
    this.options=options ? options : [];
    this.selectedOption= value ? value : null;
    this.data = data;
    this.visible = value ? true : false;
    this.editing = editing ? editing : false;
  }
}

class HistoryButton{
  constructor(name, data, visible, editing){
    this.name = name;
    this.data = data;
    this.selected = false;
    this.visible = visible == undefined ? false : visible;
    this.editing = editing ? editing : false;
    this.callback;
    this.parent;
  }

  select(){
    this.selected = this.selected ? false : true;
    if(this.callback){
      this.callback(this);
    }
  }
}

class InputItem{
  constructor(name, value, data, editing, visible){
    this.name = name;
    this.data = data;
    this.value = value;
    this.editing = editing ? editing : false;
    this.visible = visible == undefined ? false : visible;
  }
}


@inject(helper,http, Data, Home, EventAggregator)
export class PatientHistory {

  history={};


  displayPatHx=true;
  displayFamHx=false;
  displaySocHx=false;
  displayMeds=false;
  displayRos=false;
  displayVitals=false;


  windowHeight=0;
  demographics;
  isFemale = false;

  otherDiseaseList=[];
  otherOrthoList=[];
  otherDiseaseInput=null;
  otherOrthoInput=null;

  otherFatherInput=null;
  otherMotherInput=null;
  otherSiblingInput=null;

  patientHxShowDocumented=true;
  socialHxShowDocumented=true;
  rosShowDocumented=true;
  edit=false;

  socHxData=null;
  vitalData=[];

  saveObject=null;

  saveHx=false;
  hasSaved = false;

  date;

  famhxReviewed = false;
  phxReviewed = false;
  socHxReviewed = false;
  rosReviewed = false;

  updateFatherOther = false;
  updateMotherOther = false;
  updateSiblingOther = false;

  constructor(helper, http, Data, Home, EventAggregator) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.event = EventAggregator;
  }

  getNewHistoryButton(name, data, visible, editing){
    return new HistoryButton(name, data, visible, editing);
  }

  activate(model){
    let self = this;
    self.demographics = model;

    self.saveHx = true;//AUTO-SAVE whenever history is reviewed

    if(self.home.currentBoard != null &&
      self.home.currentBoard.patientId != null) {
      // self.date = self.home.currentBoard.date;
      self.date = self.home.currentBoard.visitInfo.date;
    }else{
      self.date = moment().format("MM-DD-YYYY");
    }



    //for females...
    let patient = self.demographics.patient;
    self.isFemale = patient.Sex == 'F' ? true : false;

    self.data.getListWithProviderId('Other Diseases', 0, function(res){
      self.otherDiseaseList = new PicklistItem({'ColumnFriendlyName':'OtherDiseaseHx'}, res, null);
    });

    self.data.getList('Ortho Surgery', function(res){
      let unique = _.uniqBy(res, function (s) {
        return s.Description1;
      });
      //self.otherOrthoList = unique;
      self.otherOrthoList = new PicklistItem({'ColumnFriendlyName':'OtherOrtSurg'}, unique, null);
    });

    self.setupReportingColumnInfo(function(hx){
      self.loadPatientHistory(self.demographics.patient.data.PatientID, hx);
    });

    self.event.subscribe('savePatientHistory', function(){
      self.saveHistory();
      self.demographics.home.demographicsVisible = false;
      self.demographics.home.demographicsNeedsSave = false;
    });
  }

  attached() {
    this.windowHeight = window.innerHeight - 74; //minus tab height and padding
    //this.windowHeight = $('#demotop').height();

    //this.checkWorkflowHistory();
  }

  detached(){
    this.saveHistory();
    //this.hasSaved = false;
  }

  loadPatientHistory(patientId, hxObject){
    let self = this;

    self.data.getPatientHistoryWithPatientIdAndDate(patientId, self.date, function(res){//getPatientHistory...

      if(res.PatientHistory == null &&
        res.SocialHistory==null &&
        res.FamilyHistory == null &&
        res.ReviewOfSystems == null){
        self.data.getNewPatientHistory(function(newHx){

          // self.toggleEdit();


          //get basic properties...
          let userId = self.helper._user.UserID;
          let patId = self.demographics.patient.data.PatientID;
          // let proId = self.home.currentProvider.ProviderID;
          let proId = 0;
          if(self.home.currentBoard.visitInfo != null){
            proId = self.home.currentBoard.visitInfo.providerId;
          }else if(self.home.currentProvider != null){
            proId = self.home.currentProvider.ProviderID;
          }

          let vDate = self.date;

          //patientHx
          newHx.PatientHistory.UserID = userId;
          newHx.PatientHistory.PatientID = patId;
          newHx.PatientHistory.ExamDateTime=vDate;
          newHx.PatientHistory.ProviderID = proId;
          //familyHx
          newHx.FamilyHistory.UserID = userId;
          newHx.FamilyHistory.PatientID = patId;
          newHx.FamilyHistory.ExamDateTime=vDate;
          newHx.FamilyHistory.ProviderID = proId;
          //SocHx
          newHx.SocialHistory.UserID = userId;
          newHx.SocialHistory.PatientID = patId;
          newHx.SocialHistory.ExamDateTime=vDate;
          newHx.SocialHistory.ProviderID = proId;
          //ROS
          newHx.ReviewOfSystems.UserID = userId;
          newHx.ReviewOfSystems.PatientID = patId;
          newHx.ReviewOfSystems.ExamDateTime=vDate;
          newHx.ReviewOfSystems.ProviderID = proId;


          self.populateHistoryObject(newHx, hxObject);

          self.toggleEdit();

        });
      }else{
        self.populateHistoryObject(res, hxObject);
      }
    });

    let vitalUrl = `vitalsigns/patients/${patientId}/all`;
    self.data.getWithUrl(vitalUrl, function(res){
      self.vitalData = res;
    });
  }


  populateHistoryObject(PatientHistoryResults, hxObject){

    let self = this;

    let res = PatientHistoryResults;

    self.saveObject = res;

    //patient history...
    let pxArray = Object.entries(res.PatientHistory);
    let hxs = _.filter(pxArray, function (d) {
      return d[0].toUpperCase().startsWith('DX') && d[1]==true
    });
    let sgs = _.filter(pxArray, function (d) {
      return d[0].toUpperCase().startsWith('SG') && d[1]==true
    });

    for(let i = 0; i < hxs.length; i++){
      let found = _.find(hxObject.pathx.hx, function(h){return h.data.ColumnName == hxs[i][0]});
      found.visible = true;
      found.selected = true;
    }
    for(let i = 0; i < sgs.length; i++){
      let found = _.find(hxObject.pathx.surgs, function(h){return h.data.ColumnName == sgs[i][0]});
      found.visible = true;
      found.selected = true;
    }

    self.history.pathx.noMedHistory.visible = res.PatientHistory.No_Signif_Med_Hx;
    self.history.pathx.noSurgHistory.visible = res.PatientHistory.No_Signif_Surg_Hx;

    //parse other disease, other surgs...
    self.history.pathx.otherDiseaseHx=[];
    self.history.pathx.otherOrthoSurg=[];

    if(res.PatientHistory.OtherOrtSurg != null && res.PatientHistory.OtherOrtSurg.length > 0){
      let otherOrthoSplit = res.PatientHistory.OtherOrtSurg.trim();
      self.history.pathx.otherOrthoSurg = otherOrthoSplit.split(',');
    }

    if(res.PatientHistory.OtherDiseaseHx != null && res.PatientHistory.OtherDiseaseHx.length > 0){
      let otherDiseaseSplit = res.PatientHistory.OtherDiseaseHx.trim();
      self.history.pathx.otherDiseaseHx = otherDiseaseSplit.split(',');
    }


    //patient family history...
    let famhxArray = Object.entries(res.FamilyHistory);
    let filteredFammHx = _.filter(famhxArray, function (f) {
      return f[0].toUpperCase().startsWith('FDX') && f[1] != null
    });
    let father = _.filter(filteredFammHx, function (f) {
      return f[0].toUpperCase().includes('FATHER') && f[1]==true
    });
    let mother = _.filter(filteredFammHx, function (f) {
      return f[0].toUpperCase().includes('MOTHER')&& f[1]==true
    });
    let sibling = _.filter(filteredFammHx, function (f) {
      return f[0].toUpperCase().includes('SIBLING')&& f[1]==true
    });

    for(let i = 0; i < father.length; i++){
      if(father[i][1]==null)continue;
      let found = _.find(hxObject.famhx.fatherHx, function(h){return h.data.ColumnName == father[i][0]});
      found.visible = true;
      found.selected = true;
    }
    for(let i = 0; i < mother.length; i++){
      if(mother[i][1]==null)continue;
      let found = _.find(hxObject.famhx.motherHx, function(h){return h.data.ColumnName == mother[i][0]});
      found.visible = true;
      found.selected = true;
    }
    for(let i = 0; i < sibling.length; i++){
      if(sibling[i][1]==null)continue;
      let found = _.find(hxObject.famhx.siblingHx, function(h){return h.data.ColumnName == sibling[i][0]});
      found.visible = true;
      found.selected = true;
    }


    self.history.famhx.fatherNoHx.visible=res.FamilyHistory.FatherNoSigHist;
    self.history.famhx.motherNoHx.visible=res.FamilyHistory.MotherNoSigHist;
    self.history.famhx.siblingNoHx.visible=res.FamilyHistory.SiblingNoSigHist;


    //parse other...
    self.history.famhx.fatherHx.other=[];
    self.history.famhx.motherHx.other=[];
    self.history.famhx.siblingHx.other=[];

    //DiseaseSumFather, DiseaseSumMother, DiseaseSumSiblingF

    if(res.FamilyHistory.DiseaseSumFather != null && res.FamilyHistory.DiseaseSumFather.length > 0){
      let disFatherSplit = res.FamilyHistory.DiseaseSumFather.trim();
      self.history.famhx.fatherHx.other = disFatherSplit.split(',');
    }
    if(res.FamilyHistory.DiseaseSumMother != null && res.FamilyHistory.DiseaseSumMother.length > 0){
      let disMotherSplit = res.FamilyHistory.DiseaseSumMother.trim();
      self.history.famhx.motherHx.other = disMotherSplit.split(',');
    }
    if(res.FamilyHistory.DiseaseSumSiblingF != null && res.FamilyHistory.DiseaseSumSiblingF.length > 0){
      let disSiblingSplit = res.FamilyHistory.DiseaseSumSiblingF.trim();
      self.history.famhx.siblingHx.other = disSiblingSplit.split(',');
    }


    //set socialHx checkbox values...
    self.history.sochx.hand_dom_L.selected = res.SocialHistory.hand_dom_L != null ? res.SocialHistory.hand_dom_L : false;
    self.history.sochx.hand_dom_L.visible = self.history.sochx.hand_dom_L.selected;
    self.history.sochx.hand_dom_R.selected = res.SocialHistory.hand_dom_R != null ? res.SocialHistory.hand_dom_R : false;
    self.history.sochx.hand_dom_R.visible = self.history.sochx.hand_dom_R.selected;
    self.history.sochx.All_Sub_Neg.selected = res.SocialHistory.All_Sub_Neg != null ? res.SocialHistory.All_Sub_Neg : false;
    self.history.sochx.All_Sub_Neg.visible = self.history.sochx.All_Sub_Neg.selected;
    if(self.isFemale){
      self.history.sochx.pregnant.selected = res.SocialHistory.pregnant != null ? res.SocialHistory.pregnant : false;
      self.history.sochx.pregnant.visible = res.SocialHistory.pregnant;
    }else{
      self.history.sochx.pregnant.visible = false;
    }




    self.socHxData = res.SocialHistory;



    ///ROS...
    let rosArray = Object.entries(res.ReviewOfSystems);
    for(let r = 0; r < rosArray.length; r++){
      let rosColumnItem = rosArray[r]
      for(let i = 0; i < hxObject.ros.length; i++){
        let rosCategory = hxObject.ros[i];
        for(let c = 0; c < rosCategory.data.length; c++){
          let found = _.find(rosCategory.data, function(b){return rosColumnItem[0] == b.data.ColumnName && rosColumnItem[1]==true});
          if(found){
            found.visible = true;
            found.selected = true;
            if(found.name.toUpperCase()=='NEGATIVE'){
              //hide body...
              //rosCategory.displayBody = false;
            }
          }
        }
      }
    }
  }

  buildHxDetailsString(detailsStr, item){
    if(detailsStr == null){
      detailsStr = "Patient reports history of ";
    }
    return detailsStr += item.name.toLowerCase() + ", ";
  }

  buildFamilyHxDetailsString(detailsStr, familyMember, item){
    if(detailsStr == null){
      detailsStr = `${familyMember} reports history of `;
    }
    return detailsStr += item.name.toLowerCase() + ", ";
  }

  completeHxDetailsString(detailsStr){
    //patient reports history of something, something, something,
    var index = detailsStr.lastIndexOf(", ");
    var strMinusLastComma = detailsStr.slice(0, index);
    index = strMinusLastComma.lastIndexOf(", ");
    var finalStr = strMinusLastComma.slice(0, index)
    var indexCommaSpace = index + 2;
    var finalItem = strMinusLastComma.slice(indexCommaSpace, strMinusLastComma.length)

    return finalStr + " and " + finalItem + ".";
  }

  saveHistory(){
    let self = this;
    if(self.saveHx == true && !self.hasSaved){

      console.log("PAT HX SAVED");

      let so = self.saveObject;
      self.hasSaved = true;

      //PATIENT HX...
      let hxNoteDetails=null;
      let surgNoteDetails=null;
      let fatherHxDetails=null;
      let motherHxDetails=null;
      let siblingHxDetails=null;
      let socHxDetails=null;

      //hx...
      for(let i = 0; i < self.history.pathx.hx.length; i++){
        let hxCol = self.history.pathx.hx[i];
        self.saveObject.PatientHistory[hxCol.data.ColumnName]=hxCol.selected;
        if(hxCol.selected){
          //add to note detail...
          hxNoteDetails = self.buildHxDetailsString(hxNoteDetails, hxCol);
        }
      }
      if(hxNoteDetails != null){
        //complete note detail...
        hxNoteDetails = self.completeHxDetailsString(hxNoteDetails);
        self.saveObject.PatientHistory.hX_NoteTextBox = hxNoteDetails;
      }
      //surgeries...
      for(let i = 0; i < self.history.pathx.surgs.length; i++){
        let surgCol = self.history.pathx.surgs[i];
        self.saveObject.PatientHistory[surgCol.data.ColumnName]=surgCol.selected;
        if(surgCol.selected){
          surgNoteDetails = self.buildHxDetailsString(surgNoteDetails, surgCol);
        }
      }
      if(surgNoteDetails != null){
        //surgNoteDetails = self.addCommaAndToConcatString(surgNoteDetails);
        surgNoteDetails += self.history.pathx.otherOrthoSurg.toString();
        surgNoteDetails = self.addCommaAndToConcatString(surgNoteDetails);
        self.saveObject.PatientHistory.surg_Hist_NoteTextBox = surgNoteDetails + ".";
        //concat sug_hist & otherOrtSurg...
      }
      //no history...
      self.saveObject.PatientHistory.No_Signif_Med_Hx = self.history.pathx.noMedHistory.selected;
      self.saveObject.PatientHistory.No_Signif_Surg_Hx =self.history.pathx.noSurgHistory.selected;
      //other...
      self.saveObject.PatientHistory.OtherOrtSurg = self.history.pathx.otherOrthoSurg.toString();
      self.saveObject.PatientHistory.OtherDiseaseHx = self.history.pathx.otherDiseaseHx.toString();



      //concat otherdisease and hx_notetextbox....
      var lastPeriodIndex = self.saveObject.PatientHistory.hX_NoteTextBox.lastIndexOf(".");
      if(lastPeriodIndex == self.saveObject.PatientHistory.hX_NoteTextBox.length - 1){
        self.saveObject.PatientHistory.hX_NoteTextBox = self.saveObject.PatientHistory.hX_NoteTextBox.substring(0, self.saveObject.PatientHistory.hX_NoteTextBox.length - 1);
      }
      self.saveObject.PatientHistory.hX_NoteTextBox += ", " + self.saveObject.PatientHistory.OtherDiseaseHx.toLowerCase();
      self.saveObject.PatientHistory.hX_NoteTextBox = self.addCommaAndToConcatString(self.saveObject.PatientHistory.hX_NoteTextBox) + ".";

      //FAMILY HISTORY...
      for(let i = 0; i < self.history.famhx.fatherHx.length; i++){
        let hxCol = self.history.famhx.fatherHx[i];
        self.saveObject.FamilyHistory[hxCol.data.ColumnName]=hxCol.selected;
        if(hxCol.selected){
          fatherHxDetails = self.buildFamilyHxDetailsString(fatherHxDetails, "Father", hxCol);
        }
      }
      for(let i = 0; i < self.history.famhx.motherHx.length; i++){
        let hxCol = self.history.famhx.motherHx[i];
        self.saveObject.FamilyHistory[hxCol.data.ColumnName]=hxCol.selected;
        if(hxCol.selected){
          motherHxDetails = self.buildFamilyHxDetailsString(motherHxDetails, "Mother", hxCol);
        }
      }
      for(let i = 0; i < self.history.famhx.siblingHx.length; i++){
        let hxCol = self.history.famhx.siblingHx[i];
        self.saveObject.FamilyHistory[hxCol.data.ColumnName]=hxCol.selected;
        if(hxCol.selected){
          siblingHxDetails = self.buildFamilyHxDetailsString(siblingHxDetails, "Sibling", hxCol);
        }
      }
      if(fatherHxDetails != null){
        //complete note detail...
        fatherHxDetails = self.completeHxDetailsString(fatherHxDetails);
        self.saveObject.FamilyHistory.FatherHistTxt = fatherHxDetails;
      }
      if(motherHxDetails != null){
        //complete note detail...
        motherHxDetails = self.completeHxDetailsString(motherHxDetails);
        self.saveObject.FamilyHistory.MotherHistTxt = motherHxDetails;
      }
      if(siblingHxDetails != null){
        //complete note detail...
        siblingHxDetails = self.completeHxDetailsString(siblingHxDetails);
        self.saveObject.FamilyHistory.SiblingHistTxt = siblingHxDetails;
      }
      self.saveObject.FamilyHistory.FatherNoSigHist = self.history.famhx.fatherNoHx.selected;
      self.saveObject.FamilyHistory.MotherNoSigHist = self.history.famhx.motherNoHx.selected;
      self.saveObject.FamilyHistory.SiblingNoSigHist = self.history.famhx.siblingNoHx.selected;

      //other...
      if(self.updateFatherOther || (self.history.famhx.fatherHx.other && self.history.famhx.fatherHx.other.length > 0)){
        self.saveObject.FamilyHistory.DiseaseSumFather = self.history.famhx.fatherHx.other.toString();
      }
      if(self.updateMotherOther || (self.history.famhx.motherHx.other && self.history.famhx.motherHx.other.length > 0)){
        self.saveObject.FamilyHistory.DiseaseSumMother = self.history.famhx.motherHx.other.toString();
      }
      if(self.updateSiblingOther || (self.history.famhx.siblingHx.other && self.history.famhx.siblingHx.other.length > 0)){
        self.saveObject.FamilyHistory.DiseaseSumSiblingF = self.history.famhx.siblingHx.other.toString();
      }

      //ROS...
      var rosResultsForConcatenation=[];
      for(let i = 0; i < self.history.ros.length; i++){
        let item = self.history.ros[i];
        for(let r = 0; r < item.data.length; r++){
          let d = item.data[r];
          self.saveObject.ReviewOfSystems[d.data.ColumnName]=d.selected;
          if(d.selected){
            //add to concat array...
            var toConcat ={
              "name": d.name.toLowerCase(),
              "system": item.category
            }
            rosResultsForConcatenation.push(toConcat);
          }
        }
        //self.saveObject.FamilyHistory[hxCol.data.ColumnName]=hxCol.selected;
      }

      //concat ROS...
      var rosConcatObj = self.concatenateRosSystems(rosResultsForConcatenation);
      self.saveObject.ReviewOfSystems.ROSConstText = rosConcatObj.const;
      self.saveObject.ReviewOfSystems.ROSEyesText = rosConcatObj.eyes;
      self.saveObject.ReviewOfSystems.ROSENMTText = rosConcatObj.enmt;
      self.saveObject.ReviewOfSystems.ROSCardioText = rosConcatObj.cardio;
      self.saveObject.ReviewOfSystems.ROSResText = rosConcatObj.resp;
      self.saveObject.ReviewOfSystems.ROSGasText = rosConcatObj.gastro;
      self.saveObject.ReviewOfSystems.ROSGenText = rosConcatObj.genito;
      self.saveObject.ReviewOfSystems.ROSMuscText = rosConcatObj.musc;
      self.saveObject.ReviewOfSystems.ROSNeuroText = rosConcatObj.neuro;
      self.saveObject.ReviewOfSystems.ROSPsychText = rosConcatObj.psych;
      self.saveObject.ReviewOfSystems.ROSEndoText = rosConcatObj.endo;
      self.saveObject.ReviewOfSystems.ROSHemaText = rosConcatObj.hemato;
      self.saveObject.ReviewOfSystems.ROSImmuText = rosConcatObj.immune;
      self.saveObject.ReviewOfSystems.ROSSkinText = rosConcatObj.skin;

      //SOCIAL HISTORY...
      let socHxArray = Object.entries(self.history.sochx);
      for(let i = 0; i < socHxArray.length; i++){
        let item = socHxArray[i];
        let key = item[0];
        let data = item[1].data;
        let obj = item[1];
        if(obj.hasOwnProperty('selected')){
          //historyButton...
          self.saveObject.SocialHistory[key]=obj.selected;
        }else{
          //PicklistItem...
          if(obj.selectedOption != null){
            self.saveObject.SocialHistory[key]=obj.selectedOption;
          }
          // self.saveObject.SocialHistory[key]=obj.selectedOption;
        }
      }
      //substances...
      for(let s = 0; s < self.history.sochx.substances.length; s++){
        let sub = self.history.sochx.substances[s];

        if(sub.substanceType == 'Caffeine'){
          self.saveObject.SocialHistory['caffine_Y']=true;
          self.saveObject.SocialHistory['caffine_N']=false;
          self.saveObject.SocialHistory['Caffeine_Type']=sub.selectedValue;
        }else if(sub.substanceType == 'Illicit Drugs'){
          self.saveObject.SocialHistory['drug_Y']=true;
          self.saveObject.SocialHistory['drug_N']=false;
          self.saveObject.SocialHistory['drug_type']=sub.selectedValue;
        }else if(sub.substanceType == 'Tobacco'){
          self.saveObject.SocialHistory['tobacco_Y']=true;
          self.saveObject.SocialHistory['tobacco_N']=false;
          self.saveObject.SocialHistory['tobacco_type']=sub.selectedValue;
        }else if(sub.substanceType == 'Alcohol'){
          self.saveObject.SocialHistory['alcohol_Y']=true;
          self.saveObject.SocialHistory['alcohol_N']=false;
          self.saveObject.SocialHistory['Alcohol_Type']=sub.selectedValue;
        }
        self.populateSubstanceObjectWithFrequency(self.saveObject.SocialHistory, sub.substanceType, sub.selectedUsageOption);
      }

      socHxDetails = self.buildSocHxString(self.saveObject.SocialHistory);
      self.saveObject.SocialHistory.soc_hx = socHxDetails;

      let dialog = self.helper.createNoty("Saving History...", 1000);
      dialog.show();



      //check if we need to create a new history...
      let todayDate = moment(self.date).format('MM/DD/YYYY');
      let socDate = moment(self.saveObject.SocialHistory.ExamDateTime).format('MM/DD/YYYY');
      let pxDate = moment(self.saveObject.PatientHistory.ExamDateTime).format('MM/DD/YYYY');
      let fxDate = moment(self.saveObject.FamilyHistory.ExamDateTime).format('MM/DD/YYYY');
      let rosDate = moment(self.saveObject.ReviewOfSystems.ExamDateTime).format('MM/DD/YYYY');

      // if(self.saveObject.SocialHistory)


      if(todayDate != socDate ||
        todayDate != pxDate ||
        todayDate != fxDate ||
        todayDate != rosDate){
        //update dates and zero ids...
        self.saveObject.SocialHistory.HistoryID = 0;
        self.saveObject.PatientHistory.HistoryID = 0;
        self.saveObject.FamilyHistory.HistoryID = 0;
        self.saveObject.ReviewOfSystems.HistoryID = 0;
        self.saveObject.SocialHistory.ExamDateTime = todayDate;
        self.saveObject.PatientHistory.ExamDateTime = todayDate;
        self.saveObject.FamilyHistory.ExamDateTime = todayDate;
        self.saveObject.ReviewOfSystems.ExamDateTime = todayDate;
      }

      //date reviewed...
      self.saveObject.SocialHistory.Date_Reviewed = todayDate;
      self.saveObject.PatientHistory.Date_review = todayDate;
      self.saveObject.FamilyHistory.PFHX_Reviewed = todayDate;
      self.saveObject.ReviewOfSystems.Date_Reviewed = todayDate;

      self.saveObject.SocialHistory.IsComplete = true;
      self.saveObject.PatientHistory.IsComplete = true;
      self.saveObject.FamilyHistory.IsComplete = true;
      self.saveObject.ReviewOfSystems.IsComplete = true;


      if(self.saveObject.SocialHistory.HistoryID == 0 &&
        self.saveObject.PatientHistory.HistoryID == 0 &&
        self.saveObject.FamilyHistory.HistoryID == 0 &&
        self.saveObject.ReviewOfSystems.HistoryID == 0){
        self.data.createPatientHistory(self.saveObject, function(res){
          dialog.close();
          //update local object ids...
          if(res != false){
            self.saveObject.SocialHistory.HistoryID == res.SocialHistory.HistoryID;
            self.saveObject.PatientHistory.HistoryID == res.PatientHistory.HistoryID;
            self.saveObject.FamilyHistory.HistoryID == res.FamilyHistory.HistoryID;
            self.saveObject.ReviewOfSystems.HistoryID == res.ReviewOfSystems.HistoryID;
          }

          // self.demographics.home.demographicsVisible = false;
          // self.demographics.home.demographicsNeedsSave = false;
          self.hasSaved = false;
        });
      }else{
        self.data.updatePatientHistory(self.saveObject, function(res){
          dialog.close();
          // self.demographics.home.demographicsVisible = false;
          // self.demographics.home.demographicsNeedsSave = false;
          self.hasSaved = false;
        });
      }
    }else{
      //self.demographics.home.demographicsVisible = false;
      self.hasSaved = false;
    }
  }

  concatenateRosSystems(rosConcatResultsArray){
    let self = this;
    //did string change???
    var cardChanged=false;
    var constChanged=false;
    var emntChanged=false;
    var endoChanged=false;
    var eyesChanged=false;
    var gastroChanged=false;
    var genitoChanged=false;
    var hematoChanged=false;
    var immuneChanged=false;
    var muscChanged=false;
    var neuroChanged=false;
    var psychChanged=false;
    var respChanged=false;
    var skinChanged=false;

    let rosImmuneDetails="No skin rashes, or allergies to food or medication";
    let rosConstDetails="No fever, fatigue, weakness or sudden weight change";
    let rosEyesDetails="Normal visual acuity, no blurred vision or excessive tearing";
    let rosEnmtDetails="Normal auditory acuity, no nasal discharge or difficulty swallowing";
    let rosCardioDetails="No chest pains or palpatations or high blood pressure";
    let rosResDetails="No shortness of breath or cough";
    let rosGastroDetails="No abdominal pain, heartburn, hepatitis or bleeding";
    let rosGenitoDetails="No dysuria or hmaturia";
    let rosMusculoDetails="No generalized joint pain, stiffness, weakness or muscle pain";
    let rosNeuroDetails="No headache, dizziness or memory loss";
    let rosPsychDetails="No mood change, depression or nervousness";
    let rosEndoDetails="No thyroid enlargement, sweating or excessive thirst";
    let rosHematDetails="No bruising, swollen glands or anemia";
    let rosSkinDetails="No rashes or jaundice";


    for(var i = 0; i < rosConcatResultsArray.length; i++){
      var ros = rosConcatResultsArray[i];
      //if the selected option is NOT NEGATIVE, update the proper concat string...
      if(ros.name != "negative"){
        switch (ros.system){
          case "Cardiovascular":
            if(!cardChanged){
              rosCardioDetails="";
            }
            rosCardioDetails += ros.name + ", ";
            cardChanged = true;
            break;
          case "Constitutional":
            if(!constChanged){
              rosConstDetails="";
            }
            rosConstDetails += ros.name + ", ";
            constChanged = true;
            break;
          case "EMNT":
            if(!emntChanged){
              rosEnmtDetails="";
            }
            rosEnmtDetails += ros.name + ", ";
            emntChanged = true;
            break;
          case "Endocrine":
            if(!endoChanged){
              rosEndoDetails="";
            }
            rosEndoDetails += ros.name + ", ";
            endoChanged = true;
            break;
          case "Eyes":
            if(!eyesChanged){
              rosEyesDetails="";
            }
            rosEyesDetails += ros.name + ", ";
            eyesChanged = true;
            break;
          case "Gastrointestinal":
            if(!gastroChanged){
              rosGastroDetails="";
            }
            rosGastroDetails += ros.name + ", ";
            gastroChanged = true;
            break;
          case "Genitourinary":
            if(!genitoChanged){
              rosGenitoDetails="";
            }
            rosGenitoDetails += ros.name + ", ";
            genitoChanged = true;
            break;
          case "Hematolymphatic":
            if(!hematoChanged){
              rosHematDetails="";
            }
            rosHematDetails += ros.name + ", ";
            hematoChanged = true;
            break;
          case "Immunologic":
            if(!immuneChanged){
              rosImmuneDetails="";
            }
            rosImmuneDetails += ros.name + ", ";
            immuneChanged = true;
            break;
          case "Musculoskeletal":
            if(!muscChanged){
              rosMusculoDetails="";
            }
            rosMusculoDetails += ros.name + ", ";
            muscChanged = true;
            break;
          case "Neurologic":
            if(!neuroChanged){
              rosNeuroDetails="";
            }
            rosNeuroDetails += ros.name + ", ";
            neuroChanged = true;
            break;
          case "Psychiatric":
            if(!psychChanged){
              rosPsychDetails="";
            }
            rosPsychDetails += ros.name + ", ";
            psychChanged = true;
            break;
          case "Respiratory":
            if(!respChanged){
              rosResDetails="";
            }
            rosResDetails += ros.name + ", ";
            respChanged = true;
            break;
          case "Skin":
            if(!skinChanged){
              rosSkinDetails="";
            }
            rosSkinDetails += ros.name + ", ";
            skinChanged = true;
            break;
        }
      }

    }

    //clean up each concat string....
    var patientReports = "Patient reports history of ";
    if(cardChanged){
      rosCardioDetails = self.addCommaAndToConcatString(rosCardioDetails);
      rosCardioDetails = patientReports + rosCardioDetails + ".";
    }
    if(constChanged){
      rosConstDetails = self.addCommaAndToConcatString(rosConstDetails);
      rosConstDetails = patientReports + rosConstDetails + ".";
    }
    if(emntChanged){
      rosEnmtDetails = self.addCommaAndToConcatString(rosEnmtDetails);
      rosEnmtDetails = patientReports + rosEnmtDetails + ".";
    }
    if(endoChanged){
      rosEndoDetails = self.addCommaAndToConcatString(rosEndoDetails);
      rosEndoDetails = patientReports + rosEndoDetails + ".";
    }
    if(eyesChanged){
      rosEyesDetails = self.addCommaAndToConcatString(rosEyesDetails);
      rosEyesDetails = patientReports + rosEyesDetails + ".";
    }
    if(gastroChanged){
      rosGastroDetails = self.addCommaAndToConcatString(rosGastroDetails);
      rosGastroDetails = patientReports + rosGastroDetails + ".";
    }
    if(genitoChanged){
      rosGenitoDetails = self.addCommaAndToConcatString(rosGenitoDetails);
      rosGenitoDetails = patientReports + rosGenitoDetails + ".";
    }
    if(hematoChanged){
      rosHematDetails = self.addCommaAndToConcatString(rosHematDetails);
      rosHematDetails = patientReports + rosHematDetails + ".";
    }
    if(immuneChanged){
      rosImmuneDetails = self.addCommaAndToConcatString(rosImmuneDetails);
      rosImmuneDetails = patientReports + rosImmuneDetails + ".";
    }
    if(muscChanged){
      rosMusculoDetails = self.addCommaAndToConcatString(rosMusculoDetails);
      rosMusculoDetails = patientReports + rosMusculoDetails + ".";
    }
    if(neuroChanged){
      rosNeuroDetails = self.addCommaAndToConcatString(rosNeuroDetails);
      rosNeuroDetails = patientReports + rosNeuroDetails + ".";
    }
    if(psychChanged){
      rosPsychDetails = self.addCommaAndToConcatString(rosPsychDetails);
      rosPsychDetails = patientReports + rosPsychDetails + ".";
    }
    if(respChanged){
      rosResDetails = self.addCommaAndToConcatString(rosResDetails);
      rosResDetails = patientReports + rosResDetails + ".";
    }
    if(skinChanged){
      rosSkinDetails = self.addCommaAndToConcatString(rosSkinDetails);
      rosSkinDetails = patientReports + rosSkinDetails + ".";
    }

    return {
      skin: rosSkinDetails,
      resp: rosResDetails,
      psych: rosPsychDetails,
      neuro: rosNeuroDetails,
      musc: rosMusculoDetails,
      immune: rosImmuneDetails,
      hemato: rosHematDetails,
      genito: rosGenitoDetails,
      gastro: rosGastroDetails,
      eyes: rosEyesDetails,
      endo: rosEndoDetails,
      enmt: rosEnmtDetails,
      const: rosConstDetails,
      cardio: rosCardioDetails
    }

  }

  addCommaAndToConcatString(concatString){
    concatString = concatString.trimEnd();
    var split = concatString.split(",");
    var split = _.filter(split, function(s){return s.length > 0});

    if (split.length > -1){
      var uses="";
      for(var i = 0; i < split.length; i++){

        if(split[i].length == 0){
          continue;
        }
        var insert = i + 1 == split.length - 1 ? " and " : ", ";
        if(split.length == 1){
          uses += split[i].trim();
        }else{
          uses += split[i].trim() + insert;
        }
      }
      concatString = uses.trim();
      if(split.length > 1){
        concatString = concatString.substring(0, concatString.length - 1);
      }
    }
    return concatString;
  }

  buildSocHxString(tSOC){
    var socialhistory = "";

      if (tSOC != null)
      {
          if (tSOC.hand_dom_R)
          {
              socialhistory += " Patient is right handed.";
          }
          if (tSOC.hand_dom_L)
          {
              socialhistory += " Patient is left handed.";
          }
          if(tSOC.Appearance != null){
            socialhistory += " " + tSOC.Appearance + " ";
          }


          if (tSOC.education != null
                && tSOC.education.length > 0)
          {
              socialhistory += " Patient educational level is " + tSOC.education + ".";
          }

          if (tSOC.exercise_freq != null && tSOC.exercise_val != null)
          {
              socialhistory += " Patient exercises by " + tSOC.exercise_val.toLowerCase();
              socialhistory += " " + tSOC.exercise_freq.toLowerCase() + ".";
          }

          if (tSOC.retired)
          {
              socialhistory += " Patient is retired.";
          }


          var patientUses = "";

          var patientDenies = ""; //Pertinent negatives


          if (tSOC.alcohol_Y)
          {
              if (tSOC.Alcohol_Type != null && tSOC.Alcohol_Type.length > 2)
                  patientUses += tSOC.Alcohol_Type + "," + " ";

              else if (tSOC.Alcohol_Type != null && tSOC.Alcohol_Type.length < 2)
              {
                  patientUses += "alcohol, ";
              }
          }

          if (tSOC.alcohol_N)
          {
              patientDenies += "alcohol, ";
          }

          if (tSOC.caffine_Y)
          {
              if (tSOC.Caffeine_Type != null && tSOC.Caffeine_Type.length > 2)
                  patientUses += tSOC.Caffeine_Type + ", ";
              else if (tSOC.Caffeine_Type != null && tSOC.Caffeine_Type.length < 2)
              {
                  patientUses += "caffeine, ";
              }
          }

          if (tSOC.caffine_N)
          {
              patientDenies += "caffeine, ";
          }

          if (tSOC.drug_Y)
          {
              if (tSOC.drug_type != null && tSOC.drug_type.length > 2)
                  patientUses += tSOC.drug_type + ", ";
              else if (tSOC.drug_type != null && tSOC.drug_type.length < 2)
              {
                  patientUses += "illicit drugs, ";
              }
          }
          if (tSOC.drug_N)
          {
              patientDenies += "illicit drugs, ";
          }

          if (tSOC.tobacco_Y)
          {
              if (tSOC.tobacco_type != null && tSOC.tobacco_type.length > 2)
                  patientUses += tSOC.tobacco_type + ", ";
              else if (tSOC.tobacco_type != null && tSOC.tobacco_type.length < 2)
              {
                  patientUses += "tobacco, ";
              }
          }
          if (tSOC.tobacco_Form)
          {
              patientUses += "former tobacco use, ";
          }

          if (tSOC.tobacco_N)
          {
              //patientDenies += tSOC.tobacco_type != string.Empty ? tSOC.tobacco_type : "tobacco, ";
              patientDenies += "tobacco, ";
          }




          if (patientUses != null && patientUses != "")
          {
              patientUses = this.addCommaAndToConcatString(patientUses);
              // patientUses = patientUses.toLowerCase();
              // patientUses = patientUses.trimEnd();
              // var split = patientUses.split(",");
              // var split = _.filter(split, function(s){return s.length > 0});

              // //var lastComma = patientUses.lastIndexOf(','); //You have to reindex for each insert/remove
              // if (split.length > -1//lastComma > -1
              //     && ((tSOC.alcohol_N) ||
              //     (tSOC.alcohol_Y)) ||
              //     ((tSOC.tobacco_N) ||
              //     (tSOC.tobacco_Y)) ||
              //     ((tSOC.caffine_N) ||
              //     (tSOC.caffine_Y)))
              // {
              //   var uses="";
              //   for(var i = 0; i < split.length; i++){

              //     if(split[i].length == 0){
              //       continue;
              //     }
              //     var insert = i + 1 == split.length - 1 ? " and " : ", ";
              //     if(split.length == 1){
              //       uses += split[i].trim();
              //     }else{
              //       uses += split[i].trim() + insert;
              //     }
              //   }
              //   patientUses = uses.trim();
              //   if(split.length > 1){
              //     patientUses = patientUses.substring(0, patientUses.length - 1);
              //   }
              //     //check for ONLY former tobbacco use...
              //     if (tSOC.tobacco_Form &&
              //         !tSOC.alcohol_Y &&
              //           !tSOC.caffine_Y &&
              //           !tSOC.drug_Y)
              //     {
              //         socialhistory += " Patient reports ";
              //     }
              //     else
              //     {
              //         socialhistory += " Patient reports the use of ";
              //     }
              // }
              // else
              // {
              //     patientUses = patientUses.toLocaleLowerCase();
              //     patientUses = patientUses.substring(0, patientUses.length - 1);// patientUses.TrimEnd(new char[] { ',' });
              //     var PlastComma = patientUses.lastIndexOf(',');
              //     if (PlastComma > -1)
              //         patientUses = patientUses.substring(0, PlastComma);//patientUses.Remove(PlastComma, 1);
              //     patientUses = patientUses.trim();

              //     socialhistory += " Patient reports the use of ";
              // }

              socialhistory += patientUses + ".";
          }
          if (patientDenies.length > 0)
          {
              patientDenies = patientDenies.trim();
              //remove last comma...
              patientDenies = patientDenies.substring(0, patientDenies.length - 1);
              var lastComma = patientDenies.lastIndexOf(',');
              if (lastComma > -1)
              {
                //replace final comma w/ OR...
                  //patientDenies = patientDenies.substring(0, lastComma);//patientDenies.Remove(lastComma, 1);
                  patientDenies = this.insertStringIntoUpdateStringAtIndex(patientDenies, " or", lastComma);//patientDenies.Insert(lastComma, " or");
              }
              socialhistory += " Patient does not use " + patientDenies + ".";
          }

      }

      return socialhistory.trim();
  }


  insertStringIntoUpdateStringAtIndex(string, updateString, index){
    return string.slice(0, index) + `${updateString}` + string.slice(index + 1);
  }

  removeFromStringWithStartIndexAndLength(string, index, length){
    return string.slice(0, index) + string.substring(index + length);
  }

  // trimStringFromEndOfString(stringToRemove, stringToRemoveFrom){
  //   // var regex = new RegExp("/" + stringToRemove + "+$/", "g");
  //   var regex = new RegExp("/" + stringToRemove + "$/", "g");
  //   // var s = stringToRemoveFrom.replace(/~+$/, '');
  //   var s = stringToRemoveFrom.replace(regex, '');
  //   return s;
  // }

  checkForTrailingComma(string){
    var comma = string.substring(string.length - 1, string.length);
    if(comma == ','){
      return true;
    }else{
      return false;
    }
  }





  // private string concatSocHx(OD_SocHx tSOC)
  // {
  //     var socialhistory = string.Empty;

  //     if (tSOC != null)
  //     {
  //         if (tSOC.hand_dom_R.HasValue && tSOC.hand_dom_R.Value == true)
  //         {
  //             socialhistory += " Patient is right handed.";
  //         }
  //         if (tSOC.hand_dom_L.HasValue && tSOC.hand_dom_L.Value == true)
  //         {
  //             socialhistory += " Patient is left handed.";
  //         }
  //         socialhistory += " " + tSOC.Appearance + " ";

  //         if (tSOC.education != null
  //              && tSOC.education.Length > 0)
  //         {
  //             socialhistory += " Patient educational level is " + tSOC.education + ".";
  //         }

  //         if (tSOC.exercise_freq != null && tSOC.exercise_freq.Length > 0)
  //         {
  //             socialhistory += " Patient exercises by " + tSOC.exercise_val.ToLower();
  //             socialhistory += " " + tSOC.exercise_freq.ToLower() + ".";
  //         }

  //         if (tSOC.retired.HasValue && tSOC.retired.Value == true)
  //         {
  //             socialhistory += " Patient is retired.";
  //         }


  //         string patientUses = string.Empty;

  //         string patientDenies = string.Empty; //Pertinent negatives


  //         if (tSOC.alcohol_Y.HasValue && tSOC.alcohol_Y.Value == true)
  //         {
  //             if (tSOC.Alcohol_Type != null && tSOC.Alcohol_Type.Length > 2)
  //                 patientUses += tSOC.Alcohol_Type + "," + " ";

  //             else if (tSOC.Alcohol_Type != null && tSOC.Alcohol_Type.Length < 2)
  //             {
  //                 patientUses += "alcohol, ";
  //             }
  //         }

  //         if (tSOC.alcohol_N != null && tSOC.alcohol_N.Value == true)
  //         {
  //             patientDenies += "alcohol, ";
  //         }

  //         if (tSOC.caffine_Y.HasValue && tSOC.caffine_Y.Value == true)
  //         {
  //             if (tSOC.Caffeine_Type != null && tSOC.Caffeine_Type.Length > 2)
  //                 patientUses += tSOC.Caffeine_Type + ", ";
  //             else if (tSOC.Caffeine_Type != null && tSOC.Caffeine_Type.Length < 2)
  //             {
  //                 patientUses += "caffeine, ";
  //             }
  //         }

  //         if (tSOC.caffine_N.HasValue && tSOC.caffine_N.Value == true)
  //         {
  //             patientDenies += "caffeine, ";
  //         }

  //         if (tSOC.drug_Y.HasValue && tSOC.drug_Y.Value == true)
  //         {
  //             if (tSOC.drug_type != null && tSOC.drug_type.Length > 2)
  //                 patientUses += tSOC.drug_type + ", ";
  //             else if (tSOC.drug_type != null && tSOC.drug_type.Length < 2)
  //             {
  //                 patientUses += "illicit drugs, ";
  //             }
  //         }
  //         if (tSOC.drug_N.HasValue && tSOC.drug_N.Value == true)
  //         {
  //             patientDenies += "illicit drugs, ";
  //         }

  //         if (tSOC.tobacco_Y.HasValue && tSOC.tobacco_Y.Value == true)
  //         {
  //             if (tSOC.tobacco_type != null && tSOC.tobacco_type.Length > 2)
  //                 patientUses += tSOC.tobacco_type + ", ";
  //             else if (tSOC.tobacco_type != null && tSOC.tobacco_type.Length < 2)
  //             {
  //                 patientUses += "tobacco, ";
  //             }
  //         }
  //         if (tSOC.tobacco_Form.HasValue && tSOC.tobacco_Form.Value == true)
  //         {
  //             patientUses += "former tobacco use, ";
  //         }

  //         if (tSOC.tobacco_N.HasValue && tSOC.tobacco_N.Value == true)
  //         {
  //             //patientDenies += tSOC.tobacco_type != string.Empty ? tSOC.tobacco_type : "tobacco, ";
  //             patientDenies += "tobacco, ";
  //         }




  //         if (patientUses != null && patientUses != "")
  //         {
  //             patientUses = patientUses.ToLower();
  //             //patientUses = patientUses.Trim();// Changed PMC
  //             patientUses = patientUses.TrimEnd(new char[] { ',' });
  //             int lastComma = patientUses.LastIndexOf(','); //You have to reindex for each insert/remove
  //             if (lastComma > -1
  //                 && ((tSOC.alcohol_N.HasValue && tSOC.alcohol_N.Value == true) ||
  //                 (tSOC.alcohol_Y.HasValue && tSOC.alcohol_Y.Value == true)) ||
  //                 ((tSOC.tobacco_N.HasValue && tSOC.tobacco_N.Value == true) ||
  //                 (tSOC.tobacco_Y.HasValue && tSOC.tobacco_Y.Value == true)) ||
  //                 ((tSOC.caffine_N.HasValue && tSOC.caffine_N.Value == true) ||
  //                 (tSOC.caffine_Y.HasValue && tSOC.caffine_Y.Value == true)))
  //             {
  //                 patientUses = patientUses.Remove(lastComma, 1);
  //                 int NlastComma = patientUses.LastIndexOf(','); //reindex for each insert/remove
  //                 if (NlastComma > -1)
  //                     patientUses = patientUses.Insert(NlastComma, " and");
  //                 int PlastComma = patientUses.LastIndexOf(','); //reindex for each insert/remove
  //                 if (PlastComma > -1)
  //                     patientUses = patientUses.Remove(PlastComma, 1);
  //                 patientUses = patientUses.Trim();

  //                 //check for ONLY former tobbacco use...
  //                 if (tSOC.tobacco_Form.Value == true &&
  //                     tSOC.alcohol_Y.Value == false &&
  //                      tSOC.caffine_Y.Value == false &&
  //                      tSOC.drug_Y.Value == false)
  //                 {
  //                     socialhistory += " Patient reports ";
  //                 }
  //                 else
  //                 {
  //                     socialhistory += " Patient reports the use of ";
  //                 }
  //             }
  //             else
  //             {
  //                 patientUses = patientUses.ToLower();
  //                 patientUses = patientUses.TrimEnd(new char[] { ',' });
  //                 int PlastComma = patientUses.LastIndexOf(',');
  //                 if (PlastComma > -1)
  //                     patientUses = patientUses.Remove(PlastComma, 1);
  //                 patientUses = patientUses.Trim();

  //                 socialhistory += " Patient reports the use of ";
  //             }





  //             socialhistory += patientUses + ".";
  //         }
  //         if (patientDenies.Length > 0)
  //         {
  //             patientDenies = patientDenies.Trim();
  //             patientDenies = patientDenies.TrimEnd(new char[] { ',' });
  //             int lastComma = patientDenies.LastIndexOf(',');
  //             if (lastComma > -1)
  //             {
  //                 patientDenies = patientDenies.Remove(lastComma, 1);
  //                 patientDenies = patientDenies.Insert(lastComma, " or");
  //             }
  //             socialhistory += " Patient does not use " + patientDenies + ".";
  //         }

  //     }

  //     return socialhistory = socialhistory.TrimStart(new[] { ' ' });
  // }















  noMedicalHistoryChecked(checked){
    if(!checked)return;
    for(let i = 0; i < this.history.pathx.hx.length; i++){
      this.history.pathx.hx[i].selected = false;
    }
  }

  noSurgicalHistoryChecked(checked){
    if(!checked)return;
    for(let i = 0; i < this.history.pathx.surgs.length; i++){
      this.history.pathx.surgs[i].selected = false;
    }
  }

  noFatherHistoryChecked(checked){

  }

  noMotherHistoryChecked(checked){

  }

  noSiblingHistoryChecked(checked){

  }

  populateSubstanceObjectWithFrequency(sochx, substanceType, usage){
    if(usage=='Never'){
      if(substanceType=='Caffeine'){
        sochx['caff_never']=true;
        sochx['caff_occ']=false;
        sochx['caff_daily']=false;
      }else if(substanceType == 'Illicit Drugs'){
        sochx['drug_never']=true;
        sochx['drug_occ']=false;
        sochx['drug_daily']=false;
      }else if(substanceType == 'Tobacco'){
        sochx['tob_never']=true;
        sochx['tob_occ']=false;
        sochx['tob_daily']=false;
      }else if(substanceType == 'Alcohol'){
        sochx['alc_never']=true;
        sochx['alc_occ']=false;
        sochx['alc_daily']=false;
      }
    }else if(usage == 'Occasionally'){
      if(substanceType=='Caffeine'){
        sochx['caff_never']=false;
        sochx['caff_occ']=true;
        sochx['caff_daily']=false;
      }else if(substanceType == 'Illicit Drugs'){
        sochx['drug_never']=false;
        sochx['drug_occ']=true;
        sochx['drug_daily']=false;
      }else if(substanceType == 'Tobacco'){
        sochx['tob_never']=false;
        sochx['tob_occ']=true;
        sochx['tob_daily']=false;
      }else if(substanceType == 'Alcohol'){
        sochx['alc_never']=false;
        sochx['alc_occ']=true;
        sochx['alc_daily']=false;
      }
    }else if(usage == 'Daily'){
      if(substanceType=='Caffeine'){
        sochx['caff_never']=false;
        sochx['caff_occ']=false;
        sochx['caff_daily']=true;
      }else if(substanceType == 'Illicit Drugs'){
        sochx['drug_never']=false;
        sochx['drug_occ']=false;
        sochx['drug_daily']=true;
      }else if(substanceType == 'Tobacco'){
        sochx['tob_never']=false;
        sochx['tob_occ']=false;
        sochx['tob_daily']=true;
      }else if(substanceType == 'Alcohol'){
        sochx['alc_never']=false;
        sochx['alc_occ']=false;
        sochx['alc_daily']=true;
      }
    }else if(usage == 'Former'){
      if(substanceType == 'Tobacco'){
        sochx['tobacco_Form']=true;
      }
    }
  }

  toggleEdit(){
    let self = this;
    self.edit = self.edit ? false : true;

    //flag for saving hx...
    if(self.edit==true){
      self.saveHx = true;
      self.demographics.home.demographicsNeedsSave = true;
    }

    //PATIENT HX
      if(!self.edit){
        //show ONLY documented data...
        for(let i = 0; i < this.history.pathx.surgs.length; i++){
          if(this.history.pathx.surgs[i].selected == true){
            this.history.pathx.surgs[i].visible = true;
          }else{
            this.history.pathx.surgs[i].visible = false;
          }
          this.history.pathx.surgs[i].editing = self.edit;
        }
        for(let i = 0; i < this.history.pathx.hx.length; i++){
          if(this.history.pathx.hx[i].selected == true){
            this.history.pathx.hx[i].visible = true;
          }else{
            this.history.pathx.hx[i].visible = false;
          }
          this.history.pathx.hx[i].editing = self.edit;
        }


        //family hx...
        for(let i = 0; i < this.history.famhx.fatherHx.length; i++){
          if(this.history.famhx.fatherHx[i].selected == true){
            this.history.famhx.fatherHx[i].visible = true;
          }else{
            this.history.famhx.fatherHx[i].visible = false;
          }
          this.history.famhx.fatherHx[i].editing = self.edit;
        }
        for(let i = 0; i < this.history.famhx.motherHx.length; i++){
          if(this.history.famhx.motherHx[i].selected == true){
            this.history.famhx.motherHx[i].visible = true;
          }else{
            this.history.famhx.motherHx[i].visible = false;
          }
          this.history.famhx.motherHx[i].editing = self.edit;
        }
        for(let i = 0; i < this.history.famhx.siblingHx.length; i++){
          if(this.history.famhx.siblingHx[i].selected == true){
            this.history.famhx.siblingHx[i].visible = true;
          }else{
            this.history.famhx.siblingHx[i].visible = false;
          }
          this.history.famhx.siblingHx[i].editing = self.edit;
        }
      }else{
        //show ALL data...
        for(let i = 0; i < this.history.pathx.surgs.length; i++){
          this.history.pathx.surgs[i].visible = true;
          this.history.pathx.surgs[i].editing = self.edit;
        }
        for(let i = 0; i < this.history.pathx.hx.length; i++){
          this.history.pathx.hx[i].visible = true;
          this.history.pathx.hx[i].editing = self.edit;
        }
        for(let i = 0; i < this.history.famhx.fatherHx.length; i++){
          this.history.famhx.fatherHx[i].visible = true;
          this.history.famhx.fatherHx[i].editing = self.edit;
        }
        for(let i = 0; i < this.history.famhx.motherHx.length; i++){
          this.history.famhx.motherHx[i].visible = true;
          this.history.famhx.motherHx[i].editing = self.edit;
        }
        for(let i = 0; i < this.history.famhx.siblingHx.length; i++){
          this.history.famhx.siblingHx[i].visible = true;
          this.history.famhx.siblingHx[i].editing = self.edit;
        }
      }
    this.history.pathx.noMedHistory.editing=self.edit;
    this.history.pathx.noSurgHistory.editing=self.edit;
    this.history.pathx.noMedHistory.visible= self.edit ? true : this.history.pathx.noMedHistory.selected;
    this.history.pathx.noSurgHistory.visible=self.edit ? true : this.history.pathx.noSurgHistory.selected;

    //no significant hx...
    this.history.famhx.fatherNoHx.editing = self.edit;
    this.history.famhx.motherNoHx.editing = self.edit;
    this.history.famhx.siblingNoHx.editing = self.edit;
    this.history.famhx.fatherNoHx.visible = self.edit ? true : this.history.famhx.fatherNoHx.selected;
    this.history.famhx.motherNoHx.visible = self.edit ? true :this.history.famhx.motherNoHx.selected;
    this.history.famhx.siblingNoHx.visible = self.edit ? true : this.history.famhx.siblingNoHx.selected;


    //SOCIAL???
    let sochxArray = Object.entries(this.history.sochx);
    for(let s = 0; s < sochxArray.length; s++){
      let key = sochxArray[s][0];
      let obj = sochxArray[s][1];
      if(obj.hasOwnProperty('selected')){
        // this.history.sochx[key].visible = !self.edit ? obj.selected ? true : false : true;
        if(!self.edit){
          this.history.sochx[key].visible = obj.selected ? true : false;
        }else{
          this.history.sochx[key].visible = true;
        }
      }else{
        //check string value...
        let hasValue = false;
        if(obj.selectedOption != null && obj.selectedOption.length > 0){
          hasValue = true;
        }
        this.history.sochx[key].visible = !self.edit ? hasValue ? true : false : true;
      }
      this.history.sochx[key].editing = self.edit;
    }


    //ROS
      if (!self.edit) {
        //show ONLY documented data...
        for (let i = 0; i < this.history.ros.length; i++) {
          let rosCategory = this.history.ros[i];
          for(let c = 0; c < rosCategory.data.length; c++){
            if (rosCategory.data[c].selected == true) {
              rosCategory.data[c].visible = true;
            } else {
              rosCategory.data[c].visible = false;
            }
            rosCategory.data[c].editing = self.edit;
          }
        }
      }else{
        for (let i = 0; i < this.history.ros.length; i++) {
          let rosCategory = this.history.ros[i];
          for(let c = 0; c < rosCategory.data.length; c++){
            rosCategory.data[c].visible = true;
            rosCategory.data[c].editing = self.edit;
          }
        }
      }

    //ALLERGIES
    this.history.allergies.noKnownDrugAllergies.editing = self.edit;
    if(!self.edit){
      this.history.allergies.noKnownDrugAllergies.visible = this.history.allergies.noKnownDrugAllergies.selected;
    }else{
      this.history.allergies.noKnownDrugAllergies.visible = true;
    }

    //MEDS
    this.history.meds.noCurrentMeds.editing = self.edit;
    if(!self.edit){
      this.history.meds.noCurrentMeds.visible = this.history.meds.noCurrentMeds.selected;
    }else{
      this.history.meds.noCurrentMeds.visible = true;
    }

    self.event.publish('historyEdit', self.edit);

  }

  toggleFullscreen(){
    this.demographics.toggleFullscreen();
  }

  createSocHxObj(data){

    let self = this;

    let sochx={};

    for(let i = 0; i < data.length; i++){
      let d = data[i];
      if(d.ColumnName == 'All_Sub_Neg' ||
        d.ColumnName == 'hand_dom_R' ||
        d.ColumnName == 'hand_dom_L' ||
        d.ColumnName == 'pregnant'){
        //Buttons...
        sochx[d.ColumnName]=new HistoryButton(d.ColumnFriendlyName, d, true, false);

        if(d.ColumnName == 'All_Sub_Neg'){
          sochx[d.ColumnName].callback = self.allSubNegClick;
          sochx[d.ColumnName].parent = self;
        }

      }else{
        //picklists...
        sochx[d.ColumnName]=new PicklistItem(d);
      }
    }

    sochx.substances=[];

    return sochx;
  }

  rosItemClick(val){
    let self = this;

    if(!val.selected)return;

    let foundItem = null;
    let foundList = [];

    for(var i = 0; i < self.parent.history.ros.length; i++){
      let category = self.parent.history.ros[i].data;
      //search category for val.data.ColumnName...
      foundItem = _.find(category, function(c){return c.data.ColumnName == val.data.ColumnName});
      if(foundItem){
        foundList = category;
        break;
      }
    }

    if(foundList.length > 0){
      //uncheck negative item...
      for(let i = 0; i < foundList.length; i++){
        if(foundList[i].name.toLowerCase().includes('neg')){
          foundList[i].selected = false;
          break;
        }
      }
    }
  }

  rosNegativeClick(val){
    let self = this;

    if(!val.selected)return;

    let foundItem = null;
    let foundList = [];

    for(var i = 0; i < self.parent.history.ros.length; i++){
      let category = self.parent.history.ros[i].data;
      //search category for val.data.ColumnName...
      foundItem = _.find(category, function(c){return c.data.ColumnName == val.data.ColumnName});
      if(foundItem){
        foundList = category;
        break;
      }
    }

    if(foundList.length > 0){
      //uncheck all items in found list...
      for(let i = 0; i < foundList.length; i++){
        if(foundList[i].name != val.name){
          foundList[i].selected = false;
        }
      }
    }
  }

  allSubNegClick(val){
    let self = this;

    if(!val.selected)return;

    self.parent.history.sochx.substances=[];
    self.parent.saveObject.SocialHistory.All_Sub_Neg = 1;

    self.parent.saveObject.SocialHistory.alcohol_N=1;
    self.parent.saveObject.SocialHistory.alcohol_Y=0;
    self.parent.saveObject.SocialHistory.caffine_N=1;
    self.parent.saveObject.SocialHistory.caffine_Y=0;
    self.parent.saveObject.SocialHistory.drug_N=1;
    self.parent.saveObject.SocialHistory.drug_Y=0;
    self.parent.saveObject.SocialHistory.tobacco_Form=0;
    self.parent.saveObject.SocialHistory.tobacco_N=1;
    self.parent.saveObject.SocialHistory.tobacco_Y = 0;

    self.parent.saveObject.SocialHistory.tobacco_type = '';
    self.parent.saveObject.SocialHistory.alcohol_amount='';
    self.parent.saveObject.SocialHistory.caffeine_amount='';
    self.parent.saveObject.SocialHistory.drug_type='';
    self.parent.saveObject.SocialHistory.Alcohol_Type='';
    self.parent.saveObject.SocialHistory.Caffeine_Type='';
    self.parent.saveObject.SocialHistory.Tobacco_Amount='';

    self.parent.saveObject.SocialHistory.alc_never=0;
    self.parent.saveObject.SocialHistory.alc_occ=0;
    self.parent.saveObject.SocialHistory.alc_daily=0;
    self.parent.saveObject.SocialHistory.tob_never=0;
    self.parent.saveObject.SocialHistory.tob_occ=0;
    self.parent.saveObject.SocialHistory.tob_daily=0;
    self.parent.saveObject.SocialHistory.caff_never=0;
    self.parent.saveObject.SocialHistory.caff_occ=0;
    self.parent.saveObject.SocialHistory.caff_daily=0;
    self.parent.saveObject.SocialHistory.drug_never=0;
    self.parent.saveObject.SocialHistory.drug_occ=0;
    self.parent.saveObject.SocialHistory.drug_daily=0;

    self.parent.saveObject.SocialHistory.tob_unknown=0;
    self.parent.saveObject.SocialHistory.tob_light=0;
    self.parent.saveObject.SocialHistory.tob_heavy=0;
  }

  checkWorkflowHistory(){
    let self = this;
    // famhxReviewed = false;
    // phxReviewed = false;
    // soxHxReviewed = false;
    // rosReviewed = false;
    if(self.displayPatHx){
      self.phxReviewed = true;
    }else if(self.displaySocHx){
      self.socHxReviewed = true;
    }else if(self.displayFamHx){
      self.famhxReviewed = true;
    }else if(self.displayRos){
      self.rosReviewed = true;
    }

    if(self.famhxReviewed &&
      self.phxReviewed &&
      self.socHxReviewed &&
      self.rosReviewed){
        //self.updateWorkflowHistory();
        self.saveHx = true;
        self.saveObject.SocialHistory.IsComplete = true;
        self.saveObject.PatientHistory.IsComplete = true;
        self.saveObject.FamilyHistory.IsComplete = true;
        self.saveObject.ReviewOfSystems.IsComplete = true;
        self.saveHistory();
      }
  }

  // updateWorkflowHistory(){

  // }

  toggleTab(tab){
    if(tab == "PATIENTHX"){
      this.displayPatHx=true;
      this.displayFamHx=false;
      this.displaySocHx=false;
      this.displayMeds=false;
      this.displayRos=false;
      this.displayVitals =false;
      //this.checkWorkflowHistory();
    }else if(tab == "SOCIALHX"){
      this.displayPatHx=false;
      this.displayFamHx=false;
      this.displaySocHx=true;
      this.displayMeds=false;
      this.displayRos=false;
      this.displayVitals =false;
      //this.checkWorkflowHistory();
    }else if(tab == "FAMILYHX"){
      this.displayPatHx=false;
      this.displayFamHx=true;
      this.displaySocHx=false;
      this.displayMeds=false;
      this.displayRos=false;
      this.displayVitals =false;
      //this.checkWorkflowHistory();
    }else if(tab == "MEDS"){
      this.displayPatHx=false;
      this.displayFamHx=false;
      this.displaySocHx=false;
      this.displayMeds=true;
      this.displayRos=false;
      this.displayVitals =false;
    }else if(tab == "ROS"){
      this.displayPatHx=false;
      this.displayFamHx=false;
      this.displaySocHx=false;
      this.displayMeds=false;
      this.displayRos=true;
      this.displayVitals =false;
      //this.checkWorkflowHistory();
    }else if(tab == "VITALS"){
      this.displayPatHx=false;
      this.displayFamHx=false;
      this.displaySocHx=false;
      this.displayMeds=false;
      this.displayRos=false;
      this.displayVitals =true;
    }
  }

  setupReportingColumnInfo(callback){
    let self = this;

    self.history.pathx={};
    self.history.famhx={}
    self.history.sochx={};
    self.history.ros = [];
    self.history.vitals={};
    self.history.allergies={};
    self.history.meds={};

    //no known drug allergies...
    self.history.allergies.noKnownDrugAllergies = new HistoryButton("No Known Drug Allergies", true);
    self.history.meds.noCurrentMeds = new HistoryButton("No Current Meds", true);

    self.data.getReportingColumnInfoWithCategory("Patient Hx", function (res) {
      let dx = _.filter(res, function (d) {
        return d.ColumnName.toUpperCase().startsWith('DX')
      });
      let surg = _.filter(res, function (d) {
        return d.ColumnName.toUpperCase().startsWith('SG')
      });
      self.history.pathx.surgs = [];
      self.history.pathx.hx = [];

      //no significant hx...
      let noMedHx = _.find(res, function (d) {
        return d.ColumnName=='No_Signif_Med_Hx'});
      let noSurgHx = _.find(res, function (d) {
        return d.ColumnName=='No_Signif_Surg_Hx'});

      self.history.pathx.noMedHistory=new HistoryButton(noMedHx.ColumnFriendlyName, noMedHx, true);
      self.history.pathx.noSurgHistory=new HistoryButton(noSurgHx.ColumnFriendlyName, noSurgHx, true);

      for (let i = 0; i < dx.length; i++) {
        self.history.pathx.hx.push(new HistoryButton(dx[i].ColumnFriendlyName, dx[i]));
      }
      for (let i = 0; i < surg.length; i++) {
        self.history.pathx.surgs.push(new HistoryButton(surg[i].ColumnFriendlyName, surg[i]));
      }


      //family history
      self.data.getReportingColumnInfoWithCategory("Patient Family Hx", function (res) {
        let filtered = _.filter(res, function (d) {
          return d.ColumnName.toUpperCase().startsWith('FDX')
        });

        let father = _.filter(filtered, function (f) {
          return f.ColumnName.toUpperCase().includes('FATHER')
        });
        let mother = _.filter(filtered, function (f) {
          return f.ColumnName.toUpperCase().includes('MOTHER')
        });
        let sibling = _.filter(filtered, function (f) {
          return f.ColumnName.toUpperCase().includes('SIBLING')
        });

        self.history.famhx.fatherHx = [];
        self.history.famhx.motherHx = [];
        self.history.famhx.siblingHx = [];


        //no significant hx...
        let noFatherHx = _.find(res, function (d) {
          return d.ColumnName=='FatherNoSigHist'});
        self.history.famhx.fatherNoHx=new HistoryButton(noFatherHx.ColumnFriendlyName, noFatherHx, true);

        let noMotherHx = _.find(res, function (d) {
          return d.ColumnName=='MotherNoSigHist'});
        self.history.famhx.motherNoHx=new HistoryButton(noMotherHx.ColumnFriendlyName, noMotherHx, true);

        let noSiblingHx = _.find(res, function (d) {
          return d.ColumnName=='SiblingNoSigHist'});
        self.history.famhx.siblingNoHx=new HistoryButton(noSiblingHx.ColumnFriendlyName, noSiblingHx, true);




        for (let i = 0; i < father.length; i++) {
          self.history.famhx.fatherHx.push(new HistoryButton(father[i].ColumnFriendlyName, father[i]));
        }
        for (let i = 0; i < mother.length; i++) {
          self.history.famhx.motherHx.push(new HistoryButton(mother[i].ColumnFriendlyName, mother[i]));
        }
        for (let i = 0; i < sibling.length; i++) {
          self.history.famhx.siblingHx.push(new HistoryButton(sibling[i].ColumnFriendlyName, sibling[i]));
        }

        //social history...
        self.data.getReportingColumnInfoWithCategory("Soc History", function (res) {
          self.history.sochx=self.createSocHxObj(res);

          //ROS...
          self.data.getReportingColumnInfoWithCategory("Review of Systems", function (res) {

            //self.history.ros = [];
            let prefixes = ['card', 'con', 'emnt', 'endo', 'eyes', 'gast', 'genito', 'hemato', 'immun', 'musc', 'neuro', 'psych', 'resp', 'skin'];

            for(let i = 0; i < prefixes.length; i++){
              let rosObj={};
              rosObj.data=[];
              rosObj.displayBody = true;
              rosObj.category=self.getRosCategoryFromPrefix(prefixes[i]);
              let r = _.filter(res, function (d) {
                if(prefixes[i]=='hemato'){
                  return d.ColumnName.toLowerCase().startsWith(prefixes[i]) || d.ColumnName.toLowerCase().startsWith('hema')
                }else{
                  return d.ColumnName.toLowerCase().startsWith(prefixes[i])
                }
              });

              for (let i = 0; i < r.length; i++) {

                let hBtn = new HistoryButton(r[i].ColumnFriendlyName, r[i]);

                if(r[i].ColumnName.toLowerCase().includes('neg')){
                  hBtn.callback = self.rosNegativeClick;
                  hBtn.parent = self;
                  rosObj.data.splice(0, 0, hBtn);
                }else{
                  hBtn.callback = self.rosItemClick;
                  hBtn.parent = self;
                  rosObj.data.push(hBtn);
                }
              }
              self.history.ros.push(rosObj);
            }


            //vitals
            self.data.getReportingColumnInfoWithCategory("Vital Sign", function (res) {

              for(let v = 0; v < res.length; v++){
                let vi = res[v];
                self.history.vitals[vi.ColumnName]= new InputItem(vi.ColumnFriendlyName, null, vi);
              }

              callback(self.history);
            });
          });
        });
      });
    });
  }

  getRosCategoryFromPrefix(prefix){
    //['card', 'con', 'emnt', 'endo', 'eyes', 'gast', 'genito', 'hemato', 'immun', 'musc', 'neuro', 'psych', 'resp', 'skin'];
    if(prefix=='card'){
      return 'Cardiovascular'
    }
    if(prefix=='con'){
      return 'Constitutional'
    }
    if(prefix=='emnt'){
      return 'EMNT'
    }
    if(prefix=='endo'){
      return 'Endocrine'
    }
    if(prefix=='eyes'){
      return 'Eyes'
    }
    if(prefix=='gast'){
      return 'Gastrointestinal'
    }
    if(prefix=='genito'){
      return 'Genitourinary'
    }
    if(prefix=='hemato'){
      return 'Hematolymphatic'
    }
    if(prefix=='immun'){
      return 'Immunologic'
    }
    if(prefix=='musc'){
      return 'Musculoskeletal'
    }
    if(prefix=='neuro'){
      return 'Neurologic'
    }
    if(prefix=='psych'){
      return 'Psychiatric'
    }
    if(prefix=='resp'){
      return 'Respiratory'
    }
    if(prefix=='skin'){
      return 'Skin'
    }
  }



  otherDiseaseDeleteClick(d){
    let self = this;
    self.saveHx = true;
    self.hasSaved = false;
    self.demographics.home.demographicsNeedsSave = true;
    for(let i = 0; i < self.history.pathx.otherDiseaseHx.length; i++){
      if(d == self.history.pathx.otherDiseaseHx[i]){
        self.history.pathx.otherDiseaseHx.splice(i, 1);
      }
    }
  }

  otherDiseaseAddClick(){
    let self = this;
    if(self.otherDiseaseInput != null){
      let found = _.find(self.history.pathx.otherDiseaseHx, function(o){return o.toUpperCase() == self.otherDiseaseInput.toUpperCase()});
      if(found)return;
      self.history.pathx.otherDiseaseHx.push(self.otherDiseaseInput);
    }else if(self.otherDiseaseList.selectedOption != null){
      let found = _.find(self.history.pathx.otherDiseaseHx, function(o){return o.toUpperCase() == self.otherDiseaseList.selectedOption.Description1.toUpperCase()});
      if(found)return;
      self.history.pathx.otherDiseaseHx.push(self.otherDiseaseList.selectedOption.Description1);
    }
  }

  otherOrthoDeleteClick(d){
    let self = this;
    self.demographics.home.demographicsNeedsSave = true;
    for(let i = 0; i < self.history.pathx.otherOrthoSurg.length; i++){
      if(d == self.history.pathx.otherOrthoSurg[i]){
        self.history.pathx.otherOrthoSurg.splice(i, 1);
      }
    }
  }

  otherOrthoAddClick(){
    let self = this;
    if(self.otherOrthoInput != null){
      let found = _.find(self.history.pathx.otherOrthoSurg, function(o){return o.toUpperCase() == self.otherOrthoInput.toUpperCase()});
      if(found)return;
      self.history.pathx.otherOrthoSurg.push(self.otherOrthoInput);
    }else if(self.otherOrthoList.selectedOption != null){
      let found = _.find(self.history.pathx.otherOrthoSurg, function(o){return o.toUpperCase() == self.otherOrthoList.selectedOption.Description1.toUpperCase()});
      if(found)return;
      self.history.pathx.otherOrthoSurg.push(self.otherOrthoList.selectedOption.Description1);
    }
  }

  familyOtherAddClick(member){
    let self = this;
    if(member == 'father'){
      if(self.otherFatherInput != null){
        let found = _.find(self.history.famhx.fatherHx.other, function(o){return o.toUpperCase() == self.otherFatherInput.toUpperCase()});
        if(found)return;
        self.history.famhx.fatherHx.other.push(self.otherFatherInput);
      }
    }
    if(member == 'mother'){
      if(self.otherMotherInput != null){
        let found = _.find(self.history.famhx.motherHx.other, function(o){return o.toUpperCase() == self.otherMotherInput.toUpperCase()});
        if(found)return;
        self.history.famhx.motherHx.other.push(self.otherMotherInput);
      }
    }
    if(member == 'sibling'){
      if(self.otherSiblingInput != null){
        let found = _.find(self.history.famhx.siblingHx.other, function(o){return o.toUpperCase() == self.otherSiblingInput.toUpperCase()});
        if(found)return;
        self.history.famhx.siblingHx.other.push(self.otherSiblingInput);
      }
    }
  }

  otherFamilyDeleteClick(member, d){
    let self = this;
    self.saveHx = true;
    self.hasSaved = false;
    self.demographics.home.demographicsNeedsSave = true;

    if(member == 'father'){
      for(let i = 0; i < self.history.famhx.fatherHx.other.length; i++){
        if(d == self.history.famhx.fatherHx.other[i]){
          self.history.famhx.fatherHx.other.splice(i, 1);
          self.updateFatherOther = true;
        }
      }
    }
    if(member == 'mother'){
      for(let i = 0; i < self.history.famhx.motherHx.other.length; i++){
        if(d == self.history.famhx.motherHx.other[i]){
          self.history.famhx.motherHx.other.splice(i, 1);
          self.updateMotherOther = true;
        }
      }
    }
    if(member == 'sibling'){
      for(let i = 0; i < self.history.famhx.siblingHx.other.length; i++){
        if(d == self.history.famhx.siblingHx.other[i]){
          self.history.famhx.siblingHx.other.splice(i, 1);
          self.updateSiblingOther = true;
        }
      }
    }
  }


}
