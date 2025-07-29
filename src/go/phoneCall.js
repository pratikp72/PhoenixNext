import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable, observable, BindingEngine} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';
import {PopupHelper} from './popupHelper';
import {BindingSignaler} from 'aurelia-templating-resources';
import { Globals } from './globals';


class PhoneCallRow {

  @observable message;

  constructor(date, message, staff, data){
    this.date = date;
    this.message = message;
    this.staff = staff;
    this.data = data;
    this.saveNeeded = false;
    this.index =0;
    this.displayDelete=false;
    this.selected = false;
    this.readonly = false;
  }

  messageChanged(newVal, oldVal){
    if(oldVal){
      this.saveNeeded = true;
      this.data.PatientMessage = newVal;
    }
  }
}


@inject(helper,http, Data, Home, PopupHelper, BindingEngine, BindingSignaler, Globals)
export class PhoneCall {

  providerId;
  patientId;
  date;
  userId;

  //popupHelper;

  //users=[];
  currentUser;

  messages=[];
  customMessages=[];

  searchString;

  selectedPatient;

  displayDeleteHeader=false;

  patientSelected = false;

  overlay;
  overlayVisible = true;

  taskHelper;

  phoneTaskType;

  phonecallHeight=500;

  constructor(helper, http, Data, Home, PopupHelper, BindingEngine, BindingSignaler, Globals) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.popupHelper = PopupHelper;
    this.bindingEngine = BindingEngine;
    this.signaler = BindingSignaler;
    this.globals = Globals;
  }


  //cache current tasktype / object id so we can load it back once xray OR document is closed....
  // self.taskHelper.cacheObjectToTask(self.taskHelper.objectId, self.taskHelper.taskTypeId);
  //
  // //set tasking object...
  // self.taskHelper.setObjectToTask(self.data.data.ObjectID, self.data.data.TaskTypeID);


  activate(params) {
    var self = this;

    self.taskHelper = params.taskHelper;

    self.displayDeleteHeader = !self.globals.isTouchDevice ? true : false;
    
    self.phoneTaskType = self.taskHelper.getTaskTypeWithTypeAndDescription('phone', 'phone call');

    if(params.currentBoard && params.currentBoard.visitInfo){
      self.patientId = params.currentBoard.visitInfo.patientId;
      self.date = params.currentBoard.visitInfo.date;
      self.providerId = params.currentBoard.visitInfo.providerId;
      self.userId = params.currentBoard.userId;
    }

    self.overlay = params.overlay[0];

    //get phonecall height...
    var mycontainer =document.getElementById('mycontainer');
    self.phonecallHeight = mycontainer.clientHeight - params.bluebar.clientHeight - 8;//subtract padding / border of dialog div


    if(params.patient.data.PatientID.length > 0){
      self.patientId = params.patient.data.PatientID;
      self.selectedPatient = params.patient.data;
      self.patientSelected = true;
    }

    self.data.getWithUrl('login/users', function(u){
      //self.users = u;
      //select logged-in user...
      for(let i = 0; i < u.length; i++){
        if(u[i].UserID == self.helper._user.UserID){
          self.currentUser = u[i];
          break;
        }
      }
    });

    //get custom messages...
    self.data.getWithUrl(`listcombo?listType=Phone Call`, function(custom){
      self.customMessages  = custom;
    });

    //get messages...
    if(self.patientId){
      self.getMessages(self.patientId);
    }
  }

  detached(){
    //check for save...
    this.saveAll();
  }

  selectRow(message){
    let self = this;
    for(let i = 0; i < self.messages.length; i++){
      let aRow = self.messages[i];
      if(aRow.index == message.index){
        aRow.selected = true;

        //save task here???
        if(aRow.data.PhoneCallID == 0){
          self._save(aRow, function(res){
            aRow.data = res;
            self.setTaskObject(res.PhoneCallID, self.phoneTaskType.Id, self.selectedPatient.PatientID, self.currentUser.UserID);
          });
        }else{
          self.setTaskObject(aRow.data.PhoneCallID, self.phoneTaskType.Id, self.selectedPatient.PatientID, self.currentUser.UserID);
        }

      }else{
        aRow.selected = false;
      }
    }
  }

  setTaskObject(phoneCallId, taskTypeId, patientId, userId){
    let self = this;
    //set tasking object...
    self.taskHelper.setObjectToTask(phoneCallId, taskTypeId);
    self.taskHelper.patientId = patientId;
    self.taskHelper.userId = userId;
    let tDate = new Date();
    self.taskHelper.date = tDate.getMonth() + 1 + '/' + tDate.getDate() + '/' + tDate.getFullYear();
  }

  getMessages(patientId){
    let self = this;
    self.data.getWithUrl(`phonecalls/patients/${patientId}`, function(calls){
      self.messages = [];

      //order most recent at top...
      calls = _.sortBy(calls, "PhoneCallID", "desc");

      for(let c = 0; c < calls.length; c++){

        let readOnly = true;
        let today = moment().format('MM/DD/YYYY');
        let callDate = moment(calls[c].DateCall).format('MM/DD/YYYY');
        if(today == callDate){
          readOnly = false;
        }

        let pRow = new PhoneCallRow(calls[c].DateCall, calls[c].PatientMessage, calls[c].Staff, calls[c].Data);
        pRow.readonly = readOnly;
        pRow.index = c;
        self.messages.push(pRow);
      }
    });
  }

  toggleOverlay(){
    let self = this;
    self.overlayVisible = self.overlayVisible ? false : true;
    //try hide overlay...
    //self.overlay.style.setProperty("display", self.overlayVisible ? 'block' : 'none' );

    if(!self.overlayVisible){
      self.overlay.classList.remove("active");
    }else{
      self.overlay.classList.add("active");
    }

  }

  searchClicked(){
    let self = this;

    //try hide overlay...
    //self.overlay.style.setProperty("display", "none");
    self.toggleOverlay();

    self.popupHelper.openPatientPop(false, true, function(pat){

      if(pat.hasOwnProperty('cancelled')){
        self.toggleOverlay();
        return;
      }

      self.toggleOverlay();

      if(self.selectedPatient && pat.PatientID != self.selectedPatient.PatientID){
        //save current patient...
        self.saveAll();
      }

      self.selectedPatient = pat;
      self.patientSelected = true;
      self.getMessages(self.selectedPatient.PatientID);

    });
  }

  // search(){
  //   var self = this;
  //
  //   var n = self.helper.createNoty("searching...", 10000);
  //   n.show();
  //
  //   self.searchResults=[];
  //   var url = 'patients/search/delimited?searchDelimited='+self.searchString;
  //   self.http.get(self.helper.getApiUrl(url), function (res) {
  //
  //     let sorted = _.orderBy(res, ['NameLast', 'NameFirst'], ['asc', 'asc']);
  //
  //     for(var i = 0; i < sorted.length; i++){
  //       var aPat = sorted[i];
  //       var lastFirst = aPat.NameLast + ", " + aPat.NameFirst;
  //
  //         let pat ={
  //           'id': aPat.PatientID,
  //           'name': lastFirst,
  //           'selected':false,
  //           'data': aPat
  //         }
  //
  //       self.searchResults.push(pat);
  //     }
  //
  //     self.helper.notySuccess(n, "search complete");
  //     n.close();
  //
  //   });
  // }


  getDateCall(date){
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let year = date.getFullYear();
    let hour = date.getHours();
    let mins = date.getMinutes().toString();
    if(mins.length==1){
      mins = "0" + mins;
    }
    let amPm = hour > 10 ? 'PM' : 'AM';

    let tHour = hour + 1;
    if(tHour > 12){
      let diff = tHour - 12;
      tHour = diff;
    }

    return `${month}/${day}/${year} ${tHour}:${mins} ${amPm}`;
  }

  addMessage(customMessage){
    let self = this;

    self.data.getWithUrl('phonecall', function(newPhone){
      //update all info...

      let aDate = new Date();

      newPhone.PatientID = self.selectedPatient.PatientID;
      newPhone.ProviderID =  self.providerId ? self.providerId : 0;
      newPhone.ExamDateTime = aDate;
      newPhone.DateCall = self.getDateCall(aDate);
      newPhone.OfficeStaff = self.currentUser.FirstName + ' ' + self.currentUser.LastName;
      newPhone.PatientMessage = customMessage ? customMessage.Description1 : null;
      newPhone.UserID = self.currentUser.UserID;
      newPhone.Charge = 1;
      newPhone.StaffResponse = '';

      let pRow = new PhoneCallRow(newPhone.DateCall, newPhone.PatientMessage, newPhone.OfficeStaff, newPhone);
      pRow.saveNeeded = true;
      pRow.index = self.messages.length;

      //self.messages.push(pRow);
      self.messages.splice(0, 0, pRow);

    });
  }

  saveAll(){
    let self = this;
    for(let i = 0; i < self.messages.length; i++){
      let aMsg = self.messages[i];
      if(aMsg.saveNeeded && aMsg.message != null){
        self._save(aMsg, function(res){

        });
      }
    }
  }

  _save(row, callback){
    let self = this;
    self.data.postWithUrlAndData('phonecalls', JSON.stringify(row.data), function(res){
      callback(res);
    });
  }

  rowSwipe(event, row) {
    // if (event.direction === 'left') {
    //   //display delete option...
    //   if(!row.displayDelete){
    //     row.displayDelete = true;
    //     this.displayDeleteHeader = true;
    //   }
    // }else if(event.direction === 'right') {
    //   //display delete option...
    //   if(row.displayDelete){
    //     row.displayDelete = false;
    //     this.displayDeleteHeader = false;
    //   }
    // }
  }

  displayDeleteAlert(text, header, callback) {
    let self = this;
    self.popupHelper.openGenericMessagePop(text, header, ['YES','NO'], false, function(res){
      callback(res);
    });
  }

  deletePhoneClick(index){
    let self = this;
    self.displayDeleteAlert("Do you wish to delete this message?", 'Delete Message?', function(res){
      if(res.result== 'YES'){
        let id = self.messages[index].data.PhoneCallID;
        if(id==0){
          self.messages.splice(index, 1);
          self.updateRowIndexes();
        }else{
          self.deletePhone(id, function(res){
            if(res == true){
              self.messages.splice(index, 1);
              self.updateRowIndexes();
            }
          })
        }
      }else{
        //reset row delete...
        self.messages[index].displayDelete = false;
      }
    });
  }

  deletePhone(id, callback){
    let self = this;
    let url = `phonecalls?id=${id}`;
    self.data.deleteWithUrl(url, function(res){
      callback(res);
    });
  }

  updateRowIndexes(){
    let self= this;
    for(let i = 0; i< self.messages.length; i++){
      let r = self.messages[i];
      r.index = i;
    }
    self.signaler.signal('refresh-row');
  }

}
