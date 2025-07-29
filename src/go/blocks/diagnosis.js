import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import moment from "moment";
import {Home} from '../home';
import {Data} from '../../data/go/data';
import {DialogService} from 'aurelia-dialog';
import {PopupHelper} from '../popupHelper';
import * as _ from "lodash";
import {EventAggregator} from 'aurelia-event-aggregator';
import { Globals } from '../globals';


@inject(helper,http,Home, Data, DialogService, PopupHelper, EventAggregator, Globals)
export class Diagnosis {

  data=null;
  patientId;
  date;
  providerId;
  userId;
  bodypart;
  bodyside;
  locked = false;
  displayDeleteHeader=false;
  diagnosisCount;

  block=null;

  visitCreated = false
  usePreviousDiagnosis=false
  fromPrevious = false;
  fromPreviousDate=null;
  fromPreviousProviderId=null;
  fromPreviousBodyPart = null;

  constructor(helper, http, Home, Data, DialogService, PopupHelper, EventAggregator, Globals){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
    this.eventAggregator = EventAggregator;
    this.globals = Globals;
  }

  activate(model){

    if(model.hasOwnProperty('fromPrevious')){
      this.fromPrevious = true;
    }
    if(model.hasOwnProperty('fromPreviousProviderId')){
      this.fromPreviousProviderId = model.fromPreviousProviderId;
    }
    if(model.hasOwnProperty('fromPreviousDate')){
      //reduce previous date by one day to search for EXACT date...
      // let date = moment(model.fromPreviousDate)
      // date.subtract(1, 'd');

      var splitDate = model.fromPreviousDate.split('-');
      var year = parseInt(splitDate[2]);
      var day = parseInt(splitDate[1]);
      //zero-based month...
      var month = parseInt(splitDate[0]);
      month = month - 1 < 0 ? 0 : month - 1;
      var prevDateMinusOne = new Date(year, month, day - 1);
      var frmPrevDate = this.helper.getMMDDYYDate(prevDateMinusOne.getFullYear(), 
                                                    prevDateMinusOne.getMonth(), 
                                                    prevDateMinusOne.getDate(), '/');

      this.fromPreviousDate = frmPrevDate;//model.fromPreviousDate;
    }
    if(model.hasOwnProperty('fromPreviousBodyPart')){
      this.fromPreviousBodyPart = model.fromPreviousBodyPart;
    }


    this.block = model;
    this.block.childModel = this;
  }

  addPreferenceWithId(dxId){
    let self = this;
    self.goData.getWithUrl(`diagnosis/vw/${dxId}`, function(res){
      if(res){
        let todayDate = moment(self.date).format('MM/DD/YY');
        //self.addRow(0, res.DxKey, res.Description, todayDate, false, res);

        self.popupHelper.openBodysidePickerPop(function(side){
          
          res.side = side;

          let obj = self.createDxObjectWithVWDiagnosis(res);
          

          self.tryAddWithExistanceCheck(obj);

        });
      }
    });
  }

  addPreferenceWithChildCode(code){
    let self = this;
    self.goData.getWithUrl(`icd10codes?code=${code}`, function(res){
      if(res){

        let partSide = self.goData.lateralitySidePartFromIcd10Code(res);
        //let side = self.goData.lateralityFromIcd10Code(res.Code);
        let side = partSide.side;
        //check for 'unspecified'...
        if(side == 'UNSPECIFIED'){
          self.displayUnspecifiedDxAlert(res, function(alertRes){
            if(alertRes.result == 'YES'){
              //reduce code to first decimal...
              var indexOfDecimal = res.Code.indexOf('.');
              var finalCode = res.Code.substring(0, indexOfDecimal + 2);

              self.displayDxPop(finalCode, true);
            }else{
              //NO!!
              //res.side = side;
              if(partSide.part != null){
                res.part = partSide.part;
              }else{
                var bps = self.getBodypartFromVisit();
                res.part = bps.part;
              }

              let obj = self.createDxObjectWithIcd10Code(res);
              self.tryAddWithExistanceCheck(obj);
            }
          });
        }else{
          res.side = side;
          if(partSide.part != null){
            res.part = partSide.part;
          }else{
            var bps = self.getBodypartFromVisit();
            res.part = bps.part;
          }
          let obj = self.createDxObjectWithIcd10Code(res);
          self.tryAddWithExistanceCheck(obj);
        }

      }
    });
  }

  getBodypartFromVisit(){
     if(this.home.currentBoard.visitInfo.bodyparts.length > 1){
      //picker...
      this.popupHelper.openBodypartPickerPop(self.currentBoard.visitInfo.bodyparts, function (pickerRes){
        return pickerRes.bodyparts[0];
      });
     }else{
      return this.home.currentBoard.visitInfo.bodyparts[0];
     }
  }

