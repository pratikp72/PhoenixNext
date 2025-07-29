import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import {EventAggregator} from 'aurelia-event-aggregator';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';
import {PopupHelper} from "./popupHelper";
import {Globals} from './globals';
import { WorkflowHelper } from './workflowHelper';

@inject(helper, http, Data, Home, PopupHelper, Globals, WorkflowHelper, EventAggregator)
export class Schedule {

  scheduleFilters = []; // ['Telemed', 'Office'];
  currentFilter = ''; //'Office';
  locations = [];
  currentLocation;
  scrollHeight = 0;
  scheduleWidth = '435px';
  fullSizeSchedule = false;
  statusList = ['Next', 'Ready', 'Waiting', 'Not Arrived', 'Canceled', 'No Show', 'Complete', 'X-ray Order'];
  roomList = [];
  podList = [];
  filteredProviders = [];

  @bindable datepicker;
  @observable scheduleDate;

  nearestVisitTimer;

  displaySpinner = false;

  spinnerLeft; // = (self.popupWidth / 2) - 21;
  spinnerTop; // = (self.popupHeight / 2)-21;
  past_date = false;
  

  constructor(helper, http, Data, Home, PopupHelper, Globals, WorkflowHelper, eventAggregator) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.popupHelper = PopupHelper;
    this.globals = Globals;
    this.workflowHelper = WorkflowHelper;
    this.eventAggregator = eventAggregator; 

    console.log('EventAggregator injected successfully:', this.eventAggregator);

