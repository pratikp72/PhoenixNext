import {helper} from '../helpers/helper';
import {inject, computedFrom} from 'aurelia-framework';
import {DialogController} from 'aurelia-dialog';
import {Data} from '../data/go/data';
import moment from 'moment';
import * as _ from 'lodash';
import * as calHelper from './calendarHelper';
import { PopupHelper } from './popupHelper';
import {Globals} from './globals';

class appointment{
  constructor(schedule){
    this.schedule = schedule;
    this.width=0;
    this.height=0;
    this.top=0;
    this.left=0;
    this.index=0;
    this.class=this.getClassWithStatus(schedule.Status);
  }

  getClassWithStatus(status){
    if(status == 'Ready'){
      return 'alert alert-success';
    }else if(status == 'Waiting'){
      return 'alert alert-primary';
    }else if(status == 'Next'){
      return 'alert alert-danger';
    }else if(status == 'Not Arrived' || status == null || status.length == 0){
      return 'alert alert-dark';
    }
  }
}

class calDay{

  dayNames=["SUN", "MON", 'TUE', "WED", 'THU', "FRI", "SAT"];

  constructor(number, date, strClass, dateObj){
    this.number = number;
    this.date = date;
    this.dateObj = dateObj;
    this.name = this.dayNames[dateObj.getDay()];
    this.class = strClass;
    this.timeSlots=[];
    this.setupTimeslots(dateObj);
    this.index=0;
    this.display=true;
    this.providersAndScheduleCount=[];
  }

  addProviderAndScheduleCountWithSchedule(schedule){
    //find providerScheduleCount...
    var found = _.find(this.providersAndScheduleCount, function(p){return p.providerId == schedule.ProviderID});
    if(found){
      //add to count...
      var count = found.count;
      count++;
      found.count = count;
    }else{
      //add new...
      var providers = calHelper.getProviderList();
      var prov = _.find(providers, function(p){return p.ProviderID == schedule.ProviderID});
      if(prov){
        var obj={'providerName': prov.NameLast, 'providerId': schedule.ProviderID, 'count': 1};
        this.providersAndScheduleCount.push(obj);
      }
    }
  }

  addScheduleToSlot(schedule){
    var foundSlot =_.find(this.timeSlots, function(t){return t.time == schedule.Time});
    if(foundSlot){

      var newApt = foundSlot.getNewAppointment(schedule);
      foundSlot.appointments.push(newApt);
      this.addProviderAndScheduleCountWithSchedule(schedule);
    }
  }

  removeScheduleFromSlot(time, scheduleId){
    var foundSlot =_.find(this.timeSlots, function(t){return t.time == time});
    if(foundSlot){
      //appointments.schedule.ScheduleID...
      let schedIndex = _.findIndex(foundSlot.appointments, function(a){return a.schedule && a.schedule.ScheduleID == scheduleId});
      if(schedIndex > -1){
        foundSlot.appointments.splice(schedIndex, 1);
      }

      //foundSlot.schedule = null;
    }
  }

  getAvailableSlots(){
    var avails=[];
    for(let i = 0; i < this.timeSlots.length; i++){
      avails.push({'time': this.timeSlots[i].time, 'disabled': this.timeSlots[i].appointments.length == 0 ? false : true});
    }
    return avails;
  }

  setupTimeslots(date){
    this.timeSlots=[];
    //this.hourSubdivisions = 4;
    var startHour = calHelper.getWeekDayStartTime().getHours();//8;
    var endHour = calHelper.getWeekDayEndTime().getHours();//17;

    var totalHours = (endHour - startHour) + 1;
    var totalDaySlots = totalHours * (60/ calHelper.getTimeSlotIncrementInMinutes());//this.hourSubdivisions;

    var weekStartDayTime = calHelper.getWeekDayStartTime();
    var startDayTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), weekStartDayTime.getHours(), weekStartDayTime.getMinutes());

    for(var i = 0; i < totalDaySlots; i++){
      var slotIncrimentMins = calHelper.getTimeSlotIncrementInMinutes();//60 / this.hourSubdivisions;
      var minsToAdd = i * slotIncrimentMins;
      var slotDate = calHelper.addMinutesToDate(startDayTime, minsToAdd);
      // var slotDate = calHelper.addMinutesToDate(this.startOfDayTime, minsToAdd);
      var aSlot = new timeSlot(slotDate, calHelper.getStringTime(slotDate), this);
      this.timeSlots.push(aSlot);
    }
  }
}