  tryAddWithExistanceCheck(dxObj){
    let self = this;
    let todayDate = moment(self.date).format('MM/DD/YY');
    if(!self.doesDiagnosisExist(dxObj.code, todayDate, self.providerId)){
      //add to diagnosis???
      if(self.data.length > 0){
        self.data.splice(0, 0, dxObj);
      }else{
        self.data.push(dxObj);
      }
      self.saveDiagnoses(function(res){
        if(res.length > 0){
          self.updateRowIdWithCodeAndDescription(res[0].PatientDXID, res[0].PatientDxCode, res[0].PatientDxDescription);
        }
      });
    }else{
      self.displayExistingDxAlert(dxObj);
      return;
    }
  }

  attached(){

    var self = this;

    self.displayDeleteHeader = !self.globals.isTouchDevice ? true : false;

    if(self.home.currentBoard != null &&
      self.home.currentBoard.patientId != null){

      self.patientId = self.home.currentBoard.patientId;
      self.date = self.home.currentBoard.visitInfo.date;
      self.providerId= self.home.currentBoard.visitInfo.providerId;
      self.userId = self.home.currentBoard.userId;
      self.bodypart = self.home.currentBoard.visitInfo.bodypart;
      self.bodyside = self.home.currentBoard.visitInfo.bodyside;
      if(self.home.currentBoard.visitInfo.locked != null)
        self.locked = self.home.currentBoard.visitInfo.locked == 0 ? false : true;
      //self.usePreviousDiagnosis = self.home.currentProvider.OD_Users.AutoFUDx == null ? false : self.home.currentProvider.OD_Users.AutoFUDx;

      //is this visit just created???
      var now = moment().format('MM/DD/YY');
      var visitDate = moment(self.home.currentBoard.visitInfo.date).format('MM/DD/YY');
      self.visitCreated = now == visitDate ? true : false;

      this.load();

      //self.eventAggregator.publish("modelAttached", self);

      if(self.block.loadPreferenceCallback){
        self.block.loadPreferenceCallback(self.block);
      }
    }
  }

  displayDxPop(searchString, specifyCode){
    let self = this;

    let options = undefined;
    if(searchString){
      options={
        'searchString': searchString,
        'specifyCode': specifyCode
      }
    }

    self.popupHelper.openDxPop(self.bodypart, self.bodyside, options, function(res){
      for(let i = 0; i < res.length; i++){
        var aDx = self.createDxObject(res[i]);
        self.tryAddWithExistanceCheck(aDx);
      }
    });
  }

  // checkUniqueDiagnosisWithCodeAndDate(code, date){
  //   let self = this;
  //   return _.find(self.data, function(d){return d.code == code && d.date == date});
  // }

  sendDxToDrFirst(dxRows){
    let self = this;
    if(self.home.erxEnabled){

      var final=[];

      //remove VisitDate...
      for(var i = 0; i < dxRows.length; i++){
        delete dxRows[i].data.VisitDate
        final.push(dxRows[i].data)
      }

      var dxData = JSON.stringify(final);
      self.goData.postWithUrlAndData(`drfirst/patient/diagnosis`, dxData, function(res){

      });
    }
  }


  load(){
    let self = this;
    self.data = [];
    // let url = 'patientdiagnosis?patientId='+ self.patientId + '&providerId='+self.providerId+ "&status=A";
    let url = 'patientdiagnosis?patientId='+ self.patientId + "&status=";
    self.http.get(self.helper.getApiUrl(url), function (res) {

      if(res == undefined || res == null)return;

      let todayDate = moment(self.date).format('MM/DD/YY');

      var todaysDxs=[];

      for(let i = 0; i < res.length; i++){
        var m = res[i];

        //don't add future diagnosis to list...
        var futureDx = moment(m.VisitDate).isAfter(self.date);
        if(futureDx){
          continue;
        }

        //check for unique dx w/ current visit date...
        var foundDx = _.find(self.data, function(d){return d.code == m.PatientDxCode});
        if(foundDx){
          //check visit date to display proper dx...
          continue;
        }
        // if(foundDx){//if we already have this dx, continue...
        //   continue;
        // }

        let dxDate = self.helper.getISODateToFormat(m.VisitDate, "MM/DD/YY");
        let isHistorical = todayDate != dxDate ? true : false;
        //disable dx's from other providers...
        if(m.ProviderID != self.providerId){
          isHistorical = true;
        }
        var newRow = self.addRow(m.PatientDXID, m.PatientDxCode, m.PatientDxDescription, dxDate, isHistorical, m);

        //check for old codes and disable plus...
        var isIcd9 = self.isIcd9Code(newRow.code);
        if(isIcd9 == null || isIcd9){
          newRow.displayPlus = false;
        }

        if(!isHistorical){
          //add to todaysDxs...
          todaysDxs.push(newRow);
        }
      }

      //if visit was created today AND we're creating from a previous visit...
      if(self.visitCreated && self.fromPrevious){
        if(self.data.length > 0){
          //find all w/ previous date...
          var previousDxs = _.filter(self.data, function(d){
            return d.data != null && 
              d.data.BodyPart &&
              d.data.BodyPart.toUpperCase() == self.fromPreviousBodyPart.toUpperCase() &&
              d.date == self.fromPreviousDate &&
              d.data.ProviderID == self.fromPreviousProviderId});
          
          //select each previous dx...
          for(let d = 0; d < previousDxs.length; d++){
            //add to todaysDxs...
            todaysDxs.push(previousDxs[d]);
            self.dxChecked(previousDxs[d]);
          }
        }
      }
      
      //disable PLUS on all codes that have already been selected for today...
      for(let i = 0; i < todaysDxs.length; i++){
        self.hidePlusInGridForCode(todaysDxs[i].code);
      }

      self.sendDxToDrFirst(todaysDxs);

    });
  }

