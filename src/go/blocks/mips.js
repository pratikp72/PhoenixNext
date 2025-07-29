import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import {EventAggregator} from 'aurelia-event-aggregator';
//import moment from "moment";

class MipsRow{
  constructor(data, description, code){
    this.data = data;
    this.description = description;
    this.code = code;
    this.snomed;
    this.referringId;
  }
}


@inject(helper, http, Home, Data, EventAggregator)
export class Mips {

  rows=[];
  loadData = true;
  planData = null;
  referringProviders=[];
  patientId;
  providerId;
  date;

  constructor(helper, http, Home, Data, EventAggregator){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.data = Data;
    this.event = EventAggregator;
  }

  activate(model){
    this.block = model;
    this.loadData = model.loadData;
    this.planData = model.dataObject;
  }

  attached(){
    let self = this;

    self.event.subscribe("addMipsRow", function(plan){
      self.addRow(plan);
    });

    if (self.home.currentBoard != null &&
        self.home.currentBoard.visitInfo != null) {

        self.patientId = self.home.currentBoard.visitInfo.patientId;
        self.date = self.home.currentBoard.visitInfo.date;
        self.providerId = self.home.currentBoard.visitInfo.providerId;

        self.data.getWithUrl('referring/all', function(refs){
          self.referringProviders = refs;

          if (self.loadData) {
            self.load();
          }else if(self.planData){
            self.addRow(self.planData);
          }
        });
    }
  }

  addRow(plan){
    let self = this;

    //specialty...
    if(plan.SpecialtyReferringID){
      //get referring provider name...
      let refPro = _.find(self.referringProviders, function(r){return r.ReferringID == plan.SpecialtyReferringID});
      let refName = `${refPro.NameLast},${refPro.NameFirst}`;   
      let aRow = new MipsRow(plan, refName, plan.ReasonCode);
      aRow.referringId = plan.SpecialtyReferringID;
      self.rows.push(aRow);
    }

    // //snomed reason...
    if(plan.Snomed){
      // row.reason = self.getNewReasonObject();
      self.data.getWithUrl(`snomed/valueset?snomedCode=${plan.Snomed}`, function(value){
        let aRow = new MipsRow(plan, value.DisplayName, plan.ReasonCode);
        aRow.snomed = plan.Snomed;
        self.rows.push(aRow);
      });
    }
  }


  load(){
    let self = this;

    var formattedDate = self.helper.getDateWithFormat(self.date, "MM-DD-YYYY");
    var url = `plans/patients/${self.patientId}/providers/${self.providerId}/date/${formattedDate}`;

    self.http.get(self.helper.getApiUrl(url), function (json) {
      for(let i = 0; i < json.length; i++){
        let plan = json[i];

        self.addRow(plan);

      }
    });
  }

}



