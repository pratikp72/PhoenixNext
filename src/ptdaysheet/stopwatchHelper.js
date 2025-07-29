import moment from "moment";

export class StopwatchHelper {

  timer = null;
  counter = 0;
  btnClass = 'fa fa-play fa-lg';
  btnColor = 'green';
  initTop=10;
  initLeft=0;
  displayTime="00:00:00";
  day=null;
  goal=null;
  helper=null;
  host = null;
  callback=null;
  displayStopwatch = false;

  timerClick(){
    let self = this;

    if(self.day.clockClicked){
      self.day.timeOut = moment();
      self.day.clockClicked = false;

      let tt = moment.duration({
        seconds: self.counter
      });
      self.day.totalTime = this.formatTimeWihDuration(tt);
      self.helper.updateDayTotalTimeAcrossAllGoals(self.day);
    }else{
      //only set timeIn the first time...
      if(self.day.timeIn == null ||
        self.day.timeIn == undefined){
        self.day.timeIn = moment();
        //set timeIN for ALL day instances that match current date
        for(let t = 0; t < self.goal.tabs.length; t++){
          let aTab = self.goal.tabs[t];
          aTab.updateDayTimeIn(self.day, self.day.timeIn);
        }
      }
      self.day.clockClicked = true;
    }


    if(self.timer==null){
      self.btnClass = 'fa fa-stop fa-lg';
      self.btnColor = 'red';
      self.timer = setInterval(self.timerUpdate, 1000, self);
    }else{
      self.btnClass = 'fa fa-play fa-lg';
      self.btnColor = 'green';
      clearInterval(self.timer);
      self.timer = null;
    }
  }

  formatTimeWihDuration(duration){
    let dSec = duration.get('seconds');
    let dMin = duration.get('minutes');
    let dHr = duration.get('hours');
    //let time = moment().set({'hour': dHr, 'minute':dMin, 'second': dSec});
    //let format="";
    let finalTime=dHr >= 10 ? (dHr + ":") : "0" + dHr + ":";
    finalTime += dMin >= 10 ? (dMin + ":") : "0" + dMin + ":"
    finalTime += dSec >= 10 ? dSec : "0" + dSec;

    return finalTime;
  }

  setDisplayTime(t){
    if(t == null)return;

    let s = t.split(':');

    s = _.reject(s, function(o) { return o.length == 0; });

    if(s.length ==3){
      this.displayTime = s[0] + ":" + s[1] + ":" + s[2];

      let hms = moment.duration({
        seconds: s[2],
        minutes: s[1],
        hours: s[0]
      });

      //to continue existing timer,
      //set timerTick to number of seconds
      this.counter = hms.asSeconds();

    }else if(s.length==2){
      this.displayTime = "00:" + s[0] + ":" + s[1];

      let ms = moment.duration({
        seconds: s[1],
        minutes: s[0],
      });

      //to continue existing timer,
      //set timerTick to number of seconds
      this.counter = ms.asSeconds();

    }else if(s.length == 1){
      this.displayTime = "00:00:" + s[0];

      let secs = moment.duration({
        seconds: s[0]
      });

      //to continue existing timer,
      //set timerTick to number of seconds
      this.counter = secs.asSeconds();

    }
  }

  timerUpdate(s){
    s.counter++;

    let d = moment.duration(s.counter * 1000);
    let hr = d.get('hours');
    let min = d.get('minutes');
    let sec = d.get('seconds');

    if(sec < 10){
      sec = "0" + sec;
    }
    if(min < 10){
      min = "0" + min;
    }
    if(hr < 10){
      hr = "0" + hr;
    }

    s.displayTime = hr + ":" + min + ":" + sec;
  }

  // attached(){
  //   let width = $(window).width();
  //   this.initLeft = width - this.uxTimer.clientWidth - 10;
  // }

  show(a, callback){
    this.callback = callback;
    this.day = a.day;
    this.goal = a.goal;
    this.helper = a.helper;
    this.setDisplayTime(a.day.totalTime);
    this.timerClick();
  }

  close(){
    let self = this;
    if(self.callback != null){
      self.callback();
    }
  }
}
