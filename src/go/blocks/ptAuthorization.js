import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import moment from "moment";
import {Home} from '../home';
import {PopupHelper} from '../popupHelper';
import {Data} from '../../data/go/data';
import * as _ from 'lodash';


class PtRow{
  constructor(data){
    this.bodypart = "";
    this.data = data;
    this.date=moment(data.AuthDate).format('MM/DD/YYYY');
    this.daysRemaining=0;
    this.visitsRemaining=0;
    this.expired = false;

    if(data.BodySide){
      this.bodypart=data.BodySide;
    }
    if(data.BodyPart){
      this.bodypart += " " + data.BodyPart;
    }
  }
}

@inject(helper,http,Home, Data, PopupHelper)
export class PtAuthorization {

  rows=[];
  patientId;
  date;
  providerId;
  userId;
  bodypart;
  //bodyside;
  board = null;

  timeRemainingText="";
  locked = false;

  insurance=null;
  authorizationType=null;
  

  constructor(helper, http, Home, Data, PopupHelper){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
    this.popupHelper = PopupHelper;
  }

  attached(){

    var self = this;
    if(self.home.currentBoard != null &&
      self.home.currentBoard.patientId != null){
      self.patientId = self.home.currentBoard.patientId;
      self.bodypart = self.home.currentBoard.visitInfo.bodypart;
      self.locked = self.home.currentBoard.visitInfo.locked == 0 ? false : true;
      self.authorizationType = self.home.currentBoard.visitInfo.typeForSave;
      if(self.home.patient){
        self.insurance = self.home.patient.data.OD_Insurance ? self.home.patient.data.OD_Insurance.OD_InsuranceCompany.Name : "";
      }
      self.load();
     }
  }

  addAuth() {
    let self = this;
    self.goData.getWithUrl('ptauth/new', function(res){
      self.openAuthPop(res);
    });
  }

  calculateAuthTimeRemaining(){
    let self = this;
    //get latest auth...
    for(let i = 0; i < self.rows.length; i++){
      let data = self.rows[i].data;

      //get auth days / visits...
      let aDate =data.AuthDate ?  moment(data.AuthDate) : moment();

      //create new object for days to completion...
      let aDatePlusAuthorizedDays = data.AuthDate ?  moment(data.AuthDate) : moment(); 
      aDatePlusAuthorizedDays.add('days', data.AuthDays);

      let today =moment();
      // let daysRemaining = moment.duration(today.diff(aDate)).asDays();
      let daysRemaining = moment.duration(aDatePlusAuthorizedDays.diff(today)).asDays();
      self.rows[i].daysRemaining = Math.max(0, Math.floor(daysRemaining));// Math.floor(daysRemaining);
      if(self.rows[i].daysRemaining == 0){
        self.rows[i].expired = true;
      }

      let visitRemaining=data.AuthVisits;
      //get pt visits since authurization date...
      let visitUrl = `examfollowups/patients/${self.patientId}/type/${data.Type}/date/${aDate.format('MM-DD-YYYY')}`;
      self.goData.getWithUrl(visitUrl, function(res){
        //subtract found visits from auth visits...
        // visitRemaining -= res.length;
        // visitRemaining = Math.max(0, visitRemaining);
        // if(visitRemaining == 0){
        //   self.rows[i].expired = true;
        // }
        // self.rows[i].visitsRemaining = visitRemaining;

        //count up used visits...
        var usedVisits = res.length > data.AuthVisits ? data.AuthVisits : res.length;
        if(usedVisits == data.AuthVisits){
          self.rows[i].expired = true;
        }
        self.rows[i].visitsRemaining = usedVisits;
      });
    }
  }

  openAuthPop(ptAuth){

    let self = this;
    let path ='./ptAuthPop';
    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let width = windowWidth / 2;
    let left = quarter;

    let height = windowHeight / 2;
    let qHeight = windowHeight / 4;
    let top = qHeight;

    let options={
      displayHeader: false,
      bodyPadding: 0,
      scrollHeight: 610
    }

    let header = ptAuth.Id==0 ? 'New Authorization' : ptAuth.Type + " Authorization";

    self.popupHelper.openViewModelPop(path, ptAuth, header, width, height, top, left, options, function(authRes){
      self.save(authRes);
    });
  }


  edit(row){
    let self = this;
    self.openAuthPop(row.data);
  }

  load(){
    let self = this;
    self.rows=[];
    let url = `ptauth?patientId=${self.patientId}`;
    self.goData.getWithUrl(url, function(res){

      //filter out EXP and match current visit type...

      res = _.filter(res, function(a){return a.Status == 'ACT' && a.Type == self.authorizationType && a.BodyPart.toUpperCase() == self.bodypart.toUpperCase()});

      res = _.orderBy(res, 'AuthDate', 'desc');
      for(let i = 0; i < res.length; i++){
        let aRow = new PtRow(res[i]);
        self.rows.push(aRow);
      }
      self.calculateAuthTimeRemaining();

    });
  }

  // detached(){
  //   this.trySave();
  // }
  //
  // trySave(){
  //   var self = this;
  //   if(self.board != null) {
  //     self.home.saveQueue.addItem(self);
  //   }
  // }

  save(auth){
    var self = this;

    delete auth.dialog;

    if(auth.hasOwnProperty('overlay')){
      delete auth.overlay;
    }

    if(auth.Id==0){
      //add patientID...
      auth.PatientId=self.patientId;

      let saveDx = self.helper.createNoty('Saving Authorization...', 3000);
      saveDx.show();
      self.goData.postWithUrlAndData('ptauth', JSON.stringify(auth), function(res){
        saveDx.close();
        //add new row to top of list...
        let newRow = new PtRow(res);
        self.rows.unshift(newRow);
      });
    }else{
      let updateDx = self.helper.createNoty('Updating Authorization...', 3000);
      updateDx.show();
      self.goData.putWithUrlAndData('ptauth', auth, function(res){
        updateDx.close();
      });
    }
  }

}
