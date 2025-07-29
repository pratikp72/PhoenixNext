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
    this.editing=true;
    this.ignoreCallback = false;
  }

  select(){
    this.checked = this.checked ? false : true;
  }

  checkedChanged(newVal, oldVal){
    if(this.callback && !this.ignoreCallback){
      this.callback(this);
    }
  }
}

@inject(helper,http, Data, Home)
export class PtOrder {

  providerId;
  bodypart;
  bodyside;
  preferences = [];
  selectedPref;

  comments = "";

  popupHelper;

  ptCheckbox;
  otCheckbox;
  workHardenCheckbox;
  evalTreatCheckbox;

  pushes=[];
  modalities=[];
  exercises=[];
  roms=[];

  tractions=[];

  therapyData;


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
    self.providerId = params.currentBoard.visitInfo.providerId;
    self.userId = params.currentBoard.userId;

    //bodypart??
    if(params.currentBoard &&
      params.currentBoard.visitInfo){
      self.bodypart = params.currentBoard.visitInfo.bodypart;
      self.bodyside = params.currentBoard.visitInfo.bodyside;
    }

    //orders
    self.ptCheckbox = new Mycheckbox('PT', self, self.ptDelegate);
    self.otCheckbox = new Mycheckbox('OT', self, self.otDelegate);
    self.workHardenCheckbox = new Mycheckbox('Work Harden', self, self.concatDelegate);
    self.evalTreatCheckbox = new Mycheckbox('Eval & Treat', self, self.concatDelegate);

    //push
    self.pushes.push(new Mycheckbox('Gentle', self, self.pushDelegate));
    self.pushes.push(new Mycheckbox('Moderate', self, self.pushDelegate));
    self.pushes.push(new Mycheckbox('Aggressive', self, self.pushDelegate));

    //modalities
    self.modalities.push(new Mycheckbox('As indicated', self, self.concatDelegate));
    self.modalities.push(new Mycheckbox('Heat', self, self.concatDelegate));
    self.modalities.push(new Mycheckbox('Ice', self, self.concatDelegate));
    self.modalities.push(new Mycheckbox('U/S', self, self.concatDelegate));
    self.modalities.push(new Mycheckbox('TENS', self, self.concatDelegate));
    self.modalities.push(new Mycheckbox('Iontophoresis', self, self.concatDelegate));
    self.modalities.push(new Mycheckbox('Phonophoresis', self, self.concatDelegate));
    self.modalities.push(new Mycheckbox('Moist heat', self, self.concatDelegate));
    self.modalities.push(new Mycheckbox('E-Stim', self, self.concatDelegate));
    self.modalities.push(new Mycheckbox('Massage', self, self.concatDelegate));
    self.modalities.push(new Mycheckbox('Whirlpool', self, self.concatDelegate));

    //exercise
    self.exercises.push(new Mycheckbox('Stretching', self, self.concatDelegate));
    self.exercises.push(new Mycheckbox('Strengthening', self, self.concatDelegate));
    self.exercises.push(new Mycheckbox('Balance training', self, self.concatDelegate));
    self.exercises.push(new Mycheckbox('Teach home exercise', self, self.concatDelegate));
    self.exercises.push(new Mycheckbox('Plyometrics', self, self.concatDelegate));
    self.exercises.push(new Mycheckbox('Proprioception', self, self.concatDelegate));

    //rom
    self.roms.push(new Mycheckbox('PROM', self, self.concatDelegate));
    self.roms.push(new Mycheckbox('AAROM', self, self.concatDelegate));
    self.roms.push(new Mycheckbox('AROM', self, self.concatDelegate));

    //tractions
    self.tractions.push(new Mycheckbox('Cervical', self, self.tractionDelegate));
    self.tractions.push(new Mycheckbox('Lumbar', self, self.tractionDelegate));

    if(self.providerId){
      let url = `ptpref?providerId=${self.providerId}`;
      self.data.getWithUrl(url, function(res){
        self.preferences = res;
      });
    }

