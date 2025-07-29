import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';
import { PopupHelper } from './popupHelper';

class Od_Patient_Px{
  constructor(code, description, patientId, providerId, userId){
    this.CptCode  = code;
    this.CodeDescr = description;
    this.BodyPart=null;
    this.BodySide= null;
    this.SurgID=null;
    this.ProcedureID=null;
    this.Modifier=null;
    this.Type=null;
    this.UserID=userId;
    this.PatientCPTID=null;
    this.ExamDateTime=null;
    this.ProviderID=providerId;
    this.PatientID=patientId;
    this.JCodeUnits=null;
  }
}

class OD_Patient_Dx{
  constructor(code, description, patientId, providerId, userId){
    this.PatientDxCode = code;
    this.PatientDxDescription = description;
    this.PatientID = patientId;
    this.ProviderID = providerId;
    this.UserID = userId;
    this.ExamDateTime=null;
    this.PatientDXID=null;
    this.BodyPart=null;
    this.BodySide = null;
    this.SurgID=null;
    this.Status="A";
    this.FromIcd10First=0;
  }
}

class PxDx{
  constructor(id, code, description, data){
    this.id = id;
    this.code = code;
    this.description = description;
    this.data = data;
    this.modifier;
  }
}

class SurgeryObject{
  constructor(px, dx){
    this.procedure = px;
    this.diagnosis = dx;
    this.bodyside=null;
    this.bodypart=null;
    this.index=null;
  }

  setBodyside(side){
    this.bodyside = side;
  }

  setBodypart(part){
    this.bodypart = part;
  }
}

class SurgeryObject2{
  constructor(){
    this.procedures = [];
    this.diagnosis = [];
    this.bodyside=null;
    this.bodypart=null;
    this.index=null;
  }

  setBodyside(side){
    this.bodyside = side;
  }

  setBodypart(part){
    this.bodypart = part;
  }
}

@inject(helper,http, Data, Home, PopupHelper)
export class SurgerySchedule {

  providerId;
  bodypart;
  bodyside;
  preferences = [];
  @observable selectedPref;
  selectedPrefChanged(newVal, oldVal){
    if(newVal && newVal.hasOwnProperty("Surgery")){
      this.surgeries=[];
      this.addSurgeryDetails(newVal);
    }
  }

  @bindable datepicker;
  @observable surgeryDateTime;
  durationTime;
  durationTimes=['.5 hr', '1 hr', '1.5 hr', '2 hr', '2.5 hr', '3 hr'];

  surgeonMatcher=(a, b)=>  (a != null && b != null) && a.ProviderEntity == b;
  surgeons=[];
  assistantMatcher=(a, b)=>  (a != null && b != null) && a.ProviderEntity == b;
  assistants=[];

  positionList=['Supine', 'Prone', 'Lateral'];
  admissionList=['Inpatient', 'Outpatient', 'Outpatient with Overnight Stay', 'Overnight Procedure']

  anesthesiaMatcher=(a, b)=>  (a != null && b != null) && a.Description1 == b;
  anesthesiaList=[];

  locationMatcher=(a, b)=>  (a != null && b != null) && a.LocationName == b;
  locationsList=[];

  // procedure=null;
  // diagnosis=null;

  surgeries=[];

  modlist=[];

  bodyParts;//=["Cervical", "Thoracic", "Lumbar", "Shoulder", "Elbow", "Wrist", "Hand", "Hip", "Knee", "Ankle", "Foot"];
  bodySides=["Right", "Left", "None"];

  hxDxs=[];

  OD_Surg_Schedule=null;
  

  constructor(helper, http, Data, Home, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.popupHelper = PopupHelper;
  }

