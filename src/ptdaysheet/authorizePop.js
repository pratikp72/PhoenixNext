/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {bindable, inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import {PtAuthData} from './ptAuthData';
import * as _ from "lodash";


class AuthorizeRow{
  constructor(id, authDate, side, part, authDays, authVisits, type, authNumber, caseId, comments, status){
    this.authDate = authDate;
    this.side = side;
    this.part = part;
    this.authDays = authDays;
    this.authVisits = authVisits;
    this.type = type;
    this.authNumber = authNumber;
    this.caseId = caseId;
    this.comments = comments;
    this.status = status;
    this.data = null;
    this.id = id;
  }

  // @bindable datepicker = null;
}

class BindableDatepicker{
  @bindable datepicker;
}


@inject(DialogController, http, helper, PtAuthData)
export class AuthorizePop {

  // @bindable datepicker;
  datepickers=[];

  sides = ['Right', "Left", 'Bilateral'];
  parts = ['Ankle', 'Cervical', 'Clavicle', 'Elbow', 'Foot', 'Forearm', 'Hand', 'Hip', 'Knee', 'Lowerleg', 'Lumbar', 'Pelvis', 'Shoulder', 'Thigh', 'Thoracic', 'Upperarm', 'Wrist'];
  types =['PT','OT'];
  statusList =['ACT','DEL','EXP'];
  inputFieldHeight=38;
  authorizations = [];
  filtered=[];
  patientId;
  userId;

  constructor(DialogController, http, helper, PtAuthData){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.data = PtAuthData;
  }

  getAuthorizeRow(){
    var a = new AuthorizeRow();
    a.id = 0;
    return a;
  }

  addRow(){
    var self = this;

    var aAuth = self.getAuthorizeRow();
    aAuth.authDate = moment().format("MM/DD/YYYY");//{ a.AuthDate;
    // aAuth.side = a.BodySide;
    // aAuth.part = a.BodyPart;
    // aAuth.authDays = a.AuthDays;
    // aAuth.authVisits = a.AuthVisits;
    // aAuth.type = a.Type;
    // aAuth.authNumber = a.AuthNumber;
    // aAuth.caseId = a.ClaimID;
    // aAuth.comments = a.Comments;
     aAuth.status = 'ACT';
    // aAuth.data = a;


    self.authorizations.push(aAuth);
    self.datepickers.push(new BindableDatepicker());

    self.authorizations.push()
  }

  deleteRow(index){
    var self = this;
    self.authorizations.splice(index, 1);
    self.datepickers.splice(index, 1);
  }

  close(){
    let self = this;

    self.data.save(self.authorizations, self.patientId, self.userId, function(res){

    });

    self.dialogController.close();
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  openCalendar(index){
    this.datepickers[index].datepicker.methods.toggle();
  }

  activate(obj) {
    var self = this;

    var width = obj.parentWidth * 0.95;
    var height = obj.parentHeight * 0.50;

    self.popupWidth =  width;//obj.parentWidth;//- 88;//  obj.popupWidth * .8;
    self.popupHeight = height;//(obj.parentHeight - 75);// * .8;
    self.popupTop = (obj.parentHeight / 2) - (height / 2);//(obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = 10;//(obj.popupWidth - self.popupWidth) / 2;


    self.patientId = obj.patientId;
    self.userId = obj.userId;
    self.loadGrid(self.patientId);
  }

  filter(status){
    var self = this;
    self.datepickers = [];
    self.filtered = [];

    //filter by status...
    self.filtered = _.filter(self.authorizations, function(a){return a.status == status});
    for(var i = 0; i < self.filtered.length; i++){
      self.datepickers.push(new BindableDatepicker());
    }
  }

  loadGrid(patientId){
    var self = this;

    self.authorizations = [];
    self.datepickers = [];
    self.filtered = [];

    self.data.getWithPatientId(patientId, function(res){
      for(var i = 0; i < res.length; i++){
        var a = res[i];

        var aAuth = self.getAuthorizeRow();
        aAuth.authDate = self.helper.getISODateToFormat(a.AuthDate, "MM/DD/YYYY");//{ a.AuthDate;
        aAuth.side = a.BodySide;
        aAuth.part = a.BodyPart;
        aAuth.authDays = a.AuthDays;
        aAuth.authVisits = a.AuthVisits;
        aAuth.type = a.Type;
        aAuth.authNumber = a.AuthNumber;
        aAuth.caseId = a.ClaimID;
        aAuth.comments = a.Comments;
        aAuth.status = a.Status;
        aAuth.data = a;
        aAuth.id = a.Id;

        self.authorizations.push(aAuth);
        //self.datepickers.push(new BindableDatepicker());
      }


      //filter by status...
      // self.filtered = _.filter(self.authorizations, function(a){return a.status == 'ACT'});
      // for(var i = 0; i < self.filtered.length; i++){
      //   self.datepickers.push(new BindableDatepicker());
      // }

      self.filter('ACT');

    });
  }


}
