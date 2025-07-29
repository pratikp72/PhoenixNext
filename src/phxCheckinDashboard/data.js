/**
 * Created by montymccune on 10/15/18.
 */
import moment from 'moment';
import * as _ from 'lodash';
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject} from 'aurelia-framework';

class Column{
  constructor(name, visible, index, id, userId){
    this.Name = name;
    this.Visible = visible;
    this.ColumnIndex = index;
    this.Id = id != 0 ? id : 0;
    this.UserId = userId;
  }
}

//ff7600

class Row {
  constructor() {
    this.cells = [];
    this.checkinData;
    this.checkinTimerInterval;
    this.selected = false;
  }

  AddCell(c) {
    this.cells.push(c);
  }

  startCheckinTimer() {
    var self = this;
    self.checkinTimerInterval = setInterval(function () {

      //check for valid time
      if (self.checkinData.CheckinStartTime == null) {
        self.stopCheckinTimer();
        return;
      }


      var timeDiff = self.getCheckinTimeDuration(self.checkinData.CheckinStartTime, self.checkinData.CheckinEndTime)

      //get cell
      var checkinTimeCell = self.getCellByName('Progress');

      checkinTimeCell.value = timeDiff.formattedTime;

      //do alert icon if time > 12min TODO: make this a pref
      if (timeDiff.duration.hours() > 0 || timeDiff.duration.minutes() > 12) {
        var statusCell = self.getCellByName('Status');
        statusCell.image = 'fa fa-exclamation-triangle';
        statusCell.cssStyle = 'red';
      }

    }, 1000);
  }

  getCheckinTimeDuration(startTime, endTime){
    var now = endTime == null ? moment().local() : moment(endTime).local();
    var timeDiff = moment(startTime).local();
    var duration = moment.duration(now.diff(timeDiff));
    var final = moment().set({'hour': duration.hours(), 'minute': duration.minutes(), 'second': duration.seconds()});

    return{
      formattedTime: duration.hours() > 0 ? final.format("hh:mm:ss") : final.format("mm:ss"),
      duration: duration
    }
  }

  stopCheckinTimer() {
    clearInterval(this.checkinTimerInterval);
  }

  getCellByName(name) {
    return _.find(this.cells, ['name', name]);
  }

  setStatus(status) {
    var cell = this.getCellByName('Status');
    if (status.toUpperCase() == 'READY') {
      cell.image = 'fa fa-check fa-lg';
      cell.cssStyle = 'green';

      if(this.checkinTimerInterval){
        this.stopCheckinTimer();
      }

    } else if (status.toUpperCase()  == 'KIOSK') {
      cell.image = 'fa fa-tablet fa-lg';
      cell.cssStyle = 'blue';
    } else if (status.toUpperCase()  == 'PENDING') {
      cell.image = 'fa fa-ban fa-lg';
      cell.cssStyle = 'orange';
    } else {
      cell.image = 'fa fa-ban fa-lg';
      cell.cssStyle = 'orange';
    }
  }

  //updateScheduleStatus(s){
  //
  //  this.setStatus(s.Status);
  //
  //  var url = 'schedule';
  //  this.http.put(this.helper.getApiUrl(url), s, function (res) {
  //    callback(res);
  //  }, function (err) {
  //
  //    var e = err;
  //
  //  });
  //}
}

class Cell{
  constructor(name, value){
    this.value = value;
    this.cssStyle;
    this.visible = true;
    this.image;
    this.name = name;
  }
}

class Provider{
  constructor(name, id){
    this.name = name;
    this.id = id;
    this.selected = false;
  }
}

class CheckinData{
  constructor(date, time, patient, status){
    this.Date = date;
    this.Time = time;
    this.Patient = patient;
    this.Provider;
    this.Status = status;
    this.CheckinStartTime;
  }
}

@inject(helper,http)
export class Data {

  providers = [];

  constructor(helper, http){
    this.helper = helper;
    this.http = http;
  }