  activate(params) {
    var self = this;

    self.bodyParts = self.data.bodyparts;

    self.popupHelper = params.popupHelper;

    self.patientId = params.currentBoard.visitInfo.patientId;
    self.date = params.currentBoard.visitInfo.date;
    self.providerId = params.currentBoard.visitInfo.providerId;
    self.userId = params.currentBoard.userId;

    //bodypart??
    if(params.currentBoard &&
      params.currentBoard.visitInfo){
      self.bodypart = params.currentBoard.visitInfo.bodypart;
      self.bodyside = params.currentBoard.visitInfo.bodyside;
    }

    //setup bodypart list...
    let bodypartList=[];
    for(let i = 0; i < self.bodyParts.length; i++){
      let pItm = self.data.getGenericPicklistItem(self.bodyParts[i]);
      bodypartList.push(pItm);
    }
    self.bodyParts = bodypartList;

    let bodysideList=[];
    for(let i = 0; i < self.bodySides.length; i++){
      let pItm = self.data.getGenericPicklistItem(self.bodySides[i]);
      bodysideList.push(pItm);
    }
    self.bodySides = bodysideList;

    self.getPreferences();

    self.load();

  }

  openBodypartPicker(surgeryObject){
    let self = this;
    self.popupHelper.openGenericPicklistPop("Bodypart", 'Select bodypart...', self.bodyParts, false, function (res) {
      surgeryObject.bodypart = res.item.description;
    });
  }

  openBodysidePicker(surgeryObject){
    let self = this;
    self.popupHelper.openGenericPicklistPop("Bodyside", 'Select bodyside...', self.bodySides, false, function (res) {
      surgeryObject.bodyside = res.item.description;
    });
  }

  loadModifierList(callback){
    let self = this;

      //load from DB...???
      self.data.getListWithListTypeDescription2AndProviderId('Miscellaneous', 'Modifiers', self.providerId, function(res){
        if(res.length > 0){
          for(let i = 0; i < res.length; i++){
            let oItm = self.data.getGenericPicklistItem(res[i].Description1, res[i]);
            oItm.selected = false;
            self.modlist.push(oItm);
          }
          callback();
        }else{
          self.addDefaultPtModifiers(self.board.visitInfo.visitType);
          callback();
        }

      });  
  }

  addDefaultPtModifiers(visitType){
    let self = this;
    if(visitType.toLowerCase() == 'pt visit'){
        let pList = ['GP','GA','GX','GY','KX','CQ','59'];
        for(let i = 0; i < pList.length; i++){
          let pItm = self.data.getGenericPicklistItem(pList[i], null);
          pItm.selected = false;
          //does it exist???
          var exists =_.find(self.modlist, function(m){return m.description == pItm.description});
          if(!exists){
            self.modlist.push(pItm);
          }
        }
      }else if(visitType.toLowerCase() == 'ot visit'){
        let oList = ['GO','CO','KX','GA','59'];
        for(let i = 0; i < oList.length; i++){
          let oItm = self.data.getGenericPicklistItem(oList[i], null);
          oItm.selected = false;
          //does it exist???
          var exists =_.find(self.modlist, function(m){return m.description == oItm.description});
          if(!exists){
            self.modlist.push(oItm);
          }
        }
    }
  }


  selectModifiersWithModiferString(str){
    let self = this;

    if(str == null)return;

    let splitMods = str.split(',');
    //reset each selected item...
    _.forEach(self.modlist, function(m){ m.selected = false;});

    //select each modifier from split array...
    for(let i = 0; i < splitMods.length; i++){
      let found = _.find(self.modlist, function(m){ return m.description == splitMods[i]});
      if(found){
        found.selected = true;
      }
    }
  }

  openModPicker(px){
    let self = this;
    self.selectModifiersWithModiferString(px.modifier);
    self.popupHelper.openGenericMultiTabPickerPopup("Select a modifier", "Modifier", self.modlist, false, function(res){
      let r = res;
      let modStr = "";
      for(let i = 0; i < res.items.length; i++){
        modStr += res.items[i].description + ",";
      }
      if(modStr.length > 0){
        modStr = modStr.substring(0, modStr.length - 1);
      }
      px.modifier = modStr;
      //px.selected = true;

      //self.save()
    });
  }

