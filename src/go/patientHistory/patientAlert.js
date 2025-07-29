import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import * as _ from 'lodash';
import {EventAggregator} from 'aurelia-event-aggregator';
import moment from 'moment';

@inject(helper,http, Data, Home, EventAggregator)
export class PatientHistory {

  alert=null;
  patientId;
  alertText=null;

  constructor(helper, http, Data, Home, EventAggregator) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.event = EventAggregator;
  }

  activate(model){
    this.patientId = model.patient.data.PatientID;
    this.loadPatientAlert(this.patientId);
  }

  detached(){
    this.savePatientAlert();
  }

  loadPatientAlert(patientId){
    let self = this;
    var url = `visitalert?patientId=${patientId}`;
    self.data.getWithUrl(url, function(alert){
      self.alert = alert;
      self.alertText = self.alert.PatientAlert;
    });
  }

  savePatientAlert(){
    let self = this;
    if(self.alert){
      //update...
      self.alert.PatientAlert = self.alertText;
      self.data.putWithUrlAndData('visitcomment', self.alert, function(res){
        //update local alert object...
        self.alert = res;
      });
    }else{
      //create new...
      var newUrl = 'visitcomment';
      self.data.getWithUrl(newUrl, function(newAlert){

        //update with data...
        newAlert.ExamDateTime= moment().format('MM/DD/YYYY');
        newAlert.PatientID = self.patientId;
        newAlert.ProviderID=0;
        newAlert.Type='ALERT';
        newAlert.PatientAlert = self.alertText;

        //post...
        self.data.postWithUrlAndData('visitcomment', JSON.stringify(newAlert), function(res){
          //update local alert object...
          self.alert = res;
        });
      });
    }
  }
}