    self.load();

  }

  concatDelegate(){
    this.parent.concat();
  }

  concatCheckList(checklist, title){
    let self = this;
    let concatRes ="";
    let checked=[];
    for(let i = 0; i < checklist.length; i++){
      if(checklist[i].checked){
        checked.push(checklist[i]);
      }
    }
    if(checked.length > 0){
      concatRes = title;
      if(checked.length == 1){
        concatRes += checked[0].detail + ". ";
      }else if(checked.length == 2){
        concatRes += checked[0].detail + " and " + checked[1].detail + ". ";
      }else{
        for(let c = 0; c < checked.length; c++){
          if(c == checked.length - 2){
            concatRes += checked[c].detail + " and ";
          }else if(c==checked.length - 1){
            concatRes += checked[c].detail  + ". ";
          }else{
            concatRes += checked[c].detail + ", ";
          }
        }
      }
    }
    return concatRes;
  }

  concatModalities(){
    let self = this;
    return self.concatCheckList(self.modalities, "Modalities ordered: ");
  }

  concatExercise(){
    let self = this;
    return self.concatCheckList(self.exercises, "Exercise ordered: ");
  }

  concatRom(){
    let self = this;
    return self.concatCheckList(self.roms, "Exercise ordered: ");
  }

  ptDelegate(){

    this.parent.otCheckbox.checked = this.parent.ptCheckbox.checked ? false : true;

    this.parent.concat();
  }

  otDelegate(){

    this.parent.ptCheckbox.checked = this.parent.otCheckbox.checked ? false : true;

    this.parent.concat();
  }

  tractionDelegate(obj){
    let checkVal = obj.checked ? false : true;
    for(let p = 0; p < obj.parent.tractions.length; p++){
      let aPush = obj.parent.tractions[p];
      aPush.ignoreCallback = aPush.detail == obj.detail ? false : true;
      if(aPush.detail != obj.detail){
        aPush.checked = checkVal;
      }
    }
    obj.parent.concat();
  }

  clearTractionIgnoreCallback(){
    for(let i = 0; i < this.tractions.length; i++){
      this.tractions[i].ignoreCallback = false;
    }
  }

  clearPushIgnoreCallback(){
    for(let i = 0; i < this.pushes.length; i++){
      this.pushes[i].ignoreCallback = false;
    }
  }

  pushDelegate(obj){
    let checkVal = obj.checked ? false : true;

    for(let p = 0; p < obj.parent.pushes.length; p++){
      let aPush = obj.parent.pushes[p];
      aPush.ignoreCallback = aPush.detail == obj.detail ? false : true;
      if(aPush.detail != obj.detail){
        aPush.checked = checkVal;
      }
    }

    obj.parent.concat();
  }

  concat() {
    let self = this;
    self.comments = "";

    if(self.selectedPref){
      self.comments = self.selectedPref.Comments.trim();

      //check for period...
      let period = self.comments.substr(self.comments.length - 1);
      if(period!=='.'){
        //add period...
        self.comments += ". ";
      }else{
        self.comments += " ";
      }
    }

    if(self.ptCheckbox.checked){
      self.comments += "Physical therapy: " +  self.bodyside + " " + self.bodypart + ". ";
    }
    if(self.otCheckbox.checked){
      self.comments += "Occupational therapy: " +  self.bodyside + " " + self.bodypart + ". ";
    }
    if(self.workHardenCheckbox.checked){
      self.comments += "Work hardening: ";
    }
    if(self.evalTreatCheckbox.checked){
      self.comments += "Evaluate and treat ";
    }

    for(let t = 0; t < self.pushes.length; t++){
      if(self.pushes[t].checked){
        self.comments += "push " + self.pushes[t].detail + ". ";
      }
    }
    self.clearPushIgnoreCallback();

    let modConcat =  self.concatModalities();
    if(modConcat.length > 0){
      self.comments += modConcat;
    }

    let exConcat =  self.concatExercise();
    if(exConcat.length > 0){
      self.comments += exConcat;
    }

    let romConcat =  self.concatRom();
    if(romConcat.length > 0){
      self.comments += romConcat;
    }

    for(let t = 0; t < self.tractions.length; t++){
      if(self.tractions[t].checked){
        self.comments += self.tractions[t].detail + " traction. ";
      }
    }
    self.clearTractionIgnoreCallback();
  }

  prefSelected(pref){
    this.selectedPref = pref;
    this.concat();
  }

  createPref(){
    let self = this;
    let url = 'ptpref';
    self.popupHelper.openGenericInputPop('Create New Preference', ['Description'],null,false,
      function (res) {

        let pref={
          'Description': res.inputs[0].value,
          'Comments': self.comments,
          'ProviderID': self.providerId
        }

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
    let url = 'ptpref';

    if(!self.selectedPref){
      self.popupHelper.openGenericMessagePop('Please select a preference to update.', 'Save Preference Requirements', ['OK'], true, function(res){

      });
      return;
    }

    let dialog = self.helper.createNoty("Updating Preference...", 1000);
    dialog.show();

    self.selectedPref.Comments = self.comments;

    self.data.putWithUrlAndData(url, self.selectedPref, function(putRes){
      dialog.close();
    });
  }

  save(){
    let self = this;
    let schoolUrl = 'ptorder';

    let dialog = self.helper.createNoty("Saving Therapy Order...", 3000);
    dialog.show();

    if(!self.therapyData){
      //create new...
      let orderType = 'PT';
      if(self.otCheckbox.checked){
        orderType = 'OT';
      }
      let order={
        'ExamDateTime': self.date,
        'UserID': self.userId,
        'PatientID': self.patientId,
        'ProviderID': self.providerId,
        'PtComments': self.comments,
        'Type': orderType
      }

      self.data.postWithUrlAndData(schoolUrl, JSON.stringify(order), function(saveRes){
        self.therapyData = saveRes.Model;
        self.helper.notySuccess(dialog, 'Therapy Order saved!');
      });
    }else{
      //update...
      self.therapyData.PtComments = self.comments;
      self.data.putWithUrlAndData(schoolUrl, self.therapyData, function(updateRes){
        self.helper.notySuccess(dialog, 'Therapy Order saved!');
      });
    }
  }

  load(){
    let self = this;
    self.comments = "";
    let frmtDate = moment(self.date).format('MM-DD-YYYY');
    let orderUrl = `ptorder/patients/${self.patientId}/providers/${self.providerId}/date/${frmtDate}`;
    self.data.getWithUrl(orderUrl, function(res){
      self.therapyData = res.Model;
      if(res.Model != null){
        self.comments = res.Model.PtComments;
      }
    });
  }
}