  newSurgeryRow(){
    let self = this;
    let surgObj = new SurgeryObject2();

    //get surergy index...
    if(self.surgeries.length == 0){
      surgObj.index = 1;
    }else{
      let lastIndex = -1;
      for(var i = 0; i < self.surgeries.length; i++){
        if(self.surgeries[i].index > lastIndex){
          lastIndex = self.surgeries[i].index;
        }
      }
      surgObj.index = lastIndex += 1;
    }

    surgObj.bodypart = self.bodypart;
    surgObj.bodyside = self.bodyside;
    // self.surgeries.push(surgObj);
    self.surgeries.splice(0, 0, surgObj);
  }

  openPxPicker(surgery){
    let self = this;
    self.popupHelper.openProcedureSearchPop('SURGERY', false, function(pxs){
      if(pxs.length > 0){
        for(var i = 0; i < pxs.length; i++){
          var px = new PxDx(0, pxs[i].data.CptKey, pxs[i].data.Description, pxs[i].data);
          surgery.procedures.push(px);
        }
      }
    });
  }

  openDxPicker(surgery){
    let self = this;
    let ops = {
      initialDiagnosis: self.hxDxs
    }
    self.popupHelper.openDxPop(self.bodypart, self.bodyside, ops, function(res){
      if(res.length > 0){
        for(var i = 0; i < res.length; i++){
          var dx = new PxDx(0, res[i].code, res[i].description, res[i].data);
          surgery.diagnosis.push(dx);
        }
      }
    }); 
  }

  getHistoricalDxs(){
    let self = this;
    let url = 'patientdiagnosis?patientId='+ self.patientId + "&status=";
    self.data.getWithUrl(url, function(res){

      //remove duplicates...
      let grp = _.groupBy(res, "PatientDxCode");
      let vals = Object.values(grp);
      let temp = [];
      for(var i = 0; i < vals.length; i++){
        temp.push(vals[i][0]);
      }

      self.hxDxs = _.orderBy(temp, "PatientDxCode");
    });
  }

  openCalendar(){
    this.datepicker.methods.toggle();
  }

  durationTimeClicked(d){
    this.OD_Surg_Schedule.Surg_Duration = d;
  }

  getSurPrefProceduresAndDiagnosisListFromForm(){
    let surgPref={
      Surgery:null,
      ProceduresAndDiagnosis:[]
    }

    //update Surgery property...
    let OD_SurgSched_Pref={
      SurgPrefDesc: this.selectedPref.Surgery.SurgPrefDesc,
      ProcID: this.selectedPref.Surgery.ProcID,
      Surgeon: this.OD_Surg_Schedule.Surgeon,
      Assistant: this.OD_Surg_Schedule.Assistant.ProviderEntity,
      SurgAnesthesia: this.OD_Surg_Schedule.SurgAnesthesia,
      SurgLocation: this.OD_Surg_Schedule.SurgLocation,
      BodyPart: this.OD_Surg_Schedule.BodyPart,
      BodySide: this.OD_Surg_Schedule.BodySide,
      ProviderID: this.OD_Surg_Schedule.ProviderID,
      Comments: this.OD_Surg_Schedule.Comments,
      LO_txt: this.OD_Surg_Schedule.LO_txt,
      Equip_PositionPatient: this.OD_Surg_Schedule.Equip_PositionPatient,
      AuthorizeNumber: this.OD_Surg_Schedule.AuthorizeNumber,
      Admission: this.OD_Surg_Schedule.Admission
    }

    surgPref.Surgery = OD_SurgSched_Pref;

    //add procedures / diagnosis...
    for(let i = 0; i < this.surgeries.length; i++){

      //new PxDxList object...
      let pxDxList={
        Diagnosis:[],
        Procedures:[],
        BodypartSide:null
      }

      let aSurg = this.surgeries[i];

      //create SurgBodyPartSide object...
      pxDxList.BodypartSide = {Bodypart: aSurg.bodypart, Bodyside: aSurg.bodyside};

      //get procedures...
      for(var s = 0; s < aSurg.procedures.length; s++){
        let aPx = aSurg.procedures[s];
        //create OD_Patient_Px...
        let OD_Patient_Px={
          CptCode: aPx.code,
          CodeDescr: aPx.description,
          Modifier: aPx.modifier,
          PatientID: this.patientId,
          Od_Patient_Px_Sno: null
        }
        pxDxList.Procedures.push(OD_Patient_Px);
      }

      //get diagnosis...
      for(var d = 0; d < aSurg.diagnosis.length; d++){
        let aDx = aSurg.diagnosis[d];
        //create OD_Patient_Px...
        let OD_Patient_Dx={
          PatientDxCode: aDx.code,
          PatientDxDescription: aDx.description,
          ExamDateTime: this.date,
          PatientID: this.patientId,
          FromIcd10First: false,
          OD_Patient_Dx_Sno: null
        }
        pxDxList.Diagnosis.push(OD_Patient_Dx);
      }

      //add pxDxList...
      surgPref.ProceduresAndDiagnosis.push(pxDxList);
    }


    return surgPref;
  }