class timeSlot{
  constructor(date, time, calDay){
    this.time=time;
    this.date = date;
    this.appointments=[];
    this.topOfHour = this.date.getMinutes() == 0 ? true : false;
    this.timeline=false;
    this.calDay = calDay;
  }

  getNewAppointment(schedule){

    //get index...
    // var index = this.appointments.length - 1;
    // index = index < 0 ? 0 : index;

    var newApt = new appointment(schedule);
    newApt.index = this.appointments.length;

    //width
    // var width = calHelper.getWeekContainerWith() / calHelper.getNumberOfDaysInWeek();
    var width = calHelper.getWeekContainerWith() / calHelper.getDaysInWeekIndex().length;
    width = this.appointments.length > 0 ? (width / (this.appointments.length + 1)) : width;
    // this.updateAppointmentWidths(width);
    //height
    var startDate = this.date;
    var endTime = 15;
    var endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes() + endTime);
    if(schedule.EndTime){
      //remove am/pm...
      var timeStr = schedule.EndTime.replace("AM", "");
      var isPm = timeStr.includes("PM");
      timeStr = timeStr.replace("PM", "");
      timeStr = timeStr.trimEnd();
      var timeSplit = timeStr.split(':');
      var finalHour = parseInt(timeSplit[0]);
      if(isPm && finalHour < 12){
        finalHour = 12 + finalHour;
      }
      endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), finalHour, timeSplit[1]);
    }
    // var endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes() + endTime);
    var diffMins = Math.abs(startDate - endDate) / 60000;
    var slotSegments = diffMins / calHelper.getTimeSlotIncrementInMinutes();
    var height = slotSegments * calHelper.getTimeslotHeight();
    //top
    var weekdayStartHour = calHelper.getWeekDayStartTime().getHours();
    var weekdayStartMinutes = calHelper.getWeekDayStartTime().getMinutes();
    var currentDayStartTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), weekdayStartHour, weekdayStartMinutes);
    var dayStartDiffMins = Math.abs(currentDayStartTime - startDate) / 60000;
    var segmentsToTop = (dayStartDiffMins / calHelper.getTimeSlotIncrementInMinutes()) * calHelper.getTimeslotHeight();
    //left
    //column index * columnWidth + apptWidth * aptIndex...
    var dayIndex = this.calDay.index;
    // var colWidth = calHelper.getWeekContainerWith() / calHelper.getNumberOfDaysInWeek();
    var colWidth = calHelper.getWeekContainerWith() / calHelper.getDaysInWeekIndex().length;
    var colLeft = dayIndex * colWidth;
    var left = (dayIndex * colWidth) + (width * newApt.index);


    //set appt values...
    newApt.height = height;
    newApt.width = width;
    newApt.top = segmentsToTop;
    newApt.left = left;

    this.updateAppointmentsWidthAndColumnLeft(width, colLeft);

    return newApt;
  }

  updateAppointmentsWidthAndColumnLeft(width, columnLeft){
    for(let i = 0; i < this.appointments.length; i++){
      this.appointments[i].width = width;
      this.appointments[i].left = columnLeft  + (width * i);
    }
  }
}

@inject(helper, DialogController, Data, PopupHelper, Globals)
export class Calendar {

  home = null;
  locations=[];
  currentLocation=null;

  currentProvider=null;

  date;
  year;
  month;
  days;
  currentDays=[];
  currentDate = "";
  
  dayBlockHeight=100;
  calendarDaysClientHeight =750;
  calendarWeeks;
  calendarContainerWidth;

  currentView='month';

  //week concepts...
  startOfDayTime;
  endOfDayTime;
  weekTimeDescriptions=[];
  numberOfDaysInWeek=5;//7
  indexOfDaysInWeek=[1, 2, 3, 4, 5];
  weekStartDate;//date to use for displaying weeks
  timeslotHeightPixels = 24;
  dayColumnWidth;

  setup=true;
  timeSlotIncrementMinutes=15;

  timelineTopOffset=0;

  canAddAppointment=false;
  
