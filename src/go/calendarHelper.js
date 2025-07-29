
   export function addMinutesToDate(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
  }
  
  export function getStringTime(date){
    var hour = date.getHours();
    var mins = date.getMinutes();
    //hour = hour + 1;//add 1 for zero index...
    var amPm = hour > 12 ? 'PM' : 'AM';
    hour = hour > 12 ? hour - 12 : hour;
    mins = mins.toString().length == 1 ? "0"+mins : mins;
    return `${hour}:${mins} ${amPm}`;
  }
  
  export function getStringDate(year, month, day){
  
    var tMonth ="";

    month+=1;//add one to month index...

    if(month.toString().length == 1){
      tMonth = "0"+ month;
    }else{
      tMonth= month;
    }
  
    var tDay ="";
    if(day.toString().length == 1){
      tDay = "0"+ day;
    }else{
      tDay= day;
    }
  
    return `${tMonth}/${tDay}/${year}`;
  }

  const numberOfDaysInWeek = 7;
  const weekContainerWidth=0;
  const timeslotHeight=0;
  const slotTimeIncrementInMinutes=15;
  const weekDayStartTime=null;
  const weekDayEndTime=null;
  const daysInWeekIndex=[];
  const providerList=[];

  export function setDaysInWeekIndex(daysIndex){
    this.daysInWeekIndex = daysIndex;
  }

  export function getDaysInWeekIndex(){
    return this.daysInWeekIndex;
  }

  export function setProviderList(providers){
    this.providerList = providers;
  }

  export function getProviderList(){
    return this.providerList;
  }

  // export function setNumberOfDaysInWeek(count){
  //   this.numberOfDaysInWeek = count;
  // }

  // export function getNumberOfDaysInWeek(){
  //   return this.numberOfDaysInWeek;
  // }

  export function setWeekContainerWith(width){
    this.weekContainerWidth = width;
  }

  export function getWeekContainerWith(){
    return this.weekContainerWidth;
  }

  export function setTimeSlotIncrementInMinutes(increment){
    this.slotTimeIncrementInMinutes = increment;
  }

  export function getTimeSlotIncrementInMinutes(){
    return this.slotTimeIncrementInMinutes;
  }

  export function setWeekDayStartTime(date){
    this.weekDayStartTime = date;
  }

  export function getWeekDayStartTime(){
    return this.weekDayStartTime;
  }

  export function setWeekDayEndTime(date){
    this.weekDayEndTime = date;
  }

  export function getWeekDayEndTime(){
    return this.weekDayEndTime;
  }

  export function setTimeslotHeight(height){
    this.timeslotHeight = height;
  }

  export function getTimeslotHeight(){
    return this.timeslotHeight;
  }