  createPref(){
    let self = this;
    let url = 'schedule/surgery/pref';

    self.popupHelper.openGenericInputPop('Create New Preference', ['Description'],null,false,
      function (res) {

        let pref=self.getSurPrefProceduresAndDiagnosisListFromForm();
        pref.Surgery.SurgPrefDesc = res.inputs[0].value;
        let dialog = self.helper.createNoty("Saving Preference...", 1000);
        dialog.show();

        self.data.postWithUrlAndData(url, JSON.stringify(pref), function(postRes){
          dialog.close();
          self.preferences.push(postRes);
        });
      });
  }

  updatePref(){
    let self = this;
    let url = 'schedule/surgery/pref/update';

    if(!self.selectedPref){
      self.popupHelper.openGenericMessagePop('Please select a preference to update.', 'Save Preference Requirements', ['OK'], true, function(res){

      });
      return;
    }

    let dialog = self.helper.createNoty("Updating Preference...", 1000);
    dialog.show();

    let pref = self.getSurPrefProceduresAndDiagnosisListFromForm();

    self.data.postWithUrlAndData(url, JSON.stringify(pref), function(putRes){

      //update preference here???

      dialog.close();
    });
  }

  getPreferences(){
    let self = this;
    self.data.getWithUrl(`schedule/surgery/pref?providerId=${self.providerId}`, function(res){
      self.preferences = res;
    });
  }

  postNewPx(procedure, bodypart, bodyside, surgId){
    let self = this;
    //create new px...
    let px = new Od_Patient_Px(procedure.code, procedure.description, self.patientId, self.providerId, self.userId);
    px.BodyPart = bodypart;
    px.BodySide = bodyside;
    px.ExamDateTime = self.date;
    px.Type = procedure.data.Type;
    px.Modifier = procedure.modifier;
    px.SurgID= surgId;
    px.ProcedureID = procedure.data.ProcedureID;

    self.data.postWithUrlAndData('patientprocedures', JSON.stringify(px), function(res){
      if(res){
        procedure.id = res.PatientCPTID
      }
    });
  }

  postNewDx(diagnosis, bodypart, bodyside, surgId){
    let self = this;
    //create new dx...
    let dx = new OD_Patient_Dx(diagnosis.code, diagnosis.description, self.patientId, self.providerId, self.userId);
    dx.BodyPart = bodypart;
    dx.BodySide = bodyside;
    dx.SurgID = surgId;
    dx.ExamDateTime = self.getShortTime(self.date);
    
    self.data.postWithUrlAndData('patientdiagnosis', JSON.stringify(dx), function(res){
      if(res){
        diagnosis.id = res.PatientDXID
      }
    });
  }

  deleteProcedure(index, procedures, surgeryIndex){
    let self = this;

    let pxToDelete = procedures[index];

    if(procedures[index] != null && 
      procedures[index].id != 0){
      self.data.deleteWithUrl(`patientprocedures/${pxToDelete.id}`, function(res){
        if(res){
          procedures.splice(index, 1);
        }
      });
    }else{
      procedures.splice(index, 1);
    }

    if(self.surgeries[surgeryIndex].diagnosis== null || self.surgeries[surgeryIndex].diagnosis.length == 0){
      //remove surgery row...
      self.surgeries.splice(surgeryIndex, 1);
    }

  }