  isIcd9Code(code){
    if(code == null)return null;

    var firstCharacter = code.length > 0 ? code.substring(0, 1) : null;
    if(firstCharacter == null)return null;

    if(firstCharacter.length === 1 && firstCharacter.match(/[a-z]/i)){
      return false;
    }else{
      return true;
    }
  }

  hidePlusInGridForCode(dxCode){
    let self = this;
    for(let i = 0; i < self.data.length; i++){
      if(self.data[i].code == dxCode){
        self.data[i].displayPlus = false;
      }
    }
  }

  addRow(id, code, description, date, isHistorical, obj){
    let self = this;
    let aRow = self.goData.getNewDxRow(id, code, description, date, obj);
    aRow.historical = isHistorical;
    aRow.displayPlus = isHistorical;
    self.data.push(aRow);
    return aRow;
  }

  rowSwipe(event, row) {
    if (event.direction === 'left') {
      //display delete option...
      if(!row.displayDelete && this.isDxDeletable(row)){
        row.displayDelete = true;
        this.displayDeleteHeader = true;
      }else{
        this.displayAlert("You cannot delete a historical diagnosis.", 'Deletion Not Allowed!', ['OK']);
      }
    }else if(event.direction === 'right') {
      //display delete option...
      if(row.displayDelete){
        row.displayDelete = false;
        this.displayDeleteHeader = false;
      }
    }
  }

  isDxDeletable(row){
    //check and see if row date == today...
    let today = moment().format('MM/DD/YYYY');
    let dxDate = moment(row.date).format('MM/DD/YYYY');
    return today == dxDate ? true : false;
  }

  displayAlert(text, header, buttonDescriptionArray, callback, template, alertType) {
    let self = this;
    self.popupHelper.openGenericMessagePop(text, header, buttonDescriptionArray, false, function(res){
      if(callback){
        callback(res);
      }
    }, {htmlTemplate: template, alertType: alertType});
  }

  deleteDxClick(index){
    let self = this;
    self.displayAlert("Do you wish to delete the diagnosis?", 'Delete Diagnosis?', ['YES','NO'],function(res){
      if(res.result== 'YES'){
        let id = self.data[index].id;
        if(id==0){
          self.data.splice(index, 1);
        }else{
          self.deleteDiagnosis(id, function(res){
            if(res == true){
              self.data.splice(index, 1);
            }
          })
        }
      }else{
        //reset row delete...
        self.data[index].displayDelete = false;
      }
    });
  }

  deleteDiagnosis(id, callback){
    let self = this;
    let url = `patientdiagnosis/${id}`;
    self.goData.deleteWithUrl(url, function(res){
      callback(res);
    });
  }

  doesDiagnosisExist(code, date, providerId){
    return _.find(this.data, function(o){return o.code == code && o.date == date && o.data.ProviderID == providerId });
  }

  displayExistingDxAlert(dx){
    let self = this;
    let alertTemplate =`<span class="font-weight-bold pr-1">${dx.code}</span><span class="text-uppercase">${dx.description}</span><div class="text-muted">...already exists today!</div>`;
    self.displayAlert(null, 'Diagnosis Exists', null,  null, alertTemplate, 'warning');
  }

  displayUnspecifiedDxAlert(dx, callback){
    let self = this;
    let alertTemplate =`<span class="font-weight-bold pr-1">${dx.Code}</span><span class="text-uppercase">${dx.Descriptor}</span>
    <div class="text-muted">Do you wish to specify code?</div>`;
    self.displayAlert(null, 'Unspecified Diagnosis', ['YES','NO'],  callback, alertTemplate, 'warning');
  }

