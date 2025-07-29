import {helper} from '../helpers/helper';
import {inject, computedFrom, bindable, observable} from 'aurelia-framework';
import {DialogController} from 'aurelia-dialog';
import * as calHelper from './calendarHelper';
import { PopupHelper } from './popupHelper';
import { Data } from '../data/go/data';




@inject(helper, DialogController, PopupHelper, Data)//,http, Data, Home )
export class SchedulePopup {


  slot=null;
  appointment=null;
  home = null;
  locations=[];

  selectedLocation;

  selectedProvider;
  providers=[];

  reasonForVisit=null;

  date=null;

  patientName=null;
  patientId=null;

  status=null;
  appointmentCreated=false;
  editable=false;

  @bindable datepicker;

  @observable scheduleDate;
  scheduleDateChanged(newVal, oldVal){
    //if(this.appointment.schedule){
      if(this.datepicker){
        var dt = this.datepicker.methods.viewDate();
        this.date= dt.format("MM/DD/YYYY");
      }
      // var dt = this.datepicker.date;
      // this.slot.schedule.Date = calHelper.getStringDate(newVal.getFullYear(), newVal.getMonth(), newVal.getDate());
    //}
  }

  timeList=[];

  @observable startTime;
  startTimeChanged(newVal, oldVal){
    if(newVal==null)return;
      //change end time...
      this.endTime = this.getNextTimeInList(newVal.time);
    //}
  }
  endTime;

  constructor(helper, DialogController, PopupHelper, Data){//, http, Data, Home) {
    this.helper = helper;
    this.dialogController = DialogController;
    this.popupHelper = PopupHelper;
    this.data = Data;
  }

  activate(params) {

    this.slot = params.slot;
    this.editable = params.editable;

    this.createTimelist();

    this.home = params.home;
    this.appointment = params.apt;
    this.providers = params.home.providers;
    if(params.apt && params.apt.schedule && params.apt.schedule.ProviderID){
      var foundPro = _.find(this.providers, function(l){return l.ProviderID == params.apt.schedule.ProviderID});
      if(foundPro){
        this.selectedProvider = foundPro;
      }
    }else{
      this.selectedProvider = params.home.currentProvider;
    }

    this.locations = params.locations;
    if(params.apt && params.apt.schedule && params.apt.schedule.PatientLocation){
      var foundLoc = _.find(this.locations, function(l){return l.LocationName == params.apt.schedule.PatientLocation});
      if(foundLoc){
        this.selectedLocation =foundLoc;
      }
    }else{
      this.selectedLocation =params.currentLocation;
    }

    this.scheduleDate = params.slotDate;
    this.startTime = this.appointment.schedule ? this.getTimeInList(this.appointment.schedule.Time) : null;
    this.reasonForVisit = this.appointment.schedule ? this.appointment.schedule.Reason_for_Visit : null;
    this.date = this.appointment.schedule ? this.appointment.schedule.Date : calHelper.getStringDate(this.scheduleDate.getFullYear(), this.scheduleDate.getMonth(), this.scheduleDate.getDate());
    this.patientName = this.appointment.schedule ? this.appointment.schedule.Patient_Name : null;
    this.patientId = this.appointment.schedule ? this.appointment.schedule.PatientID : null;
    this.status =this.appointment.schedule ? this.appointment.schedule.Status : null;

    //find next time...
    if(this.startTime == null){
      //no start time...pick nearest time to now...
      this.startTime = params.slotTime;
    }

  }

  setStatus(status){
    this.status = status;
  }

  get statusStyle(){
    if(this.status == 'Ready'){
      return 'alert alert-success';
    }else if(this.status == 'Waiting'){
      return 'alert alert-primary';
    }else if(this.status == 'Next'){
      return 'alert alert-danger';
    }else if(this.status == 'Not Arrived' || this.status == null || this.status.length == 0){
      return 'alert alert-dark';
    }
  }

  getNextTimeInList(time){
    for(var t = 0; t < this.timeList.length; t++){
      if(this.timeList[t].time== time){
        //pick following time...
        if(t + 1 < this.timeList.length){
          return this.timeList[t + 1];
        }
      }
    }
  }

  getTimeInList(time){
    return _.find(this.timeList, function(t){return t.time == time});
  }

  createTimelist(){

    var availTimes = this.slot.calDay.getAvailableSlots();

    this.timeList = availTimes;
  }

  attached(){

  }

  updateSchedule(callback){
    let self = this;

    var schedObj={
      "Time": self.startTime.time,
      "EndTime": self.endTime.time,
      "PatientLocation": self.selectedLocation ? self.selectedLocation.LocationName : null,
      "Reason_for_Visit": self.reasonForVisit,
      "ProviderID": self.selectedProvider ? self.selectedProvider.ProviderID : null,
      "Date": self.date,
      "Patient_Name": self.patientName,
      "PatientID": self.patientId,
      "Status": self.status,
      "Type":"Office"
    }

    if(self.appointment.schedule == null){
      //create new schedule object...
      self.appointment.schedule = schedObj;
    }else{
      //update schedule object...
      // self.slot.schedule.Patient_Name = pat.NameFirst + " "+ pat.NameLast;
      // self.slot.schedule.PatientID = pat.PatientID;
      self.appointment.schedule.Time = self.startTime.time;
      self.appointment.schedule.EndTime = self.endTime.time;
      self.appointment.schedule.PatientLocation = self.selectedLocation ? self.selectedLocation.LocationName : null;
      self.appointment.schedule.Reason_for_Visit = self.reasonForVisit;
      self.appointment.schedule.ProviderID = self.selectedProvider ? self.selectedProvider.ProviderID : null;
      self.appointment.schedule.Date = self.date;
      self.appointment.schedule.Patient_Name = self.patientName;
      self.appointment.schedule.PatientID = self.patientId;
      self.appointment.schedule.Status = self.status;
    }

    //create noty alert...
    let saveDescription = `Saving schedule for ${self.patientName}...`;
    let saveDialog = self.helper.createNoty(saveDescription, 3000);
    saveDialog.show();

    var url='schedule';
    //save to db...
    if(self.appointment.schedule.ScheduleID == undefined){
      //new...
      self.data.postWithUrlAndData(url, JSON.stringify(self.appointment.schedule), function(res){
        self.appointment.schedule.ScheduleID = res.ScheduleID;
        saveDialog.close();
        self.appointmentCreated = true;
        callback();
      });
    }else{
      //update...
      self.data.putWithUrlAndData(url, self.appointment.schedule, function(res){
        saveDialog.close();
        callback();
      });
    }
  }

  save(){
    let self = this;
    self.updateSchedule(function(){
      self.dialogController.close(true, {"appointment": self.appointment, "appointmentCreated": self.appointmentCreated});
    });
  }

  cancel(){
    this.dialogController.cancel();
  }

  openPatientSearch(){
    let self = this;
    self.popupHelper.openPatientPop(false, true, function(pat){

      if(pat.createPatient){
        //open patientDetails...
        self.home.createPatient(function(newPatient){
          self.patientName = newPatient.NameFirst + " "+ newPatient.NameLast;
          self.patientId = newPatient.PatientID;
        });
      }else{
        self.patientName = pat.NameFirst + " "+ pat.NameLast;
        self.patientId = pat.PatientID;
      }
    });
  }



}