  deleteDiagnosis(index, diagnosis, surgeryIndex){
    let self = this;

    let dxToDelete = diagnosis[index];

    if(diagnosis[index] != null && 
      diagnosis[index].id != 0){
      self.data.deleteWithUrl(`patientdiagnosis/${dxToDelete.id}`, function(res){
        if(res){
          diagnosis.splice(index, 1);
        }
      });
    }else{
      diagnosis.splice(index, 1);
    }

    if(self.surgeries[surgeryIndex].procedures== null || self.surgeries[surgeryIndex].procedures.length == 0){
      //remove surgery row...
      self.surgeries.splice(surgeryIndex, 1);
    }

  }

  save(){
    let self = this;


    let saveDescription = `Saving Surgery Schedule...`;
    var saveDialog = self.helper.createNoty(saveDescription, 3000);
    saveDialog.show();

    //check assistant, surgeon for objects...
    if(self.OD_Surg_Schedule.Surgeon){
      self.OD_Surg_Schedule.Surgeon = typeof self.OD_Surg_Schedule.Surgeon === 'object' ? self.OD_Surg_Schedule.Surgeon.ProviderEntity : self.OD_Surg_Schedule.Surgeon;
    }

    if(self.OD_Surg_Schedule.Assistant){
      self.OD_Surg_Schedule.Assistant = typeof self.OD_Surg_Schedule.Assistant === 'object' ? self.OD_Surg_Schedule.Assistant.ProviderEntity : self.OD_Surg_Schedule.Assistant;
    }

    if(self.OD_Surg_Schedule.SurgAnesthesia){
      self.OD_Surg_Schedule.SurgAnesthesia = typeof self.OD_Surg_Schedule.SurgAnesthesia === 'object' ? self.OD_Surg_Schedule.SurgAnesthesia.Description1 : self.OD_Surg_Schedule.SurgAnesthesia;
    }

    if(self.OD_Surg_Schedule.SurgLocation){
      self.OD_Surg_Schedule.SurgLocation = typeof self.OD_Surg_Schedule.SurgLocation === 'object' ? self.OD_Surg_Schedule.SurgLocation.LocationName : self.OD_Surg_Schedule.SurgLocation;
    }

    self.OD_Surg_Schedule.SurgTime = self.surgeryDateTime ? self.getShortTime(self.surgeryDateTime) : null;
    self.OD_Surg_Schedule.SurgDate = self.surgeryDateTime ? self.getShortDate(self.surgeryDateTime) : null;

    self.data.postWithUrlAndData("schedule/surgery/poster", JSON.stringify(self.OD_Surg_Schedule), function(res){
      self.OD_Surg_Schedule.SurgID = res.SurgID;

      //save patient PX / DX...
      for(var i = 0; i < self.surgeries.length; i++){
        var surg = self.surgeries[i];

        //procedures...
        if(surg.procedures && surg.procedures.length > 0){
          for(var p = 0; p < surg.procedures.length; p++){

            var aPx = surg.procedures[p];
            if(aPx.id == 0){
              //create new px...
              self.postNewPx(aPx, surg.bodypart, surg.bodyside, `${res.SurgID}_${surg.index}`);
            }else{
              aPx.data.Modifier = aPx.modifier;//update modifier...
              //surg.procedure.data.Modifier = surg.procedure.modifier;//update modifier...
              self.data.putWithUrlAndData('patientprocedures', aPx.data, function(res){
              });
            }
          }
        }

        //diagnosis...
        if(surg.diagnosis && surg.diagnosis.length > 0){
          for(var d = 0; d < surg.diagnosis.length; d++){
            var aDx = surg.diagnosis[d];

            if(aDx.id == 0){
              //create new dx...
              self.postNewDx(aDx, surg.bodypart, surg.bodyside, `${res.SurgID}_${surg.index}`);
            }else{
              self.data.putWithUrlAndData('patientdiagnosis', aDx.data, function(res){
    
              });
            }
          }
        }
      }

      //saveDialog.close();

    });
  }

