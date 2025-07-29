import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Data} from '../../data/go/data';
import {Home} from '../home';
import {PopupHelper} from "../popupHelper";
import {BindingSignaler} from 'aurelia-templating-resources';
import { Globals } from '../globals';

@inject(helper,http, Data, Home, PopupHelper, BindingSignaler, Globals)
export class MedAllergy {

  meds=[];
  allergies=[];
  displayMeds = true;


  constructor(helper, http, Data, Home, PopupHelper, BindingSignaler, Globals){
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.popupHelper = PopupHelper;
    this.signaler = BindingSignaler;
    this.globals = Globals;
  }

  activate(model){
    this.block = model;
  }

  attached(){
    if(this.home.currentBoard.patientId != null){
      this.load();
    }
  }

  load(){
    var self = this;
    self.getPatientAllergies(self.home.currentBoard.patientId, function(res){
      self.allergies = res;
    });

    self.getPatientMeds(self.home.currentBoard.patientId, function(res){
      self.meds = res;
    });
  }

  medsTabClicked(medsClicked){
    this.displayMeds = medsClicked;
  }

  getPatientMeds(patientId, callback) {
    var self = this;
    var url = "rxs?patientId="+ patientId;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      var list=[];
      for(var i = 0; i < json.length; i++){
        var m = json[i];
        var aMed = self.data.getNewMedRow(m.RXPatientID, m.RX_Sig, self.helper.getISODateToFormat(m.LastRefill, "MM/DD/YY"), m.RX_Status);
        aMed.index=i;
        list.push(aMed);
      }
      callback(list);
    });
  }

  getPatientAllergies(patientId, callback) {
    var self = this;
    var url = "patientallergies/query";
    var data ={'PatientId': patientId,
      'Status': ["Active", "A"]};

    self.http.post(self.helper.getApiUrl(url), JSON.stringify(data), function(res){

        console.log('GOT ALLERGIES', res);

        if(res == undefined || res == null)return;

        var list=[];
        for(var i = 0; i < res.length; i++){
          var m = res[i];
          var alg = self.data.getNewAllergyRow(m.AllergyID, m.Substance, "", m.Reaction);
          alg.index=i;
          list.push(alg);
        }
        callback(list);

      },
      { contentType: "application/json" },
      function(err){
        var e = 'oops';
      });
  }

  rowSwipe(event, row) {
    if (event.direction === 'left') {
      //display cannot delete message...
      this.displayNoDeletionAlert();
    }
  }

  displayNoDeletionAlert() {
    let self = this;
    self.popupHelper.openGenericMessagePop('Please manage patient allergies / meds from demographics.', 'Deletion Not Allowed', ['OK'], false, function(res){
    });
  }

  // deleteMedClick(index){
  //   let self = this;
  //   self.displayDeleteAlert("Do you wish to delete this medication?", 'Delete Medication?', function(res){
  //     if(res.result== 'YES'){
  //       self.meds.splice(index, 1);
  //
  //       self.updateRowIndexes(self.meds);
  //     }else{
  //       //reset row delete...
  //       self.meds[index].displayDelete = false;
  //     }
  //   });
  // }
  //
  // deleteAlgClick(index){
  //   let self = this;
  //   self.displayDeleteAlert("Do you wish to delete this allergy?", 'Delete Allergy?', function(res){
  //     if(res.result== 'YES'){
  //       self.allergies.splice(index, 1);
  //
  //       self.updateRowIndexes(self.allergies);
  //     }else{
  //       //reset row delete...
  //       self.allergies[index].displayDelete = false;
  //     }
  //   });
  // }
  //
  // updateRowIndexes(rows){
  //   let self= this;
  //   for(let i = 0; i< rows.length; i++){
  //     let r = rows[i];
  //     r.index = i;
  //   }
  //   self.signaler.signal('refresh-row');
  // }

}
