import {inject, computedFrom} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import * as _ from 'lodash';
import {Data} from '../data/go/data';
import {DialogController} from 'aurelia-dialog';
import * as calHelper from './calendarHelper';

@inject(http, helper, Data, DialogController)
export class CalendarSettings {

  daysInWeek=[{day: 'SUN',index: 0, selected: false},
              {day: 'MON',index: 1, selected: false},
              {day: 'TUE',index: 2, selected: false},
              {day: 'WED',index: 3, selected: false},
              {day: 'THU',index: 4, selected: false},
              {day: 'FRI',index: 5, selected: false},
              {day: 'SAT',index: 6, selected: false}];

  slotIncrementMinutes;
  startTime;
  endTime;
  date;

  constructor(http, helper, Data, DialogController){
    this.http = http;
    this.helper = helper;
    this.data = Data;
    this.dialogController = DialogController;
  }

  activate(params){
    //var p = params;

    this.slotIncrementMinutes = params.slotIncrementMinutes;
    this.date = new Date(params.startTime.getFullYear(), params.startTime.getMonth(), params.startTime.getDate());
    this.startTime = this.getFormattedTime(params.startTime);
    this.endTime = this.getFormattedTime(params.endTime);
    this.selectDaysInWeek(params.indexOfDaysInWeek);

  }

  close(){
    this.dialogController.close();
  }

  save(){

    //update startTime, endTime w/ date objects...
    var startMills = this.inputStartTime.valueAsNumber;
    var endMills = this.inputEndTime.valueAsNumber;

    var dateMills = this.date.getTime();

    //update startTime, endTime w/ totalMilliseconds...
    var finalStartTime = new Date(dateMills + startMills);
    var finalEndTime = new Date(dateMills + endMills);


    var obj={
      daysInWeek: this.daysInWeek,
      slotIncrementMinutes: this.slotIncrementMinutes,
      'startTime': finalStartTime,
      'endTime': finalEndTime
    }

    this.dialogController.close(true, obj);
  }

  getFormattedTime(fromDate){
    var hour = fromDate.getHours().toString().length;
    if(hour == 1){
      hour = '0'+ fromDate.getHours();
    }else{
      hour = fromDate.getHours();
    }
    return `${hour}:${fromDate.getMinutes() == 0 ? '00': fromDate.getMinutes()}`;
  }

  selectDaysInWeek(daysInWeekIndex){
    for(let i = 0; i < this.daysInWeek.length; i++){
      var options = this.daysInWeek[i];
      //look for this index in array...
      var foundDay = _.find(daysInWeekIndex, function(d){return d == options.index});
      if(foundDay){
        options.selected = true;
      }
    }
  }

  //        self.dialogController.close(true, self.patient.data);


}
