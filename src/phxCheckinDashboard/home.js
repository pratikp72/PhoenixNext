/**
 * Created by montymccune on 10/15/18.
 */
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Data} from './data';
import * as _ from 'lodash';
import moment from 'moment';

@inject(helper,http, Data)
export class Home {

  columns=[];
  rows = [];
  filteredRows = [];
  sidebarVisible = false;
  isDragging = false;
  itemToDrag = null;
  selectedProvider = null;
  providers = [];

  @bindable datepicker;
  selectedDate;
  refreshInterval;
  tableHeight;
  nearestRowIndex=0;
  gridColumnCss;
  dropdownMaxHeight=200;

  dialogController=null;
  displayCloseButton=false;


  constructor(helper, http, Data){
    this.helper = helper;
    this.http = http;
    this.data = Data;
  }

  closeWithDialog(){
    this.dialogController.cancel();
  }

  toggleSidebar(){
    this.sidebarVisible = this.sidebarVisible ? false : true;
  }

  drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
  }

  drop(i, ev) {

    var self = this;
    this.isDragging = false;
    ev.preventDefault();

    var dropIndex = i.c.ColumnIndex;

    var dragIndex = this.itemToDrag.ColumnIndex;

    //do drop here
    //remove from columns
    var tItmAr = this.columns.splice(dragIndex, 1);
    var tItm = tItmAr[0];

    //add itemToDrag to its new position
    this.columns.splice(dropIndex, 0, tItm);

    for(var i = 0; i < this.columns.length; i++){
      //update indexes
      var c = this.columns[i];
      c.ColumnIndex = i;
    }

    var tCols = _.orderBy(this.columns, ['ColumnIndex'], ['asc']);
    this.columns = tCols;

    //now rows
    for(var r = 0; r < this.rows.length; r++){
      var row = this.rows[r];

      var cellAr = row.cells.splice(dragIndex, 1);
      var cellToMove = cellAr[0];
      row.cells.splice(dropIndex, 0, cellToMove);
    }

    this.itemToDrag = null;

    this.data.updateUserColumns(this.columns, function(res){
      self.columns = res;

      self.gridColumnCss = self.calculateGridColumnCss(res);
    });

  }

  calculateGridColumnCss(cols){
    var css='';
    for(var i = 0; i < cols.length; i++){
      if(cols[i].Visible){
        css+= '1fr ';
      }
    }
    return css.trim();
  }

  allowDrop(i, ev) {

    if(!this.isDragging){
      //get itemToDrag
      this.itemToDrag = i.c;
    }

    this.isDragging = true;
    ev.preventDefault();
    console.log(i.c.index);
  }

  activate(params) {

    var self = this;

    if(typeof this.helper.jwt() === 'undefined' ||
      this.helper.jwt() == null){

      //if we find an API key in the query string
      //we need to re-authenticate to make sure it is still valid
      if (params.hasOwnProperty("jwt")){
        this.helper.processToken(params.jwt);
      }
    }
    else{
      //if we already have the apiKey we dont need to authenticate
      //mustAuthenticate = false;
    }

    if(params.hasOwnProperty("dialog")){
      this.dialogController = params.dialog;
      this.displayCloseButton = true;
    }

    if (params.hasOwnProperty("userid")){
      //this.helper.processToken(params.jwt);

      var userid = params.userid;
    }

    if (params.hasOwnProperty("date")) {
      self.selectedDate = self.helper.getDateWithFormat(params.date, 'MM-DD-YYYY');//{moment(params.date);
    }
    var aDate = self.selectedDate;//.format("MM-DD-YYYY");


    self.data.getProviders(aDate, function(res){
      self.providers = res;
    });

    //self.data.getColumns(self.helper._user.UserID, function(res){
    //  self.columns = res;
    //  self.loadGrid(aDate);
    //});

    self.refreshInterval = window.setInterval(function(){
      self.refreshGrid(self);
    }, 30000);

    window.onresize = function(event) {
      self.calculateTableHeight();
    };

  }

  resizeProviderDropdown(){
      var navHeight = this.navbar.clientHeight;
      var windowHeight = window.innerHeight;
      this.dropdownMaxHeight = windowHeight - navHeight - 20;//a little padding
  }


  attached(){

    var self = this;

    self.resizeProviderDropdown();

    var aDate = self.selectedDate;//.format("MM-DD-YYYY");
    self.data.getColumns(self.helper._user.UserID, function(res){
      self.columns = res;

      self.gridColumnCss = self.calculateGridColumnCss(res);

      self.loadGrid(aDate);
    });


    self.calculateTableHeight();
    //this.scrollToRow();
  }

  detached(){
    window.clearInterval(this.refreshInterval);
  }


   refreshGrid(self){
    self.loadGrid();
  }

  loadGrid(date, reload){

    if(date === undefined){
      date = this.helper.getDateWithFormat(this.selectedDate, "MM-DD-YYYY");
    }

    var self = this;

    if(reload)
      self.rows = [];

    var currentMinutesFromNow = null;

    this.data.getCheckin(date, function(data){

      self.nearestRowIndex = 0;


      for(var i = 0; i < data.length; i++){

        //does this patient row exist??
        var patId = data[i].Patient.PatientID;
        var aRow = self.doesPatientRowExist(patId);
        if(aRow){
          //check status??
          if(aRow.checkinTimerInterval){
            //if the timer has been running...
            //check the status for change
            if(data[i].Status.toUpperCase() != "KIOSK"){
              //stop timer if status has changed from kiosk
              aRow.stopCheckinTimer();
              aRow.setStatus(data[i].Status);
            }
          }else{
            //check if we need to start checkin timer
            if(data[i].Status.toUpperCase() == "KIOSK"){
              //update row data
              aRow.checkinData.Status = data[i].Status;
              aRow.checkinData.CheckinStartTime = data[i].CheckinStartTime;
              //start timer if status has changed to kiosk
              aRow.startCheckinTimer();
              aRow.setStatus(data[i].Status);

            }
          }
          self.rows[i] = aRow;
        }else{
          aRow = self.data.createRow(self.columns, data[i]);
          self.rows.push(aRow);
        }

        //determine row with closest time to now
        var schedTime = moment(aRow.checkinData.Time);
        var now = moment();
        var minsFromNow = Math.abs(now.diff(schedTime, 'minutes'));
        if(currentMinutesFromNow == null ||
        minsFromNow < currentMinutesFromNow){
          currentMinutesFromNow = minsFromNow;
          self.nearestRowIndex = i;
        }
      }

      //select row by nearestRowIndex
      self.deselectAllRows(self.rows);
      if(self.rows.length > 0)
        self.rows[self.nearestRowIndex].selected = true;


      self.filterByProvider();

      //self.filteredRows = self.rows;

      //if(callback){
      //  callback();
      //}

      //self.scrollToRow();

    });
  }

  deselectAllRows(rows){
    for(var i = 0; i < rows.length; i++){
      rows[i].selected = false;
    }
  }

  doesPatientRowExist(patientId){
    return _.find(this.rows, ['checkinData.Patient.PatientID', patientId]);
  }

  showPicker(){
    this.datepicker.methods.show();
  }

  statusIconClick(e, row, cell){
    if(row.checkinData.Status.toUpperCase() == 'KIOSK' &&
    cell.image == 'fa fa-exclamation-triangle'){
      //if the status is in ALERT mode,
      //update status to stop timer

      var schedule = row.checkinData.Schedule;
      schedule.Status = 'Ready';
      this.data.updateScheduleStatus(schedule, row);

    }
  }

  updateDisplayedRowCells(){

    var self = this;

    for(var i = 0; i < self.columns.length; i++){
      var c = self.columns[i];
      for(var r = 0; r < self.rows.length; r++){
        var row = self.rows[r];
        row.cells[i].visible = c.Visible;
      }
    }

    self.data.updateUserColumns(self.columns, function(res){
      self.columns = res;
    });

  }

  dateChanged(e){

    var self = this;
    var aDate = e.date.format("MM-DD-YYYY");
    self.data.getProviders(aDate, function(res){
      self.providers = res;
      self.resizeProviderDropdown();
      self.loadGrid(aDate, true);
    });
  }

  datepickerChanged() {
    this.datepicker.events.onChange = (e) => this.dateChanged(e);

    //this.datepicker.options.keepOpen(true);

  }

  calculateTableHeight(){
    var tNavbar = this.navbar;
    var windowHeight = document.documentElement.clientHeight;
    this.tableHeight = windowHeight - tNavbar.clientHeight;
  }

  scrollToRow(isLast){
    if(isLast){
      if(this.filteredRows.length > 0){
        // Get row index from link href
        var rowId = this.nearestRowIndex;
        // Get row position by index
        var tb = $('#myTable');

        var ypos = $('#myTable tr:eq('+rowId+')').offset().top;
        // Go to row
        $('.tableFixHead').animate({
          scrollTop: $('.tableFixHead').scrollTop()+ypos
        }, 500);
      }
    }
  }

  scrollToGridDiv(isLast){
    if(isLast){
      if(this.filteredRows.length > 0){
        // Get row index from link href
        var rowId = this.nearestRowIndex;
        // Get row position by index
        var tb = $('#tableGrid');

        var tblGridDiv = $('#outerTableGrid div:eq('+rowId+')');
        var off = tblGridDiv.offset();

        var ypos = $('#outerTableGrid div:eq('+rowId+')').offset().top;
        // Go to row
        $('#outerTableGrid').animate({
          scrollTop: $('#outerTableGrid').scrollTop()+ypos
        }, 500);
      }
    }
  }


  filterByProvider(){
    this.filteredRows = [];
    var currentMinutesFromNow= null;
    this.nearestRowIndex = 0;


    var selectedProviders = _.filter(this.providers, { 'selected': true });
    if(selectedProviders.length == 0){
      this.filteredRows = this.rows;
    }else{

      var tNearestRowIndex = -1;

      for(var fPro = 0; fPro < selectedProviders.length; fPro++){
        var tFpro = selectedProviders[fPro];

        for(var i = 0; i < this.rows.length; i++){
          var r = this.rows[i];
          for(var c = 0; c < r.cells.length; c++){
            var cell = r.cells[c];
            if(cell.name == 'Provider' && cell.value == tFpro.name){

              //determine row with closest time to now
              var schedTime = moment(r.checkinData.Time);
              var now = moment();
              var minsFromNow = Math.abs(now.diff(schedTime, 'minutes'));
              if(currentMinutesFromNow == null ||
                minsFromNow < currentMinutesFromNow){
                currentMinutesFromNow = minsFromNow;
                tNearestRowIndex++;
                this.nearestRowIndex = tNearestRowIndex;
              }

              this.filteredRows.push(r);
            }
          }
        }
      }
      this.filteredRows = _.orderBy(this.filteredRows, ['checkinData.Time'], ['asc']);

      this.deselectAllRows(this.filteredRows);
      if(this.filteredRows.length > 0)
        this.filteredRows[this.nearestRowIndex].selected = true;

    }
  }

}
