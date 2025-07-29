/**
 * Created by montymccune on 10/15/18.
 */
import moment from 'moment';
import * as _ from 'lodash';
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject} from 'aurelia-framework';


class CreateVisit{
  constructor(visitType, bodyPart, bodySide, date){
    this.visitType = visitType;
    this.bodypart = bodyPart;
    this.bodyside = bodySide;
    this.date = date;
  }
}

class ExamData{
  constructor(exam, hpi, plan){
    this.exam = exam;
    this.plan = plan;
    this.hpi = hpi;
  }
}

class Provider{
  constructor(name, id){
    this.name = name;
    this.id = id;
    this.selected = false;
  }
}

class DxRow{
  constructor(id, code, desc, date, data){
    this.id = id;
    this.code = code;
    this.description = desc;
    this.date = date;
    this.data = data;
    this.selected = false;
  }
}


class ScheduleRow{
  constructor(id, name, time, patientId, isNewPatient, latestVisit, data){
    this.id = id;
    this.name = name;
    this.time = time;
    this.patientId = patientId;
    this.isNewPatient = isNewPatient;
    this.latestVisitDate = latestVisit ? moment(latestVisit.ExamDateTime).format('MM-DD-YYYY') : null;
    this.latestVisitBodyPart = latestVisit ? latestVisit.VisitBodyPart : null;
    this.latestVisitDateMoment = latestVisit ? moment(latestVisit.ExamDateTime) : null;
    this.data = data;
  }
}

class OrderRow{
  constructor(id, date, description, data){
    this.id = id;
    this.date = date;
    this.description = description;
    this.data = data;
  }
}

class EncounterCode{
  constructor(code, description, physicianCode){
    this.code = code;
    this.description = description;
    this.physicianCode = physicianCode;
  }
}

class MedRow{
  constructor(id, description, lastRefill, status){
    this.id = id;
    this.description = description;
    this.lastRefill = lastRefill;
    this.status = status;
  }
}

class AllergyRow{
  constructor(id, description, date, reaction){
    this.id = id;
    this.description = description;
    this.date = date;
    this.reaction = reaction;
  }
}

class Patient{
  constructor(patient){
    this.data = patient.Patient;
    console.log('Patient:', this.data);
    this.latestVisitDate = patient.Visit ? moment(patient.Visit.ExamDateTime).format('MM-DD-YYYY') : null;
    if(patient.Patient.Photo === undefined ||
      patient.Patient.Photo === null ||
      patient.Patient.Photo.length == 0){
      this.imagepath = '/images/Photos/blank.png';
    } else{
      this.imagepath = '/images/Photos/' + patient.Patient.Photo;
    }
  }

  PatientName(){
    return this.data.NameLast + ", " + this.data.NameFirst;
  }
}

@inject(helper,http)
export class Data {

  constructor(helper, http) {
    this.helper = helper;
    this.http = http;
  }

  getNewCreateVisitObject(visitType, bodyPart, bodySide){
    return new CreateVisit(visitType, bodyPart, bodySide);
  }