    this.setupChatbotIntegration();
  }

  setupChatbotIntegration() {
    console.log('Setting up chatbot integration...');
    
    var self = this;
    
    // Listen for office visits requests from chatbot
    this.eventAggregator.subscribe('office-visits-requested', function(data) {
      console.log('Received office-visits-requested event:', data);
      self.handleOfficeVisitsRequest(data.patientName, data.apiResponse);
    });
  }

  handleOfficeVisitsRequest(patientName, apiResponse) {
    console.log('Handling office visits request for:', patientName);
    
    // Find the patient in the current schedule
    const patient = this.findPatientByName(patientName);
    
    if (patient) {
      console.log('Found patient in schedule:', patient);
      // We'll add the rowClick call later
    } else {
      console.log('Patient not found in schedule:', patientName);
    }
  }

  findPatientByName(patientName) {
    if (!this.home.schedule || !Array.isArray(this.home.schedule)) {
      console.log('No schedule available or schedule is not an array');
      return null;
    }
    
    var nameParts = patientName.toLowerCase().split(' ');
    console.log('Searching for patient with name parts:', nameParts);
    console.log('Current schedule has', this.home.schedule.length, 'items');
    
    // Log the first few schedule items to see their structure
    if (this.home.schedule.length > 0) {
      console.log('Sample schedule item:', this.home.schedule[0]);
    }
    
    var self = this;
    return this.home.schedule.find(function(scheduleItem) {
      // You'll need to adjust these field names based on your actual schedule structure
      var fullName = (scheduleItem.patientName || scheduleItem.fullName || '').toLowerCase();
      var firstName = '';
      var lastName = '';
      
      // Handle optional chaining safely
      if (scheduleItem.firstName) {
        firstName = scheduleItem.firstName.toLowerCase();
      } else if (scheduleItem.data && scheduleItem.data.Patient && scheduleItem.data.Patient.FirstName) {
        firstName = scheduleItem.data.Patient.FirstName.toLowerCase();
      }
      
      if (scheduleItem.lastName) {
        lastName = scheduleItem.lastName.toLowerCase();
      } else if (scheduleItem.data && scheduleItem.data.Patient && scheduleItem.data.Patient.LastName) {
        lastName = scheduleItem.data.Patient.LastName.toLowerCase();
      }
      
      console.log('Checking patient: ' + fullName + ' (' + firstName + ' ' + lastName + ')');
      
      var matches = nameParts.every(function(part) {
        return fullName.includes(part) || 
               firstName.includes(part) || 
               lastName.includes(part) ||
               (firstName + ' ' + lastName).includes(part);
      });
      
      if (matches) {
        console.log('Found matching patient:', scheduleItem);
      }
      
      return matches;
    });
  }

  get showCalendarButton() {
    return true;
    // return (this.fullSizeSchedule && !this.globals.admin.HL7Enabled) ? true : false;
  }

  activate(params) {
    var self = this;

    self.filteredProviders = self.home.providers;

    self.fullSizeSchedule = self.globals.fullSizeSchedule;
    self.setScheduleWidth(self.fullSizeSchedule);

    if (self.globals.scheduleLocation) {
      self.currentLocation = self.globals.scheduleLocation;
    }

    self.getLocations();

    // self.trySelectLoggedInUser();

    if (self.globals.scheduleDate) {
      self.scheduleDate = self.globals.scheduleDate;
    } else {
      self.scheduleDate = moment().format('MM/DD/YYYY');
    }

    self.getPods();
    self.getRooms();

    //loop should highlight...
    self.nearestVisitTimer = setInterval(function() {
      //select nearest schedule...
      self.highlightSchedule();
    }, 60000);
  }

  openCalendar() {
    let self = this;

    let path = './calendar';
    let date = moment().format('MM/DD/YYYY');
    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let third = windowWidth / 3;

    let width = windowWidth - 71;
    let left = 71; //third / 2;

    let height = windowHeight; // - 10;
    let top = 0;

    let options = {
      displayHeader: true,
      // bodyPadding: 0,
      // overlayTop : 50
    }

    //close schedule...
    self.home.toggleSchedulePicker();

    self.popupHelper.openViewModelPop(path, self, "", width, height, top, left, options, function(res) {
      // callback
    });
  }

  highlightSchedule() {
    let self = this;
    //select nearest schedule...
    for (let s = 0; s < self.home.schedule.length; s++) {
      let sched = self.home.schedule[s];
      let diff = self.compareScheduleItemToNow(sched);
      if (diff < 0) {
        //get previous item...
        let index = s == 0 ? 0 : s - 1;
        self.home.schedule[index].nearestSchedule = true;

        let rowEl = self.scheduletable.rows[index];
        if (rowEl) {
          rowEl.scrollIntoView();
        }

        break;
      } else {
        sched.nearestSchedule = false;
      }
    }
  }

  compareScheduleItemToNow(item) {
    let self = this;

    let parsedTime = self.parseTime(item.time);
    let strTime = parsedTime.hour + ":" + parsedTime.minute;

    //parse date...
    let dateSplit = item.data.Schedule.Date.split('-');

    let dNow = new Date();
    //let dToday = new Date(item.data.Schedule.Date);
    // let dItemTime = new Date(item.data.Schedule.Date + " " + strTime);// item.time);
    let dateTimeStr = dateSplit[2] + '-' + dateSplit[0] + "-" + dateSplit[1] + "T" + strTime;
    let dItemTime = new Date(dateTimeStr); // item.time);
    let dDiff = dNow - dItemTime;

    return dDiff;
  }

  getScheduleDateTime(OD_Schedule) {
    let self = this;
    let tTime = self.parseTime(OD_Schedule.Time);
    let strTime = tTime.hour + ":" + tTime.minute;
    //parse date...
    let dateSplit = OD_Schedule.Date.split('/');
    let dateTimeStr = dateSplit[2] + '-' + dateSplit[0] + "-" + dateSplit[1] + "T" + strTime;
    return new Date(dateTimeStr); // item.time);
  }

  parseTime(time) {
    //12:00 AM == 00:00
    //12:00 PM == 12:00
    //11:00 PM == 23:00

    let initTime = time;

    let isPm = true;
    //am or pm??
    let amIndex = time.search('AM');
    if (amIndex > -1) {
      isPm = false;
    }
    //remove AM/ PM
    time = time.replace(isPm ? 'PM' : 'AM', '');
    time = time.trim();

    let timeSplit = time.split(':');
    let hour, minute;
    if (!isPm) {
      if (timeSplit[0] == '12') {
        hour = 0
      }
      hour = timeSplit[0] == '12' ? 0 : timeSplit[0];
    } else {
      let tHour = parseInt(timeSplit[0]);
      hour = tHour != 12 ? 12 + tHour : tHour;
    }
    minute = timeSplit[1];

    let strHour = hour.toString();
    if (strHour.length == 1) {
      //add zero to hour
      strHour = '0' + strHour;
    }

    return { 'hour': strHour, 'minute': minute }
  }

  trySelectLoggedInUser() {
    let self = this;
    //first check if we have a scheduledProvider selected, else if logged-in user is a scheduled provider,
    //if so, select it him....
    var userId = self.globals.scheduleProvider != null ? self.globals.scheduleProvider.UserID : self.helper._user.UserID;
    var aProvider = _.find(self.home.providers, function(p) { return p.UserID == userId });
    if (aProvider != undefined) { // && self.home.currentProvider != null && aProvider.ProviderID != self.home.currentProvider.ProviderID){
      //select provider...
      if (self.home.currentProvider != null && aProvider.ProviderID == self.home.currentProvider.ProviderID) {
        // do nothing
      } else {
        self.home.currentProvider = aProvider;
      }

      //self.globals.scheduleProvider = aProvider;
      self.providerSelected();
    }
    // else{
    //   // self.home.currentProvider= null;
    //   self.home.currentProvider= self.home.providers[0];//select "ALL"
    //   self.providerSelected();
    // }
  }

  scheduleDateChanged(newVal, oldVal) {
    let self = this;

    //check to see if provider has changed...

    if (self.home.currentProvider == null ||
      (self.home.schedule.length > 0 &&
        self.home.schedule[0].data.Schedule.ProviderID != self.home.currentProvider.ProviderID)) {
      self.home.schedule = [];
    }

    self.globals.scheduleDate = newVal;

    //check for past visit...
    if (!self.helper.is_today(newVal)) {
      //change date color to red...
      self.past_date = true;
    } else {
      self.past_date = false;
    }

    self.home.loadScheduledProviders(newVal, function() {
      self.trySelectLoggedInUser();
    });
  }

  toggleScheduleSize() {
    this.fullSizeSchedule = this.fullSizeSchedule ? false : true;
    this.globals.fullSizeSchedule = this.fullSizeSchedule;
    //this.scheduleWidth = this.fullSizeSchedule ? '100%' : "435px";

    this.setScheduleWidth(this.fullSizeSchedule);
  }

  setScheduleWidth(isFullsize) {
    this.scheduleWidth = isFullsize ? '100%' : "435px";
  }

  saveChanges() {
    let self = this;
    //update any schedule changes...
    for (let i = 0; i < this.home.schedule.length; i++) {
      let aSchedule = this.home.schedule[i];
      if (aSchedule.hasOwnProperty('needsUpdate')) {
        this.updateScheduleRow(aSchedule);
      }
    }
  }

  reasonForVisitFocus(row, e) {
    let ev = e;
    e.stopPropagation();
    row.needsUpdate = true;
  }

  updateScheduleRow(r) {
    let self = this;
    let url = 'schedule';

    //put date in proper format...
    r.data.Schedule.Date = moment(r.data.Schedule.Date).format('MM/DD/YYYY');
    r.data.Schedule.Pod = r.pod === 'Choose...' ? "" : r.pod;
    r.data.Schedule.Room = r.room === 'Choose...' ? "" : r.room;
    r.data.Schedule.Reason_for_Visit = r.reasonForVisit;

    let tDateTime = self.getScheduleDateTime(r.data.Schedule);
    let dateTimeStr = tDateTime.toISOString();
    r.data.Schedule.Time = dateTimeStr;

    //remove LocationID???
    delete r.data.Schedule.LocationID;
    delete r.data.Schedule.OD_Provider_ID;

    // self.testFailedPutObject('schedule', 'ScheduleID', r.data.Schedule);

    self.data.putWithUrlAndData(url, r.data.Schedule, function(res) {
      delete r.needsUpdate;
    })
  }

  testFailedPutObject(url, keyPropertyName, object) {
    let self = this;
    let testObj = {};
    let objs = Object.getOwnPropertyNames(object);
    let vals = Object.values(object);

    //get key index and set value...
    for (let k = 0; k < objs.length; k++) {
      if (objs[k] == keyPropertyName) {
        testObj[keyPropertyName] = vals[k];
        break;
      }
    }

    for (let i = 0; i < objs.length; i++) {

      let error = false;
      //ignore KEY...
      if (objs[i] == keyPropertyName) {
        continue;
      }

      testObj[objs[i]] = vals[i];

      self.data.putWithUrlAndData(url, testObj, function(res) {
        if (res == null) {
          alert('Put Error: see console');
          //let errObj = Object.getOwnPropertyNames(testObj);
          console.log('ERROR: ' + objs[i] + ":" + vals[i]);
          error = true;
        }
      })

      if (error) {
        break;
      }
    }
  }

  detached() {
    clearInterval(this.nearestVisitTimer);
    this.saveChanges();
  }

  attached() {
    let self = this;

    const windowHeight = window.innerHeight;
    self.scrollHeight = windowHeight - 63;

    self.spinnerLeft = (self.scheduledisplay.clientWidth / 2) - 21;
    self.spinnerTop = (self.scheduledisplay.clientHeight / 2) - 21;
  }

  getCurrentProviderIndexFromList() {
    let self = this;

    if (!self.home.currentProvider && !self.globals.scheduleProvider) {
      return 0;
    }

    let providerIdToMatch = self.home.currentProvider ? self.home.currentProvider.ProviderID : self.globals.scheduleProvider.ProviderID;

    for (let i = 0; i < self.home.providers.length; i++) {
      let aProvider = self.home.providers[i];
      if (aProvider.ProviderID == providerIdToMatch) {
        return i + 1; //add one for "choose..."
      }
    }

    return 0;
  }

  getLocations() {
    let self = this;
    self.data.getWithUrl('locations', function(res) {
      // let clinicLocs = _.filter(res, function(l){return l.Type == 'Clinic'});
      let clinicLocs = _.filter(res, function(l) { return l.displayLocation == true });
      for (let i = 0; i < clinicLocs.length; i++) {
        self.locations.push(clinicLocs[i]);
      }

      self.locations.splice(0, 0, { LocationName: 'All' });
    });
  }

  getRooms() {
    let self = this;
    self.roomList = [];

    self.data.getList('Room', function(rooms) {
      self.roomList = _.uniqBy(rooms, 'Description1');
    });
  }

  getPods() {
    let self = this;
    self.podList = [];
    self.data.getList('Pod', function(rooms) {
      self.podList = _.uniqBy(rooms, 'Description1');
    });
  }

  getScheduleWithLocation(location) {
    let self = this;
    self.currentLocation = location;
    self.globals.scheduleLocation = location;
    self.filterScheduleV2();
  }

  filterProvidersWithScheduleAndLocation(schedule, locationId) {
    let self = this;
    if (locationId == null) {
      //all
      self.filteredProviders = self.home.providers;
    } else {
      self.filteredProviders = [];
      var locationSchedule = _.filter(schedule, function(s) { return s.data.Schedule.LocationID == locationId })
      var filterdProviderSchedule = _.uniqBy(locationSchedule, 'providerName');
      for (var i = 0; i < filterdProviderSchedule.length; i++) {
        var provId = filterdProviderSchedule[i].data.Schedule.ProviderID;
        for (var p = 0; p < self.home.providers.length; p++) {
          if (self.home.providers[p].ProviderID == provId) {
            //clone and add to filteredProviders...
            var cloneProv = _.clone(self.home.providers[p]);
            self.filteredProviders.push(cloneProv);
            break;
          }
        }
      }
    }
  }

  filterScheduleV2() {
    var self = this;

    self.displaySpinner = true;

    var providerId = self.home.currentProvider ? self.home.currentProvider.ProviderID : 0; //self.home.currentProvider.ProviderID;

    let getAllLocations = false;
    if (self.currentLocation) {
      getAllLocations = self.currentLocation.LocationName == 'All' ? true : false;
    }
    let locationId = self.currentLocation ? self.currentLocation.LocationID : null;

    self._getSchedule(providerId, self.scheduleDate, self.currentFilter, getAllLocations, locationId);
  }

  _getSchedule(providerId, scheduleDate, filter, getAll, locationId) {
    let self = this;
    self.data.getSchedule(providerId, scheduleDate, filter, getAll, locationId, function(res) {
      self.home.schedule = res;

      self.filterProvidersWithScheduleAndLocation(res, locationId);

      self.highlightSchedule();

      self.displaySpinner = false;
    });
  }

  providerSelected() {
    var self = this;

    let provId = self.home.currentProvider ? self.home.currentProvider.ProviderID : 0;
    self.globals.scheduleProvider = self.home.currentProvider;

    self.displaySpinner = true;

    var locationId = self.currentLocation ? self.currentLocation.LocationID : null;

    self._getSchedule(provId, self.scheduleDate, self.currentFilter, false, locationId);

    self.home.getProviderForms(provId);

    self.workflowHelper.initWorkflowForProvider(provId, function(success) {
      if (success) {
        var dt = moment().format('MM/DD/YYYY');
        self.workflowHelper.getWorkflow(provId, dt, dt, function(res) {
          const wfRes = res;
          self.home.updateWorkflowSidebarItemBadge(wfRes.incompleteCount);
        });
      }
    });
  }

  statusSelected(r) {
    //row color...
    r.data.Schedule.Status = r.status;

    if (r.status == 'Waiting') {
      r.bgColor = 'table-primary';
      r.txtColor = '#004085';
    } else if (r.status == 'Ready') {
      r.bgColor = 'table-success';
      r.txtColor = '#155724';

    } else if (r.status == 'Next') {
      r.bgColor = 'table-danger';
      r.txtColor = '#721c24';
    } else {
      r.bgColor = '';
      r.txtColor = '#000000';
    }

    r.needsUpdate = true; //add this for saving later....
  }

  roomSelected(r) {
    r.needsUpdate = true;
  }

  podSelected(r) {
    r.needsUpdate = true;
  }

  rowClick(r, e) {
    var self = this;

    //is this a select???
    if (e.target.localName === 'select') {
      return;
    }

    if (!self.home.currentProvider) {
      if (self.globals.scheduleProvider) {
        self.home.currentProvider = self.globals.scheduleProvider;
      }
    }

    if (!self.home.currentProvider) {
      return;
    }

    //set currentProvider if we dont have one...
    if (self.home.currentProvider.ProviderID == 0) {
      let pro = self.home.getProviderFromScheduledProviderList(r.data.Schedule.ProviderID);
      if (pro) {
        self.home.currentProvider = pro;
      } else {
        //no provider, display provider picker....???
      }
    }

    //set location id....
    if (r.data.Schedule == undefined) {
      //pick location...NO ALL
      let noAllLocations = _.reject(self.locations, function(r) {
        return r.LocationName == 'All';
      });
      let genericPicklistItems = [];
      for (let i = 0; i < noAllLocations.length; i++) {
        let pItm = self.data.getGenericPicklistItem(noAllLocations[i].LocationName, noAllLocations[i]);
        genericPicklistItems.push(pItm);
      }
      this.home.toggleSchedulePicker();
      self.popupHelper.openGenericPicklistPop("Location", 'Please Select Visit Location', genericPicklistItems, true, function(res) {
        let locId = res.item.data.LocationID;
        self.home.setLocationId(locId);
        self.home.loadPatientWithMostRecentVisit(r.patientId);
      });
    } else {
      self.home.setLocationId(r.data.Schedule.LocationID);
      self.home.loadPatientWithMostRecentVisit(r.patientId);
    }
    self.home.toggleSchedulePicker();
  }
}