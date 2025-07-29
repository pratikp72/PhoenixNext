import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import moment from "moment";

@inject(helper,http, Home, Data)
export class Surgery {

  rows=[];

  constructor(helper, http, Home, Data){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.data = Data;
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
    var patId = self.home.currentBoard.patientId;
    self.getPatientSurgeries(patId, function(res){
      self.rows = res;
    })
  }

  calculatePostOpDays(procedureData){
    let aDate =moment(procedureData);// : moment();
    let today =moment();
    let daysRemaining = moment.duration(today.diff(aDate)).asDays();
    return Math.floor(daysRemaining);
  }

  getPatientSurgeries(patientId, callback){
    var self = this;
    var url = 'patientprocedure/Query';
    var qObject = {
      'PatientId': patientId,
      'ProcedureTypes': ["Surgery"]
    };

    self.http.post(self.helper.getApiUrl(url), JSON.stringify(qObject), function(res){

        if(res == undefined || res == null)return;

        var list=[];
        for(var i = 0; i < res.length; i++){
          var m = res[i];
          var surgDate = m.SurgeryDate != null ? self.helper.getISODateToFormat(m.SurgeryDate, "MM/DD/YY") : '';
          var aRow = self.data.getNewScheduleRow();
          aRow.id = m.PatientCPTID;
          aRow.name = m.CodeDescr;
          aRow.time = surgDate;
          aRow.data = m;
          if(m.SurgeryDate != null){
            aRow.postOpDays = self.calculatePostOpDays(m.SurgeryDate) + " days"
          }
          // var aMed = new ScheduleRow(m.PatientCPTID, m.CodeDescr, surgDate);
          list.push(aRow);
        }
        callback(list);

      },
      { contentType: "application/json" },
      function(err){
        var e = 'oops';
      });
  }

}