  getProviders(date, callback) {
    var self = this;
    var providers = [];
    var url = "providers?date=" + date;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      for (var i = 0; i < json.length; i++) {
        var p = new Provider(json[i].ProviderEntity, json[i].ProviderID);
        providers.push(p);
      }
      callback(self.providers);
    });
  }


  getLatestVisitCodeForPatient(patientId, callback){
    var self = this;
    var url = 'visitcode/patient/' + patientId + '/latest';
    self.http.get(self.helper.getApiUrl(url), function(json){
        callback(json);
    });
  }

  getAllVisitCodeForPatient(patientId, callback){
    var self = this;
    var url = 'visitcode/patient/' + patientId + '/all';
    self.http.get(self.helper.getApiUrl(url), function(json){

      //sort descending...
      let sorted = _.orderBy(json, ['ExamDateTime'],
        ['desc']);

      callback(sorted);
    });
  }

  getVisitCodeObject(callback){
    var self = this;
    var url = 'visitcode';
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  createVisitCode(visitCode, callback){
    var self = this;
    var url = 'visitcode';
    self.http.post(self.helper.getApiUrl(url), JSON.stringify(visitCode), function (schedule) {
      callback(schedule)
    }, { contentType: "application/json" });
  }


  getScheduledProviders(date, callback){
    var self = this;
    var today =  moment().format('MM/DD/YYYY');
    var url = 'providers?date='+ today;
    self.http.get(self.helper.getApiUrl(url), function(json){
      if(json != null){
        callback(json);
      }
    });
  }

  getSchedule(providerId, filterByTelemed, callback) {
    let self = this;
    let date = moment().format("MM-DD-YYYY");
    let schedule = [];
    let types = [];
    filterByTelemed ? types.push('Telemed') : types.push('Office');
    let qObject = {
      'ProviderId': providerId,
      'Date': date,
      'Types': types
    };

    let url = `schedule/withisnew`;
    self.http.post(self.helper.getApiUrl(url), JSON.stringify(qObject), function (json) {

      let final=json;

      for (let i = 0; i < final.length; i++) {
        let r = final[i];
        let row = new ScheduleRow(r.Schedule.ScheduleID, r.Schedule.Patient_Name, r.Schedule.Time,
                                  r.Schedule.PatientID, r.IsNewPatient, r.LatestVisit, r);
        schedule.push(row);
      }

      callback(schedule)
    }, { contentType: "application/json" });
  }

  getPatientEmpty(){
    let patient ={'data':{}};
    patient.imagepath = `${helper.goFileUrl}images/blank.png`//'/images/Photos/blank.png';
    patient.data.PatientID="";
    return patient;
  }

  getPatient(patientId, callback) {
    var self = this;
    //var url = "patients/" + patientId;
    var url = `patients/withvisit?patientId=${patientId}`;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      let patient = new Patient(json);
      console.log('PATIIENT:', patient);
      callback(patient);
    });
  }

  getPatientAllergies(patientId, callback) {
    var self = this;
    var url = "patientallergies/query";
    var data ={'PatientId': patientId,
                'Status': ["Active", "A"]};

    self.http.post(self.helper.getApiUrl(url), JSON.stringify(data), function(res){

      console.log('GOT ALLERGIES', res);

        if(res == undefined || res == null)return;

        var list=[];
        for(var i = 0; i < res.length; i++){
          var m = res[i];
          var aMed = new AllergyRow(m.AllergyID, m.Substance, "", m.Reaction);
          list.push(aMed);
        }
        callback(list);

      },
      { contentType: "application/json" },
      function(err){
        var e = 'oops';
      });
  }

  getPatientSurgeries(patientId, callback){
    var self = this;
    var url = 'patientprocedure/Query';
    var qObject = {
      'PatientId': patientId,
      'ProcedureTypes': ["Surgery"]
    };

    self.http.post(self.helper.getApiUrl(url), JSON.stringify(qObject), function(res){

        if(res == undefined || res == null)return;

        var list=[];
        for(var i = 0; i < res.length; i++){
          var m = res[i];
          var surgDate = m.SurgeryDate != null ? self.helper.getISODateToFormat(m.SurgeryDate, "MM/DD/YY") : '';
          var aMed = new ScheduleRow(m.PatientCPTID, m.CodeDescr, surgDate);
          list.push(aMed);
        }
        callback(list);

      },
      { contentType: "application/json" },
      function(err){
        var e = 'oops';
      });
  }


  getPatientMeds(patientId, callback) {
    var self = this;
    var url = "rxs?patientId="+ patientId;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      var list=[];
      for(var i = 0; i < json.length; i++){
        var m = json[i];
        var aMed = new MedRow(m.RXPatientID, m.RX_Sig, self.helper.getISODateToFormat(m.LastRefill, "MM/DD/YY"), m.RX_Status);
        list.push(aMed);
      }
      callback(list);
    });
  }


  getDiagnosis(patientId, callback){
    var self = this;
    var url = 'patientdiagnosis?patientId='+ patientId + "&status=A";
    self.http.get(self.helper.getApiUrl(url), function (res) {

      if(res == undefined || res == null)return;

      console.log('Diagnoses', res);

      var list=[];
      for(var i = 0; i < res.length; i++){
        var m = res[i];
        var aDx = new DxRow(m.PatientDXID, m.PatientDxCode, m.PatientDxDescription, self.helper.getISODateToFormat(m.DateCreated, "MM/DD/YY"), m);
        list.push(aDx);
      }
      callback(list);

    });

  }

  saveAddedDiagnoses(diagnoses, callback){

    const self = this;
    const url = `patientdiagnosis/list`;
    let stringifiedContent = JSON.stringify(diagnoses);
    self.http.post(self.helper.getApiUrl(url), stringifiedContent, (returnData) => {
      callback(returnData);
    }, {contentType: 'application/json'});

  }

  getWebDocsWithProviderID(providerId, callback){
    var self = this;
    var url = "webdoc/provider/"+ providerId;
    self.http.get(self.helper.getApiUrl(url), function (res) {
      callback(res);
    });
  }

  getDocumentsForPatientAndDate(patientId, date, callback){
    var self = this;
    var url = "documents?patientId="+patientId+"&date="+date;
    self.http.get(self.helper.getApiUrl(url), function (res) {
      callback(res);
    });
  }

  getOrders(patientId, callback) {
    var self = this;
    var url = 'laborder/query';
    var qObject = {
      'PatientId': patientId,
      'Types': ["DME", "IMAGE", "XRAY", "Injection"]
    };

    self.http.post(self.helper.getApiUrl(url), JSON.stringify(qObject), function(res){

        if(res == undefined || res == null)return;

        var list=[];
        for(var i = 0; i < res.length; i++){
          var m = res[i];
          var aMed = new OrderRow(m.LabReqID, self.helper.getISODateToFormat(m.DateCreated, "MM/DD/YY"), m.TestOrdered, m);
          list.push(aMed);
        }
        callback(list);

      },
      { contentType: "application/json" },
      function(err){
        var e = 'oops';
      });
  }


  getFollowUpPref(providerId, part, type, callback){
    var self = this;
    var url = "examfollowup/preferences?providerId="+ providerId + "&part=" + part + "&type=" + type;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      var list=[];
      for(var i = 0; i < json.length; i++){
        var m = json[i];
        list.push(m);
      }
      callback(list);
    });
  }

  getQuickOrderPrefs(providerId, callback){
    var self = this;
    var url = "laborder/prefs?providerId="+ providerId + "&type=quick";
    self.http.get(self.helper.getApiUrl(url), function (json) {
      var list=[];
      for(var i = 0; i < json.length; i++){
        var m = json[i];
        list.push(m);
      }
      callback(list);
    });
  }

  getNewOrder(callback){
    var self = this;
    var url = "laborder";
    self.http.get(self.helper.getApiUrl(url), function(json){
      if(json != null){
        callback(json);
      }
    });
  }


  getNewExam(callback){
    var self = this;
    var url = "examfollowup";
    self.http.get(self.helper.getApiUrl(url), function(json){
      if(json != null){
        callback(json);
      }
    });
  }

  getNewHpi(callback){
    var self = this;
    var url = "hpi";
    self.http.get(self.helper.getApiUrl(url), function(json){
      if(json != null){
        callback(json);
      }
    });
  }

  getNewPlan(callback){
    var self = this;
    var url = "plan";
    self.http.get(self.helper.getApiUrl(url), function(json){
      if(json != null){
        callback(json);
      }
    });
  }

  getPopulatedPreference(prefData, callback){
      let self = this;
      let url = `examfollowup/preferences/populate?preferenceId=${prefData.preferenceId}&providerId=${prefData.providerId}&patientId=${prefData.patientId}&examDateTime=${prefData.examDateTime}`;
      self.http.get(self.helper.getApiUrl(url), function(json) {
        if(json != null){
          callback(json);
        }
      }, (error) => {
        if(error.status === 412 && error.statusText === 'No Visit Created'){
          alert('You must create a visit for this patient before you can apply a preference.')
        }
      });
  }




  getPreviousExamData(patientId, bodypart, date, callback){
    let self = this;
    let url = `examfollowup/previous/patients/${patientId}/bodypart/${bodypart}/date/${date}`;
    var data = new ExamData(null, null, null);
    self.http.get(self.helper.getApiUrl(url), function (json) {
      if(json != null){
          var exam ={
            PostOpID: 0,
            PatientID: patientId,
            UserID: json.UserID,
            ProviderID: json.ProviderID,
            ExamDateTime: date,
            DateSurgery: json.DateSurgery,
            CaseID: json.CaseID,
            PostOpDays: json.PostOpDays,
            Surgeron: json.Surgeron,
            PreOpDiag: json.PreOpDiag,
            PostOpDiag: json.PostOpDiag,
            Procedure: json.Procedure,
            Timeframe: json.Timeframe,
            TYPE: json.TYPE,
            IsComplete: json.IsComplete,
            DateCreated: json.DateCreated,
            DateModified: json.DateModified,
            BodyPart: json.BodyPart,
            ChartNoteExam: json.ChartNoteExam
          }
          data.exam = exam;

          var plan={
            PlanID: 0,
            PlanText: json.PlanText,
            PatientID: patientId,
            UserID: json.UserID,
            ProviderID: json.ProviderID,
            ExamDateTime: date,
            BodyPart: json.BodyPart
          }

          data.plan = plan;

          var hpi={
            HPIID: 0,
            BodyPart: json.BodyPart,
            BodySide: json.BodySide,
            VisitDate: date,
            HpiText: json.HpiText,
            PatientID: patientId,
            UserID: json.UserID,
            ProviderID: json.ProviderID,
          }

          data.hpi = hpi;
      }
      callback(data);
    });
  }

  getExamData(patientId, providerId, date, callback){
    var self = this;
    var url = "examfollowup/patients/"+patientId+"/providers/"+providerId+"/date/"+date;
    var data = new ExamData(null, null, null);
    self.http.get(self.helper.getApiUrl(url), function (json) {
      if(json != null){
        data.exam = json;
      }

      url = "hpis/patients/"+patientId+"/providers/"+providerId+"/date/"+date;
      self.http.get(self.helper.getApiUrl(url), function (json) {
        if(json != null){
          //data.hpi = json;
          //just get first hpi??
          if(json.length > 0){
            data.hpi = json[0];
          }
        }

        url = "plans/patients/"+patientId+"/providers/"+providerId+"/date/"+date;
        self.http.get(self.helper.getApiUrl(url), function (json) {
          if(json != null){
            //data.plan = json;
            //just get first plan..
            if(json.length > 0){
              data.plan = json[0];
            }
          }

          callback(data);
        });
      });
    });
  }

  deleteExamData(examData, planData, historyData, callback) {
    const self = this;
    console.log('DELETE EXAM DATA', examData);
    if(examData && (examData.PostOpID > 0)) {
      let examFollowupUrl = `examfollowup?id=${examData.PostOpID}`;
      self.http.del(self.helper.getApiUrl(examFollowupUrl), (returnData) => {
        if(returnData === true){
            examData = null;
        }
        if(callback) callback();
      }, (error) => {
        alert(error.responseText);
      });
    } else {
      if(callback) callback();
    }
    if(historyData && (historyData.HPIID > 0)){
      let hpiUrl = `hpis?id=${historyData.HPIID}`;
      self.http.del(self.helper.getApiUrl(hpiUrl), (returnData) => {
        if(returnData === true){
          historyData = null;
        }
        if(callback) callback();
      }, (error) => {
        alert(error.responseText);
      });
    } else {
      if(callback) callback();
    }
    if(planData && (planData.PlanID > 0)){
      let plansUrl = `plans/${planData.PlanID}`;
      self.http.del(self.helper.getApiUrl(plansUrl), (returnData) => {
        if(returnData === true){
          planData = null;
        }
        if(callback) callback();
      }, (error) => {
        alert(error.responseText);
      });
    } else {
      if(callback) callback();
    }
  }

  saveExamData(examData, planData, historyData, providerId, examDateTime, patientId, bodyPart, examType, callback){
    let self = this;
    let userId = self.helper._user.UserID;
    let examFollowupUrl = 'examfollowup';
    let hpiUrl = 'hpis';
    let plansUrl = 'plans';

    if(examData && (!examData.PostOpID || examData.PostOpID === 0)) {
      examData.PatientID = patientId;
      examData.ExamDateTime = examDateTime;
      examData.ProviderID = providerId;
      examData.UserID = userId;
      examData.BodyPart = bodyPart;
      examData.TYPE = examType;

      self.http.post(self.helper.getApiUrl(examFollowupUrl), examData, (returnData) => {
        //examData.exam = returnData;
        examData.PostOpID = returnData.PostOpID;
        if(callback) callback();
      }, null, (error) => {
        alert(error.responseText);
      });

    } else if(examData && examData.PostOpID > 0){
      examData.TYPE = examType;

      self.http.put(self.helper.getApiUrl(examFollowupUrl), examData, (returnData) => {
        //examData.exam = returnData;
        if(callback) callback();
      }, (error) => {
        alert(error.responseText);
      });

    } else {
      if(callback) callback();
    }

    let hpiData = historyData;
    if(hpiData && (!hpiData.HPIID || hpiData.HPIID === 0)){
      hpiData.PatientID = patientId;
      hpiData.VisitDate = examDateTime;
      hpiData.ProviderID = providerId;
      hpiData.UserID = userId;
      hpiData.BodyPart = bodyPart;
      hpiData.IsOrigin=false;
      hpiData.HpiType = examType;

      self.http.post(self.helper.getApiUrl(hpiUrl), hpiData, (returnData) => {
        //examData.hpi = returnData;
        hpiData.HPIID = returnData.HPIID;
        if(callback) callback();
      }, null, (error) => {
        alert(error.responseText);
      });

    } else if(hpiData && hpiData.HPIID > 0) {
      hpiData.HpiType = examType;

      self.http.put(self.helper.getApiUrl(hpiUrl), hpiData, (returnData) => {
        //examData.hpi = returnData;
        if (callback) callback();
      }, (error) => {
        alert(error.responseText);
      });

    } else {
      if (callback) callback();
    }

    let plansData = planData;
      if(plansData && (!plansData.PlanID || plansData.PlanID === 0)){

        plansData.PatientID = patientId;
        plansData.ExamDateTime = examDateTime;
        plansData.ProviderID = providerId;
        plansData.UserID = userId;
        plansData.BodyPart = bodyPart;
        plansData.IsOrigin = false;
        plansData.PlanType = examType;

        self.http.post(self.helper.getApiUrl(plansUrl), plansData, (returnData) => {
          //examData.plan = returnData;
          plansData.PlanID = returnData.PlanID;
          if(callback) callback();
        }, null, (error) => {
          alert(error.responseText);
        });

      } else if(plansData && plansData.PlanID > 0) {
        plansData.PlanType = examType;

        self.http.put(self.helper.getApiUrl(plansUrl), plansData, (returnData) => {
          //examData.plan = returnData;
          if(callback) callback();
        }, (error) => {
          alert(error.responseText);
        });

      } else {
        if(callback) callback();
      }

  }

  checkForProcedureCode(providerId, examDate, patientId, callback){
    const self = this;

    const url =`patientprocedures/patients/${patientId}/providers/${providerId}/date/${examDate}`;
    self.http.get(self.helper.getApiUrl(url),function(res){
      if(res != null && res.length > 0){
        //get first with type = visit and bodypart = all
        var found = _.find(res, (data)=>{
          return data.BodyPart != null &&
            data.Type != null &&
            data.BodyPart.toLowerCase()=='all' &&
            data.Type.toLowerCase() == 'visit'
        })
        callback(found);
      }else{
        callback(null);
      }
    });


    // const codes = self.getCodesForCheck();
    // const stringifiedCodes = JSON.stringify(codes);
    //const url = `patientprocedures/check?providerId=${providerId}&examDateTime=${examDate}&patientId=${patientId}`;
    // self.http.post(self.helper.getApiUrl(url), stringifiedCodes, (returnData) => {
    //   console.log('CHECKED FOR CODES!', returnData);
    //   if(callback) callback(returnData);
    // }, {contentType: 'application/json'});
  }

  // getCodesForCheck() {
  //   const self = this;
  //   const codes = self.getEncounterCodes();
  //   const allCodes = [];
  //   for(let i = 0; i< codes.provider.length; i++){
  //     allCodes.push(codes.provider[i].code);
  //   }
  //   for(let i = 0; i< codes.nonProvider.length; i++){
  //     allCodes.push(codes.nonProvider[i].code);
  //   }
  //   return allCodes;
  // }


  // getEncounterCodes(){
  //
  //   let codes = {
  //     "provider":[],
  //     "nonProvider":[]
  //   };
  //
  //   let g2012 = new EncounterCode('G2012', "Brief Check in by MD/QHP 5-10 minutes", true);
  //   codes.provider.push(g2012);
  //   let c99421 = new EncounterCode(99421, "Online digital E & M <11 minutes", true);
  //   codes.provider.push(c99421);
  //   let c99422 = new EncounterCode(99422, "Online digital E & M  11-20 minutes", true);
  //   codes.provider.push(c99422);
  //   let c99423 = new EncounterCode(99423, "Online digital E & M  21 minutes", true);
  //   codes.provider.push(c99423);
  //
  //   codes.nonProvider.push(g2012);
  //   let c98970 = new EncounterCode(98970, "Online digital E & M <11 minutes", false);
  //   codes.nonProvider.push(c98970);
  //   let c98971 = new EncounterCode(98971, "Online digital E & M 11-20 minutes", false);
  //   codes.nonProvider.push(c98971);
  //   let c98972 = new EncounterCode(98972, "Online digital E & M 21 minutes", false);
  //   codes.nonProvider.push(c98972);
  //
  //   return codes;
  //
  // }

  updateSelectedCode(patientPx, callback){
    const self = this;
    const url = 'patientprocedures'
    self.http.put(self.helper.getApiUrl(url), patientPx, (returnData) => {
      callback(returnData);
    }, (error) => {
      alert(error.responseText);
    });
  }

  saveSelectedCode(patientPx, callback){
    const self = this;
    const url = 'patientprocedures'

    self.http.post(self.helper.getApiUrl(url), patientPx, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
    });


      // const codes = [];
      // codes.push(patientPx.CptCode);
      //const url = 'patientprocedures/savewithcheck';
      // const allData = {patientPx: patientPx, codes: codes};
      // const stringifiedData = JSON.stringify(allData);
      // self.http.post(self.helper.getApiUrl(url), stringifiedData, (returnData) => {
      //     callback(returnData);
      // }, {contentType: 'application/json'});
  }

  savePreference(preference, callback){
    const self = this;
    const url = 'examfollowup/preferences';
    const stringifiedData = JSON.stringify(preference);
    self.http.post(self.helper.getApiUrl(url), stringifiedData, (returnData) => {
      callback(returnData);
    }, {contentType: 'application/json'});
  }

  updatePreference(preference, callback){
    const self = this;
    const url = 'examfollowup/preferences';
    self.http.put(self.helper.getApiUrl(url), preference, (returnData) => {
      //examData.exam = returnData;
      if(callback) callback();
    }, (error) => {
      alert(error.responseText);
    });
  }

}