  updateScheduleStatus(s, row){

    var self = this;
    row.setStatus(s.Status);

    var getUrl = 'schedule/'+ s.ScheduleID;
    self.http.get(self.helper.getApiUrl(getUrl), function(sched){

      //update status
      //sched.Status = "Ready";
      //sched.CheckinEndTime = moment().format("MM-DD-YYYY hh:mm:ss a");

      var url = 'schedule';
      var obj={
        "PatientID": sched.PatientID,
        "ScheduleID": sched.ScheduleID,
        "Status": sched.Status,
        "StatusKiosk": s.Status,
        "CheckinEndTime": moment().format("MM-DD-YYYY hh:mm:ss a"),
        "Time": sched.Time,
        "Date": sched.Date,
        "Patient_Name": sched.Patient_Name,
        "Reason_for_Visit": sched.Reason_for_Visit,
        "Pod": sched.Pod,
        "Room": sched.Room,
        "ProviderID": sched.ProviderID,
        "Type": sched.Type,
        "UserID": sched.UserID,
        "StatusCache": sched.StatusCache,
        "HL7ID": sched.HL7ID,
        "PatientLocation": sched.PatientLocation,
        "GroupID": sched.GroupID,
        "EmailSent": sched.EmailSent,
        "HxComplete": sched.HxComplete,
        "CheckinStartTime": sched.CheckinStartTime
      }


      self.http.put(self.helper.getApiUrl(url), obj, function (res) {
        //callback(res);
      }, function (err) {

        var e = err;

      });


    });
  }

  updateUserColumns(cols, callback) {

    var url = "checkin";
    var tCols = {
      "Columns":[]
    }
    for(var i = 0; i < cols.length; i++){
      var aCol = cols[i];
      var c={
        "Name": aCol.Name,
        "Visible": aCol.Visible,
        "ColumnIndex": aCol.ColumnIndex,
        "Id": aCol.Id,
        "UserId": aCol.UserId
      }
      tCols.Columns.push(c);
    }

    this.http.post(this.helper.getApiUrl(url), tCols, function (res) {
      callback(res);
    }, function (err) {

      var e = err;

    });

  }



