import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import * as _ from 'lodash';
import {EventAggregator} from 'aurelia-event-aggregator';
import moment from 'moment';
import {BmiPercentile} from './bmiPercentile';
import {WeightLengthPercentile} from './weightLengthPercentile';


class VitalRow{
  constructor(data){
    this.date = moment(data.ExamDateTime).format("MM/DD/YYYY");
    this.time = data.TimeStamp != null ? moment(data.TimeStamp).format("h:mma") :"";
    this.height=data.Height;
    this.weight=data.Weight;
    this.bmi = data.BMI;
    this.bmiPercent = data.BmiPercent;
    this.heightLengthPercent = data.HeightLengthPercent;
    this.bloodpressure=null;
    if(data.Systole && data.Diastole){
      this.bloodpressure=`${data.Systole}/${data.Diastole}`;
    }
    this.pulse=data.Pulse;
    this.resp=data.Resp;
    this.temp = data.Temp;
  }
}

@inject(helper,http, Data, Home, EventAggregator, BmiPercentile, WeightLengthPercentile)
export class VitalSigns {

  history;
  rows=[];
  parent;

  diastole;
  systole;
  pulse;
  resp;
  temp;
  height;
  weight;

  constructor(helper, http, Data, Home, EventAggregator, BmiPercentile, WeightLengthPercentile) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.event = EventAggregator;
    this.bmiPercent = BmiPercentile;
    this.weightLengthPercent = WeightLengthPercentile;
  }

  activate(model){
    let self = this;
    self.history = model.history;
    //self.vitalData = model.vitalData;
    self.parent = model;

    self.populateVitalObjectWithData(self.history.vitals, model.vitalData);

    // self.event.subscribe("historyEdit", function(editing){
    //   self.setEditing(editing);
    // });
  }


  calculateBmi(heightInches, pounds, convertToMetric){
    let length = convertToMetric ? (Math.round(((heightInches * 2.54) + Number.EPSILON) * 100) / 100) : heightInches;
    let weight = convertToMetric ? (Math.round(((pounds / 2.2046) + Number.EPSILON) * 100) / 100) : pounds;
    let bmi=0;
    if(!convertToMetric){
      let lengthMulti = length * length;
      let weight_Height = weight / lengthMulti;
      bmi=weight_Height * 703;
    }else{
      bmi = (weight/length/length) * 10000;
    }
    return (Math.round((bmi + Number.EPSILON) * 10) / 10);
  }

  addClick() {
    //add new vital sign...
    let self = this;

    let tHeight = null;
    let tWeight = null;

    //get height / weight...
    if(self.height){
      tHeight =self.height;
    }else if(self.rows.length > 0 && self.rows[0].height != null){
      tHeight = self.rows[0].height;
    }

    if(self.weight){
      tWeight =self.weight;
    }else if(self.rows.length > 0 && self.rows[0].weight != null){
      tWeight = self.rows[0].weight;
    }

    let bmiPercent=null;
    let heightLengthPercent=null;
    let bmi=null;

    //calculate BMI / height weight...
    if(tHeight != null && tWeight != null){
      let bmiMetric = self.calculateBmi(tHeight, tWeight, true);
      let age = moment().diff(self.helper.getDateWithFormat(self.parent.demographics.patient.data.DOB, "MM-DD-YYYY"), 'years');

      if(age >= 3 && age <= 20){
        //calculate BMI percentile...
        bmiPercent = self.bmiPercent.getWithSexAgeAndBmi(self.parent.demographics.patient.data.Sex, age, bmiMetric);
      }
      let ageMonths = age * 12;
      if(ageMonths <= 36){
        //calculate weightLengthPercent...
        //convert weight / height to CMs Kgs...
        let cms = (Math.round(((tHeight * 2.54) + Number.EPSILON) * 100) / 100);
        let kgs = (Math.round(((tWeight / 2.2046) + Number.EPSILON) * 100) / 100);
        heightLengthPercent = self.weightLengthPercent.getWithSexHeightAndWeight(self.parent.demographics.patient.data.Sex, cms, kgs);
      }
      if(age > 20){
        bmi = self.calculateBmi(tHeight, tWeight, false);
        bmi = (Math.round((bmi + Number.EPSILON) * 10) / 10);
      }
    }


    let hxId = self.parent.saveObject.PatientHistory.HistoryID;
    // let date = moment().format("MM-DD-YYYY");//self.parent.saveObject.PatientHistory.ExamDateTime;
    // let timeStamp = moment().format("YYYY-MM-DD HH:mm:ss.SSS");
    let visitDate = moment(self.parent.date);
    let date = visitDate.format("MM-DD-YYYY");//self.parent.saveObject.PatientHistory.ExamDateTime;

    let currentHour = moment().get('hour');
    let currentMinute =moment().get('minute');
    let currentSecond =moment().get('second');
    let currentMil =moment().get('millisecond');

    visitDate.set('hour', currentHour);
    visitDate.set('minute', currentMinute);
    visitDate.set('second', currentSecond);
    visitDate.set('millisecond', currentMil);

    let timeStamp = visitDate.format("YYYY-MM-DD HH:mm:ss.SSS");
    let patientId = self.parent.saveObject.PatientHistory.PatientID;
    let userId = self.parent.saveObject.PatientHistory.UserID;

    let vsObj={
      vital:{
        Diastole: self.diastole,
        Systole: self.systole,
        Pulse: self.pulse,
        Resp: self.resp,
        Temp: self.temp,
        Height: self.height,
        Weight: self.weight,
        HistoryID: hxId,
        ExamDateTime: date,
        PatientID: patientId,
        UserID: userId,
        TimeStamp: timeStamp
      }
    }

    //add bmi / weightLength percents if needed...
    if(bmiPercent != null){
      vsObj.vital['BmiPercent']=bmiPercent;
    }
    if(heightLengthPercent != null){
      vsObj.vital['HeightLengthPercent']=heightLengthPercent;
    }
    if(bmi != null){
      vsObj.vital['BMI']=bmi;
    }

    self.data.updateVitalSigns(vsObj, function (res) {

      //add new row to grid...
      let vRow = new VitalRow(res);
      self.rows.unshift(vRow);
    });
  }


  populateVitalObjectWithData(vitalObj, data){
    let self = this;

    //sort by date and time
    data = _.orderBy(data, ['ExamDateTime','TimeStamp'],['desc','desc']);

    //create rows...
    for(let v = 0; v < data.length; v++){
      let vRow = new VitalRow(data[v]);
      self.rows.push(vRow);
    }
  }

}