  // Array of month names
  months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];


  constructor(helper, DialogController, Data, PopupHelper, Globals){
    this.helper = helper;
    this.dialogController = DialogController;
    this.data = Data;
    this.popupHelper = PopupHelper;
    this.globals = Globals;
  }

  activate(params) {

    let self = this;

    self.home = params.home;

    self.canAddAppointment = this.globals.admin.HL7Enabled ? false : true;

    self.currentProvider = params.home.currentProvider;

    self.locations = params.locations;
    self.currentLocation = params.currentLocation;

    self.date = new Date();
    self.year = self.date.getFullYear();
    self.month = self.date.getMonth();
    self.days = [];

    calHelper.setDaysInWeekIndex(this.indexOfDaysInWeek);
    calHelper.setTimeSlotIncrementInMinutes(this.timeSlotIncrementMinutes);
    self.startOfDayTime  = new Date(self.date.getFullYear(), self.date.getMonth(), self.date.getDate(), 8, 0);//8am
    self.endOfDayTime = new Date(self.date.getFullYear(), self.date.getMonth(), self.date.getDate(), 17, 0);//5pm
    calHelper.setWeekDayStartTime(self.startOfDayTime);
    calHelper.setWeekDayEndTime(self.endOfDayTime);
    calHelper.setTimeslotHeight(self.timeslotHeightPixels);
    calHelper.setProviderList(params.home.providers);

    this.dayColumnWidth = calHelper.getWeekContainerWith() / calHelper.getDaysInWeekIndex().length;

    self.switchView("week");

    self.updateCalendar();

  }

  providerSelected(){
    this.updateCalendar();
  }

  setSelectedProviderWithId(providerId){
    for(var i = 0; i < this.home.providers.length; i++){
      if(this.home.providers[i].ProviderID == providerId){
        this.currentProvider = this.home.providers[i];
        break;
      }
    }
  }

  switchView(view){
    this.currentView=view;
  }

  setupWeekViewDetails(date){
    this.weekTimeDescriptions=[];
    //this.hourSubdivisions = 4;
    // var startHour = 8;
    // var endHour = 17;
    var startHour = calHelper.getWeekDayStartTime().getHours();// this.startOfDayTime.getHours();
    var endHour = calHelper.getWeekDayEndTime().getHours();// this.endOfDayTime.getHours();

    var totalHours = (endHour - startHour) + 1;
    var totalDaySlots = totalHours * (60 / calHelper.getTimeSlotIncrementInMinutes());

    for(var i = 0; i < totalDaySlots; i++){
      var slotIncrimentMins = calHelper.getTimeSlotIncrementInMinutes();//60 / this.hourSubdivisions;
      var minsToAdd = i * slotIncrimentMins;
      var slotDate = calHelper.addMinutesToDate(calHelper.getWeekDayStartTime(), minsToAdd);
      var hour = slotDate.getHours();
      var amPm = hour > 12 ? 'PM' : 'AM';
      hour = hour > 12 ? hour - 12 : hour;
      var mins = slotDate.getMinutes();
      var isHour = mins == 0 ? true : false;
      this.weekTimeDescriptions.push({"time": isHour ? hour + " " + amPm : ":" + mins, "class": isHour ? "time-description-hour": "time-description-min"});
    }
  }

  getWeekStartDateFromDate(date){
    var day = date.getDay();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
  }

  getWeekFromDate(date){
    let self = this;
    var week=[];

    var startOfWeekDate = self.getWeekStartDateFromDate(date);
    var dateToFind = calHelper.getStringDate(startOfWeekDate.getFullYear(), startOfWeekDate.getMonth(), startOfWeekDate.getDate());
    var dayIndex = _.findIndex(self.days, function(d){return d.date == dateToFind});

    //var daysInWeek = calHelper.getNumberOfDaysInWeek();
    for(var i = 0; i < 7; i++){
      var dayToAdd = self.days[dayIndex + i];
      //is this day to be displayed??? 
      //is it in the daysInWeek list???
      var found = _.findIndex(calHelper.getDaysInWeekIndex(), function(d){return d == dayToAdd.dateObj.getDay()});
      if(found > -1){
        dayToAdd.index = found;//index in daysOfWeek array...
        week.push(dayToAdd);
      }
    }

    self.currentDays = week;
  }

  updateTimeline(){
    let self = this;
    //for checking time...
    var now = new Date();
    //round to previous time slot...
    var mins = now.getMinutes();
    var diff = mins % 15;
    mins = mins - diff;
    var timeToCheck = calHelper.getStringTime(new Date(now.getFullYear(), now.getMonth(), now.getDate(),  now.getHours(), mins));
    var calDate = calHelper.getStringDate(now.getFullYear(), now.getMonth(), now.getDate());
    var foundDate = _.find(self.currentDays, function(d){return d.date == calDate});
    if(foundDate){
      var slotIndex = _.findIndex(foundDate.timeSlots, function(s){return s.time == timeToCheck});
      // var slot = _.find(foundDate.timeSlots, function(s){return s.time == timeToCheck});
      if(slotIndex < 0)return;
      var slot = foundDate.timeSlots[slotIndex];
      if(slot){
        //diff in minutes from current time...
        var now = new Date();
        var minsDiff = now.getMinutes() - slot.date.getMinutes();
        var slotMinutes = calHelper.getTimeSlotIncrementInMinutes();
        var slotHeightPixels =calHelper.getTimeslotHeight();
        var minutePixelHeight = slotHeightPixels / slotMinutes;
        var timelineTopOffset = minsDiff * minutePixelHeight;
        var topOfSlot = slotHeightPixels * slotIndex;
        topOfSlot += timelineTopOffset;
        //slot.timeline = true;
        this.timelineTopOffset = topOfSlot;
      }
    }
  }

  attached(){
    calHelper.setWeekContainerWith(this.weekContainer.clientWidth);
    this.calendarContainerWidth = this.calContainer.clientWidth;    
  }



  getCalendarWithProviderAndDateRange(providerId, start, end){
    let self = this;
    var url = 'schedule/range?';
    var dateQueryString = `start=${moment(start).format("MM-DD-YYYY")}&end=${moment(end).format("MM-DD-YYYY")}`;
    if(providerId==null){
      url += dateQueryString;
    }else{
      url += `providerId=${providerId}&` + dateQueryString; 
    }
    self.data.getWithUrl(url, function(res){
      var grouped =  _.groupBy(res, "Date")
      var keys = Object.keys(grouped);

      for(var i = 0; i < keys.length; i++){
        var date = keys[i];
        var schedule = grouped[date];
        //find the calDay for date...
        var foundDay = _.find(self.days, function(d){return d.date == date});
        if(foundDay){
          for(var s = 0; s < schedule.length; s++){
            var aSched = schedule[s];
            aSched.Time = self.helper.utcDateToTimeString(aSched.Time);
            foundDay.addScheduleToSlot(aSched);
          }
        }
      }
    });
  }

  
  // Function to generate the calendar
  updateCalendar(){
  
    let self = this;
    // Get the first day of the month
    let dayone = new Date(self.year, self.month, 1).getDay();
  
    // Get the last date of the month
    let lastdate = new Date(self.year, self.month + 1, 0).getDate();
  
    // Get the day of the last date of the month
    let dayend = new Date(self.year, self.month, lastdate).getDay();
  
    // Get the last date of the previous month
    let monthlastdate = new Date(self.year, self.month, 0).getDate();
  
    let lit = [];//list objects
  
    // Loop to add the last dates of the previous month
    for (let i = dayone; i > 0; i--) {
      var mlt = monthlastdate - i + 1;
      var strDate = calHelper.getStringDate(self.year, self.month - 1, mlt);
      var aDate = new Date(self.year, self.month - 1, mlt);
      // lit.push(new calDay(mlt, strDate, "inactive", aDate));
      var isToday = self.isDateToday(aDate);
      if(isToday && self.setup){
        //set weekStartDate...ONCE
        self.setup = false;
        self.weekStartDate = self.getWeekStartDateFromDate(aDate);
      }
      lit.push(new calDay(mlt, strDate, isToday ? "active" : "inactive", aDate));
    }
  
    // Loop to add the dates of the current month
    for (let i = 1; i <= lastdate; i++) {
  
      var strDate = calHelper.getStringDate(self.year, self.month, i);
      var aDate = new Date(self.year, self.month, i);

      // let isToday = self.isDateToday(aDate) ? "active" : "";
      var isToday = self.isDateToday(aDate);
      if(isToday && self.setup){
        //set weekStartDate...
        self.setup = false;
        self.weekStartDate = self.getWeekStartDateFromDate(aDate);
      }
      lit.push(new calDay(i,strDate, isToday ? "active" : "", aDate));
    }
  
    // Loop to add the first dates of the next month
    for (let i = dayend; i < 6; i++) {
      var tDay = i - dayend + 1;
      var strDate = calHelper.getStringDate(self.year, self.month + 1, tDay);
      var aDate = new Date(self.year, self.month + 1, tDay);
      var isToday = self.isDateToday(aDate);
      if(isToday && self.setup){
        //set weekStartDate...
        self.setup = false;
        self.weekStartDate = self.getWeekStartDateFromDate(aDate);
      }
      lit.push(new calDay(tDay, strDate, isToday ? "active" : "inactive", aDate));
    }
  
    // Update the text of the current date element 
    // with the formatted current month and year
    self.currentDate = `${self.months[self.month]} ${self.year}`;
  
    // update the HTML of the dates element 
    // with the generated calendar
    self.days = lit;
    self.currentDays = self.days;

    self.calendarWeeks = lit.length / 7;

    self.dayBlockHeight = self.calendarDaysClientHeight / self.calendarWeeks;

    //self.getCalendarWithProviderAndMonth(1, self.date);



    var startDateDay = monthlastdate - dayone;
    var startDate = new Date(self.year, self.month - 1, startDateDay);
    let endDate = new Date(self.year, self.month + 1, 0);

    if(self.currentProvider){
      var provId = self.currentProvider.ProviderID == 0 ? null : self.currentProvider.ProviderID;
      self.getCalendarWithProviderAndDateRange(provId, startDate, endDate);
    }

    self.setupWeekViewDetails(self.weekStartDate);

    if(self.currentView == 'week'){
      self.getWeekFromDate(self.weekStartDate);
    }


    self.updateTimeline();
  }
  
  isDateToday(dateInQuestion){
    let self = this;
    var today = new Date();
    var res = today.getDate() == dateInQuestion.getDate()
    && today.getMonth() === dateInQuestion.getMonth()
    && today.getFullYear() === dateInQuestion.getFullYear()
    ? true
    : false;
    return res;
  }
  

  prevNextClick(prev){
    let self = this;
    // Check if the icon is "calendar-prev"
      // or "calendar-next"


      if(self.currentView == 'week'){//week view...
        //update weekStartDate...
        if(prev){
          //subtract 7 days...
          var prevDate = new Date(self.weekStartDate.getFullYear(), self.weekStartDate.getMonth(), self.weekStartDate.getDate() - 7);
          //check for new month...
          var exists = _.find(self.days, function(d){return d.date == calHelper.getStringDate(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate())});
          if(!exists){
            self.month = self.month - 1
          }
          self.weekStartDate = prevDate;
        }else{
          //add 7 days...
          var nextDate = new Date(self.weekStartDate.getFullYear(), self.weekStartDate.getMonth(), self.weekStartDate.getDate() + 7);
          //check for new month...
          var exists = _.find(self.days, function(d){return d.date == calHelper.getStringDate(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate())});
          if(!exists){
            self.month = self.month + 1
          }
          self.weekStartDate = nextDate;
        }
      }else{//month view...
        self.month = prev ? self.month - 1 : self.month + 1;

        // Check if the month is out of range
        if (self.month < 0 || self.month > 11) {
    
          // Set the date to the first day of the 
          // month with the new year
          self.date = new Date(self.year, self.month, new Date().getDate());
    
          // Set the year to the new year
          self.year = self.date.getFullYear();
    
          // Set the month to the new month
          self.month = self.date.getMonth();
        }
    
        else {
    
          // Set the date to the current date
          self.date = new Date();
        }
      }
     
  

  
      // Call the manipulate function to 
      // update the calendar display
      self.updateCalendar();
  }



  goToDay(date){
    this.date = date;
    this.month = date.getMonth();
    this.year = date.getFullYear();
    this.weekStartDate = this.getWeekStartDateFromDate(this.date);
    this.switchView('week');
    this.updateCalendar();
  }

  goToDayWithProviderId(date, providerId){
    this.setSelectedProviderWithId(providerId);
    this.date = date;
    this.month = date.getMonth();
    this.year = date.getFullYear();
    this.weekStartDate = this.getWeekStartDateFromDate(this.date);
    this.switchView('week');
    this.updateCalendar();
  }

  goToToday(){
    var today = new Date();
    this.goToDay(today);
  }

  moveScheduleItem(schedule, oldDate, oldTime){
    let self = this;
    var foundDay = _.find(self.days, function(d){return d.date == schedule.Date});
    if(foundDay){
      foundDay.addScheduleToSlot(schedule);   
    }
    //remove from previous slot...
    var oldDay = _.find(self.days, function(d){return d.date == oldDate});
    if(oldDay){
      oldDay.removeScheduleFromSlot(oldTime, schedule.ScheduleID);  
    }
  }

  slotClicked(slot, event){
    let self = this;
    var tApt = null;


    if(slot.appointments.length == 0 && !this.globals.admin.HL7Enabled){//ONLY CREATE NEW SCHEDULES IF HL7Enabled == false
      //new appointment

      var OD_Schedule={
        'Time': slot.time,
        'Date': calHelper.getStringDate(slot.date.getFullYear(), slot.date.getMonth(), slot.date.getDate()),
        'Patient_Name': null,
        'Reason_for_Visit': null,
        'PatientID': null,
        'Type': 'Office'
      }
      var newApt = new appointment(OD_Schedule);
      tApt = newApt;
    }else{
      tApt = slot.appointments[0];
    }

    self.openSchedulePop(slot, tApt);
    event.stopPropagation();


  }

  appointmentClicked(slot, apt){
    //this.openSchedulePop(slot, apt);

    let self = this;

    self.home.setLocationId(apt.schedule.LocationID);
    self.home.loadPatientWithMostRecentVisit(apt.schedule.PatientID);

    self.dialogController.cancel();

  }

  openSchedulePop(slot, apt){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let halfW = windowWidth / 2;
    let halfH = windowHeight / 2;

    let options={
      bodyPadding: 0,
      scrollHeight: 300
    }
    self.popupHelper.openViewModelPop('./schedulePopup', 
      {"slot": slot,
      "slotDate": slot.date, 
      "slotTime": slot.time, 
      "apt": apt, 
      "home": self.home, 
      "locations": self.locations, 
      "currentLocation": self.currentLocation,
      "editable": self.canAddAppointment,
      "calendar": self},
      'Schedule',halfW,halfH,halfH / 2,halfW / 2,options,function(res){

      //callback(res.appointment);
      if(res.cancelled)return;

      if(res.appointment && res.appointment.schedule.ScheduleID && !res.appointmentCreated){
        //mm/dd/yyyy format...
        var slotDateStr = calHelper.getStringDate(slot.date.getFullYear(), slot.date.getMonth(), slot.date.getDate());
        if(res.appointment.schedule.Time != slot.time || res.appointment.schedule.Date != slotDateStr){
          //move schedule to proper slot...
          self.moveScheduleItem(res.appointment.schedule, slotDateStr, slot.time)
        }
      }else if(res.appointmentCreated){
        //new apt...
        var newApt =slot.getNewAppointment(res.appointment.schedule);
        slot.appointments.push(newApt);
      }

    });    
  }


  openSettings(){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let halfW = windowWidth / 2;
    let halfH = windowHeight / 2;

    let options={
      bodyPadding: 20,
      scrollHeight: 300,
      displayHeader: true
    }

    let obj={
      slotIncrementMinutes: calHelper.getTimeSlotIncrementInMinutes(),
      startTime: calHelper.getWeekDayStartTime(),
      endTime: calHelper.getWeekDayEndTime(),
      indexOfDaysInWeek: calHelper.getDaysInWeekIndex()
    }

    self.popupHelper.openViewModelPop('./calendarSettings', 
      obj,
      'Settings',
      halfW,
      halfH,
      halfH / 2,
      halfW / 2,
      options,function(res){

      if(res.cancelled)return;

      //update daysInWeekIndex...
      var newDaysInWeek=[];
      for(var i = 0; i < res.daysInWeek.length; i++){
        if(res.daysInWeek[i].selected){
          newDaysInWeek.push(res.daysInWeek[i].index);
        }
      }
      calHelper.setDaysInWeekIndex(newDaysInWeek);
      calHelper.setTimeSlotIncrementInMinutes(res.slotIncrementMinutes);
      calHelper.setWeekDayStartTime(res.startTime);
      calHelper.setWeekDayEndTime(res.endTime);


      self.updateCalendar();

    });    
  }

}