  getUserColumns(userId, callback){
    var url = "checkin/columns/user/" + userId;
    this.http.get(this.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  getCheckin(date, callback){
    var self = this;
    var url = "checkin/date/" + date;
    //var checkinData = [];
    self.http.get(self.helper.getApiUrl(url), function(json){
      //if (json.length > 0) {
      //
      //}
      callback(json);
    });
  }

  getProviders(date, callback){
    var self = this;
    self.providers = [];
    var url = "providers?date=" + date;
    self.http.get(self.helper.getApiUrl(url), function(json){
      for(var i = 0; i < json.length; i++){
        var p = new Provider(json[i].ProviderEntity, json[i].ProviderID);
        self.providers.push(p);
      }
      callback(self.providers);
    });
  }

  createRow(columns, rowData){

    //var statusTypes = ['ready', 'kiosk', 'pending'];
    //var statusIndex = Math.floor(Math.random() * statusTypes.length);
    //var status = statusTypes[statusIndex];

    var insProviders = ['BCBS', 'AETNA', 'Texas Health', 'Cigna'];
    var insIndex = Math.floor(Math.random() * insProviders.length);
    var insurance = insProviders[insIndex];

    var copays = ['$40.00', '$45.00', '$50.00', '$55.00', '$60.00', '$65.00', '$70.00', '$75.00', '$80.00'];
    var balances = ['$240.00', '$345.00', '$500.00', '$555.00', '$1000.00', '$400.00', '$650.00','$450.00','$1200.00','$2000.00'];
    var payments = ['1', '2', '3', '4', '5'];

    var runCheckinTimer = false;

    var row = new Row();
    row.checkinData = rowData;

    var cells = [];
    for(var i = 0; i < columns.length; i++){
      var aCol = columns[i];

      var cell = null;
      if(aCol.Name == "Name"){
        var patientName = rowData.Patient.NameLast + "," + rowData.Patient.NameFirst;
        cell = new Cell(aCol.Name, patientName);
      }else if(aCol.Name == "Date"){
        var tDate =  this.helper.getISODateToFormat(rowData.Date, "MM/DD/YY");
        cell = new Cell(aCol.Name, tDate);
      }else if(aCol.Name == "Time"){
        var tTime =  this.helper.getISODateToFormat(rowData.Time, 'h:mm a');
        cell = new Cell(aCol.Name, tTime);
      }else if(aCol.Name == "Provider"){
        var pro = _.find(this.providers, ['id', rowData.Provider.ProviderID]);
        cell = new Cell(aCol.Name, pro.name);
      }else if(aCol.Name == "Status"){
        cell = new Cell(aCol.Name, null);
        if(rowData.Status.toUpperCase() == 'READY'){
          cell.image = 'fa fa-check fa-lg';
          cell.cssStyle = 'green';
        }else if(rowData.Status.toUpperCase() == 'READYPORTAL'){
          cell.image = 'fa fa-check fa-lg';
          cell.cssStyle = 'blue';
        }else if(rowData.Status.toUpperCase() == 'KIOSK'){
          cell.image = 'fa fa-tablet fa-lg';
          cell.cssStyle = 'blue';
          runCheckinTimer = true;
        }else if(rowData.Status.toUpperCase() == 'PENDING'){
          cell.image = 'fa fa-ban fa-lg';
          cell.cssStyle = 'orange';
        }else{
          cell.image = 'fa fa-ban fa-lg';
          cell.cssStyle = 'orange';
        }
      }else if(aCol.Name == "Insurance"){
        //cell = new Cell(aCol.Name, insurance);
        cell = new Cell(aCol.Name, rowData.Insurance != null ? rowData.Insurance.Name : '');
      }else if(aCol.Name == "Copay"){
        //cell = new Cell(aCol.Name, copays[Math.floor(Math.random() * copays.length)]);
        cell = new Cell(aCol.Name, "$" + rowData.Copay);
      }else if(aCol.Name == "Balance"){
        //cell = new Cell(aCol.Name, balances[Math.floor(Math.random() * balances.length)]);
        cell = new Cell(aCol.Name, "$" + rowData.Balance);
      }else if(aCol.Name == "DOB"){
        cell = new Cell(aCol.Name, rowData.Patient.DOB);
      }else if(aCol.Name == "Age"){
        var now = moment();
        var age =now.diff(rowData.Patient.DOB, 'years');
        cell = new Cell(aCol.Name, age);
      }else if(aCol.Name == "Progress") {
        var progressTime = "";
        if(rowData.CheckinStartTime != null && rowData.CheckinEndTime != null){
          progressTime = row.getCheckinTimeDuration(rowData.CheckinStartTime, rowData.CheckinEndTime);
        }
        cell = new Cell(aCol.Name, progressTime.formattedTime);
      }else if(aCol.Name == "Payments"){
        //cell = new Cell(aCol.Name, payments[Math.floor(Math.random() * payments.length)]);
        cell = new Cell(aCol.Name, "$" + rowData.Payments);
      }

      if(cell != null){
        cell.visible = aCol.Visible;
        row.AddCell(cell);
      }
    }


    //start checkin time interval
    if(runCheckinTimer)
      row.startCheckinTimer();


    return row;
  }


  getColumns(userId, callback){

    var self = this;

    self.getUserColumns(userId, function(res){

      var cols =[];

      if(res.length > 0){
        //load w/ user columns
        cols = res;
      }else{
        //load default
        var col1 = new Column("Name", true, 2, 0, userId);
        var col2 = new Column("Date", true, 1, 0, userId);
        var col3 = new Column("Time", true, 0, 0, userId);
        var col4 = new Column("Provider", true, 3, 0, userId);
        var col5 = new Column("Status", true, 4, 0, userId);
        var col6 = new Column("Insurance", false, 5, 0, userId);
        var col7 = new Column("Copay", false, 6, 0, userId);
        var col8 = new Column("Balance", false, 7, 0, userId);
        var col9 = new Column("DOB", false, 8, 0, userId);
        var col10 = new Column("Age", false, 9, 0, userId);
        var col11 = new Column("Progress", true, 10, 0, userId);
        var col12 = new Column("Payments", true, 11, 0, userId);
        cols.push(col1);
        cols.push(col2);
        cols.push(col3);
        cols.push(col4);
        cols.push(col5);
        cols.push(col6);
        cols.push(col7);
        cols.push(col8);
        cols.push(col9);
        cols.push(col10);
        cols.push(col11);
        cols.push(col12);
      }

      cols = _.orderBy(cols, ['ColumnIndex'], ['asc']);
      callback(cols);

    });
  }

  //createProviders(callback){
  //  for(var i = 0; i < 6; i++){
  //    var p = new Provider(this.randomName(), i);
  //    this.providers.push(p);
  //  }
  //  callback(this.providers);
  //}


}