  setSurgeryDateTime(date, time){
    if(date == null)return;

    const tDate = new Date(date);
    let tTime = null;

    if(time != null){
      tTime = new Date(date + " "  + time);
    }

    var dt = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate());
    if(tTime){
      dt.setHours(tTime.getHours());
      dt.setMinutes(tTime.getMinutes());
    }

    this.surgeryDateTime = dt;
  }

  getShortTime(date){
    const aDate = new Date(date);
    const shortTime = new Intl.DateTimeFormat("en-US", {
      timeStyle: "short",
    });
    return shortTime.format(aDate);
  }

  getShortDate(date){
    const aDate = new Date(date);
    return new Intl.DateTimeFormat('en-US').format(aDate);
  }

  load(){
    let self = this;

    //get surgeons...
    self.data.getWithUrl('providers', function(res){
      self.surgeons = _.filter(res, function(s){return s.ProviderRole == 'Surgeon'});
      self.assistants = _.filter(res, function(s){return s.ProviderRole.toLowerCase() == 'assistant'});

      //get lists...provider, listType
      self.data.getWithUrl(`listcombo?listType=Anesthesia&providerId=${self.providerId}`, function(res){
        self.anesthesiaList = res;

        //locations...
        self.data.getWithUrl(`locations?type=Surgical`, function(res){
          self.locationsList = res;

          self.loadModifierList(function(){
            self.loadSurgeryDetails();
          });
        });
      });
    });

    self.getHistoricalDxs();

  }



  loadSurgeryDetails(){
    let self = this;
    let aDate = self.helper.parseSimpleDate(self.date, 'MM/DD/YYYY');
    let frmtDate = self.helper.getMMDDYYYYDateWithDate(aDate);

    self.data.getWithUrl(`schedule/surgery/procedures/and/diagnosis/list?patientId=${self.patientId}&providerId=${self.providerId}&date=${frmtDate}`, function(res){

      if(res.Surgery){

        self.surgeries=[];

        self.addSurgeryDetails(res);

      }else{

        self.OD_Surg_Schedule = {};
        //set required values...
        self.OD_Surg_Schedule.PatientID = self.patientId;
        self.OD_Surg_Schedule.ProviderID = self.providerId;
        self.OD_Surg_Schedule.UserID = self.userId;
        self.OD_Surg_Schedule.BodyPart = self.bodypart;
        self.OD_Surg_Schedule.BodySide = self.bodyside;
        self.OD_Surg_Schedule.ScheduledBy = self.helper._user.UserName;
        self.OD_Surg_Schedule.ScheduleDate = aDate;
 
      }

    });
  }


  addSurgeryDetails(res){
    let self = this;
    self.OD_Surg_Schedule = res.Surgery;

    self.OD_Surg_Schedule.ScheduledBy = self.helper._user.UserName;

    self.setSurgeryDateTime(res.Surgery.SurgDate, res.Surgery.SurgTime);

    //set px, dx...
    for(var i = 0; i < res.ProceduresAndDiagnosis.length; i++){
      var pxDx = res.ProceduresAndDiagnosis[i];

      var surgObj = new SurgeryObject2();
      for(var p = 0; p < pxDx.Procedures.length; p++){
        let px = new PxDx(pxDx.Procedures[p].PatientCPTID, pxDx.Procedures[p].CptCode, pxDx.Procedures[p].CodeDescr);
        px.modifier = pxDx.Procedures[p].Modifier;
        px.data = pxDx.Procedures[p];
        surgObj.procedures.push(px);
      }

      for(var d = 0; d < pxDx.Diagnosis.length; d++){
        let dx = new PxDx(pxDx.Diagnosis[d].PatientDXID, pxDx.Diagnosis[d].PatientDxCode, pxDx.Diagnosis[d].PatientDxDescription);
        dx.data = pxDx.Diagnosis[d];
        surgObj.diagnosis.push(dx);
      }

      surgObj.bodyside = pxDx.BodypartSide.Bodyside;
      surgObj.bodypart = pxDx.BodypartSide.Bodypart;

      self.surgeries.push(surgObj);
    }
  }
  
}
