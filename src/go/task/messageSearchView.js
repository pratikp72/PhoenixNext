/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../../helpers/http';
import {helper} from '../../helpers/helper';
import * as _ from 'lodash';
import {Data} from '../../data/go/data';


class MessageTarget{
  constructor(id, first, last, matchedLast, isPatient){
    this.id = id;
    this.firstName = first;
    this.lastName = last;
    this.selected = false;
    this.matchedLast = matchedLast;
    this.isPatient = false;
  }
}


@inject(DialogController, http, helper, Data)
export class MessageSearchView {


  selectedUser=null;
  searchResults=[];

  searchString="";
  users=[];

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;

  searchPatients = false;
  searchTarget = 'User/Group';
  patients=[];


  messageForm=null;


  constructor(DialogController, http, helper, Data){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.goData = Data;
  }

  toggleSearchTarget(){
    var self = this;
    self.searchPatients = self.searchPatients ? false : true;
    self.searchTarget = self.searchPatients ? 'Patient' : 'User/Group';
  }

  targetListClicked(target){
      var self = this;
      self.removeTargetFromList(target);
  }

  removeTargetFromList(target){
    var self = this;

    // this.id = id;
    // this.firstName = first;
    // this.lastName = last;
    for(var i = 0; i < self.messageForm.currentMessage.targetList.length; i++){
      var aTarget = self.messageForm.currentMessage.targetList[i];
      if(aTarget.id == target.id &&
        aTarget.firstName == target.firstName &&
        aTarget.lastName == target.lastName){

        //remove item from list...
        self.messageForm.currentMessage.targetList.splice(i, 1);

      }
    }
  }

  searchStringResult(val){
    this.searchString = val;
    this.filter();
  }

  searchStringResult(){
    return this.searchString;
  }

  activate(obj){
    let self = this;
    self.messageForm = obj;

    self.getUsers();

    self.getAllPatients(function(res){
      self.patients = res;
    });
  }

  getAllPatients(callback) {
    var self = this;
    //var url = "patients/" + patientId;
    var url = `patients`;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      callback(json);
    });
  }

  getUsers(){
    var self = this;

    var n = self.helper.createNoty("loading users...", 10000);
    n.show();

    self.http.get(self.helper.getApiUrl('users'), function (res) {
      self.users = _.filter(res, function(o) { return o.LastName != null && o.LastName.trim().length > 0});

      self.helper.notySuccess(n, "users loaded");
      n.close();
    });
  }

  rowClicked(t){
    var self = this;
    self.messageForm.currentMessage.targetList.push(t);
    self.messageForm.setDetailHeight(self.messageForm.ogDetailHeight - self.targetdiv.clientHeight);
    self.searchString = null;
    self.targetinput.focus();
  }

  filter(val){
    var self = this;
    self.searchResults = [];
    self.searchList = self.users;

    if(self.searchString.length == 0)return;

    var lastNameTerm = 'LastName';
    var firstNameTerm = 'FirstName';


    if(self.searchPatients){
      lastNameTerm = 'NameLast';
      firstNameTerm = 'NameFirst';
      self.searchList = self.patients;
    }

    var res = _.filter(self.searchList, function(o) { return o[lastNameTerm].toLowerCase().startsWith(self.searchString.toLowerCase()) || o[firstNameTerm].toLowerCase().startsWith(self.searchString.toLowerCase())  });
    var startLastName = _.filter(res, function(o) { return o[lastNameTerm].toLowerCase().startsWith(self.searchString.toLowerCase()) });
    var startFirstName = _.filter(res, function(o) { return o[firstNameTerm].toLowerCase().startsWith(self.searchString.toLowerCase()) });

    startLastName = _.sortBy(startLastName, [ function(o){ return o[lastNameTerm]; }]);
    startFirstName = _.sortBy(startFirstName, [ function(o){ return o[firstNameTerm]; }]);

    for(var i = 0; i < startLastName.length; i++){
      var to = startLastName[i];
      if(!self.searchPatients){
        //user OR group??
        var targetType = null;
        var id = null;
        var first = null;
        var last = null;
        if(to.hasOwnProperty('UserID')){
          targetType = self.goData.TARGETTYPE.USER;
          id = 'UserID';
          first = 'FirstName';
          last = 'LastName';
        }else{
          targetType = self.goData.TARGETTYPE.GROUP;
          id = 'GroupID';
          first = 'GroupName';
        }

        var msgTarget = self.goData.getNewMessageTarget(to[id], to[first], to[last], targetType, 0);
        msgTarget.matchedLast = true;
        self.searchResults.push(msgTarget);
      }else{
        var msgTarget = self.goData.getNewMessageTarget(to.PatientID, to.NameFirst, to.NameLast, self.goData.TARGETTYPE.PATIENT, 0);
        msgTarget.matchedLast = true;
        self.searchResults.push(msgTarget);
      }
    }
    for(var i = 0; i < startFirstName.length; i++){
      var to = startFirstName[i];
      if(!self.searchPatients){

        //user OR group??
        var targetType = null;
        var id = null;
        var first = null;
        var last = null;
        if(to.hasOwnProperty('UserID')){
          targetType = self.goData.TARGETTYPE.USER;
          id = 'UserID';
          first = 'FirstName';
          last = 'LastName';
        }else{
          targetType = self.goData.TARGETTYPE.GROUP;
          id = 'GroupID';
          first = 'GroupName';
        }

        var msgTarget = self.goData.getNewMessageTarget(to[id], to[first], to[last], targetType, 0);
        msgTarget.matchedLast = false;
        self.searchResults.push(msgTarget);
      }else{
        var msgTarget = self.goData.getNewMessageTarget(to.PatientID, to.NameFirst, to.NameLast, self.goData.TARGETTYPE.PATIENT, 0);
        msgTarget.matchedLast = false;
        self.searchResults.push(msgTarget);
      }
    }
  }



}