  dxChecked(dx){
    let self = this;
    let todayDate = moment(self.date).format('MM/DD/YY');
    if(self.doesDiagnosisExist(dx.code, todayDate, self.providerId)){
      self.displayExistingDxAlert(dx);
      return;
    }

 
    var aDx = self.createDxObject(dx);
    aDx.selected = true;
    aDx.historical = false;
    aDx.displayPlus = false;
    self.data.splice(0,0,aDx);

    self.hidePlusInGridForCode(aDx.code);

    self.saveDiagnoses(function(res){

      if(res.length > 0){
        self.updateRowIdWithCodeAndDescription(res[0].PatientDXID, res[0].PatientDxCode, res[0].PatientDxDescription);
      }
    });
  }

  updateRowIdWithCodeAndDescription(id, code, description){
    let self = this;
    for(let i = 0; i < self.data.length; i++){
      //update id in rows...
      var row = self.data[i];
      if(row.code == code && row.description == description){
        row.id = id;
        break
      }
    }
  }

  createDxObject(dx){
    var self = this;
    var aDx = {
      "id": 0,
      "code": dx.code,
      "description": dx.description,
      "date": self.helper.getDateWithFormat(self.date, "MM/DD/YY"),
      "data": dx.data,
      "selected": true,
      "side": dx.side,
      "part": dx.part ? dx.part : dx.data.BodyPart
    };
    return aDx;
  }

  createDxObjectWithVWDiagnosis(vwDx){
    var self = this;
    var aDx = {
      "id": 0,
      "code": vwDx.DxKey,
      "description": vwDx.Description,
      "date": self.helper.getDateWithFormat(self.date, "MM/DD/YY"),
      "data": vwDx,
      "selected": true,
      "side": vwDx.side,
      "part": vwDx.Region
    };
    return aDx;
  }

  createDxObjectWithIcd10Code(icd10Code){
    var self = this;
    var aDx = {
      "id": 0,
      "code": icd10Code.Code,
      "description": icd10Code.Descriptor,
      "date": self.helper.getDateWithFormat(self.date, "MM/DD/YY"),
      "data": icd10Code,
      "selected": true,
      "side": icd10Code.side,
      "part": icd10Code.part
    };
    return aDx;
  }


  saveDiagnoses(callback) {
    let self = this;

    if(self.block.dontSave){
      return;
    }

    if(self.locked)return;

    let selectedDiagnoses = self.data.filter((item) => {
      return item.selected === true;
    });

   // let formattedDate = moment(self.date).format();
    //let formattedDate = self.helper.getDateWithFormat(self.date, "MM/DD/YY");
    //let formattedDate = self.helper.parseMMDDYYDateString(self.date, "/");
    let formattedDate = self.date;

    let addedDiagnoses = [];
    for(let i = 0; i< selectedDiagnoses.length; i++){
      let current = selectedDiagnoses[i];

      //reset selected...
      current.selected = false;

      //let patientDx = {};
      let patientDx = {
        PatientDxDescription: current.data.PatientDxDescription,
        PatientDxCode: current.data.PatientDxCode,
        ExamDateTime: formattedDate,
        PatientID: self.patientId,
        ProviderID: self.providerId,
        UserID: self.userId,
        BodyPart:current.part,//self.bodypart,
        BodySide: current.side,//self.bodyside,
        Status: 'A',
        FromIcd10First: 0,
        // DateCreated: moment(self.date).format(),
        // DateModified: moment(self.date).format()
      };

      if(current.data.hasOwnProperty('PatientDxCode')){
        patientDx.PatientDxDescription = current.data.PatientDxDescription;
        patientDx.PatientDxCode = current.data.PatientDxCode;
      }else if(current.data.hasOwnProperty('Description')){
        patientDx.PatientDxDescription = current.data.Description;
        patientDx.PatientDxCode = current.data.DxKey;
      }else{
        patientDx.PatientDxDescription = current.data.Descriptor;
        patientDx.PatientDxCode = current.data.Code;
      }

      addedDiagnoses.push(patientDx);
    }

    self.saveAddedDiagnoses(addedDiagnoses, (returnData) => {
      // for(let i = 0; i < self.data.length; i++){
      //   let current = self.data[i];
        //current.selected = false;
        //self.needsSavingDx = false;
      //}
      self.needsSavingDx = false;
      self.helper.createNotySuccess('Added Diagnoses Saved Successfully!');
      if(callback) callback(returnData);
    });

  }


  saveAddedDiagnoses(diagnoses, callback){

    const self = this;
    const url = `patientdiagnosis/list`;
    let stringifiedContent = JSON.stringify(diagnoses);
    self.http.post(self.helper.getApiUrl(url), stringifiedContent, (returnData) => {
      callback(returnData);
    }, {contentType: 'application/json'});

  }
}
