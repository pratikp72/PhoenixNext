import {inject} from 'aurelia-framework';
//import moment from 'moment';
import * as _ from 'lodash';
import { Data } from '../data/go/data';
import { helper } from '../helpers/helper';

class PrefButton{
  constructor(name, data, visible, editing){
    this.name = name;
    this.data = data;
    this.selected = false;
    this.visible = visible == undefined ? false : visible;
    this.editing = editing ? editing : false;
  }

  select(){
    this.selected = this.selected ? false : true;
  }
}

class WorkflowRow{
  constructor(patientId, name, date, result){
    this.patientId= patientId;
    this.name= name;
    this.date=date;
    this.result=result;
    this.displayReason=false;
    this.status;
    this.reason;
  }

  toggleReason(){
    this.displayReason = this.displayReason ? false : true;
  }
}


@inject(Data, helper)
export class WorkflowHelper {


  preferenceObject=null;

  constructor(Data, helper) {
    this.data = Data;
    this.helper = helper;
  }

  workflowInitiatedForProvider(providerId){
    if(this.preferenceObject == null){
      return false;
    }
    return this.preferenceObject.providerId == providerId ? true : false;
  }

  initWorkflowForProvider(id, callback){
    let self = this;
    self.preferenceObject=null;
    self._getWorkflowPrefs(id, function(prefs){
      self.preferenceObject = prefs;
      callback(prefs ? true : false)
    });
  }

  _createWorkflowPrefObject(prefData, initialize){
    let self = this;
    let prefObj={
      providerId:prefData.ProviderID,
      prefs:[]
    }
    let keys = Object.keys(prefData);
    let vals = Object.values(prefData);
    for(let i = 0; i < keys.length; i++){

      let tKey = keys[i];
      //ignores...
      if(tKey == 'ProviderID' || tKey == 'VisitCode' || tKey == 'ReferralLetter' || tKey == 'FollowUpNote' || tKey == 'jsonDocumentPref'){
        continue;
      }

      //change officeNote=>Document
      if(tKey == 'OfficeNote'){
        tKey = 'Document';
      }

      let prefItem = new PrefButton(tKey, prefData, true, true);
      if(initialize){
        prefItem.selected = true;
      }else{
        prefItem.selected = vals[i] == null ? false : vals[i];
      }
      prefObj.prefs.push(prefItem);
    }

    return prefObj;
  }

  _getWorkflowPrefs(providerId, callback){
    let self = this;
    self.data.getWithUrl(`workflow/pref?providerId=${providerId}`, function(res){
      let pref=null;
      if(res != null){
        pref = self._createWorkflowPrefObject(res);
        callback(pref);
      }else{
        self.data.getWithUrl('workflow/pref', function(res){
          pref = self._createWorkflowPrefObject(res, true);
          callback(pref);
        });
      }
    });
  }

  getWorkflow(providerId, fromDate, toDate, callback){
    let self = this;
    let url = `workflow?providerId=${providerId}&fromDate=${fromDate}&toDate=${toDate}`;
    self.data.getWithUrl(url, function(res){
      callback(self.calculateWorkflowWithResults(res));
    })
  }

  _isPrefItemSelected(name, prefObject){
    return _.find(prefObject.prefs, function(p){return p.name == name && p.selected == true});
  }

  calculateWorkflowWithResults(results){
    let self = this;

    if(self.preferenceObject==null){
      return {
        rows: [],
        incompleteCount: -1
      }
    }

    var incompleteCount = 0;
    var rows=[];

    for(let i = 0; i < results.length; i++){
      let result = results[i];
      let status = true;
      let reason="";

      let row =  _.find(rows, function(p){return p.patientId == result.PATIENTID});
      if(!row){
        //add HISTORY to result....
        result['HISTORY']=false;
        row = new WorkflowRow(result.PATIENTID, result.PATIENTNAME, moment(result.EXAMDATETIME).format('MM/DD/YYYY'), result);
        rows.push(row);
      }

      // if(result.VISITCOMPLETED == true){
      //   // if(result.VISITCOMPLETED == true){
      //   row.result.VISITCOMPLETED = true;
      //   status = true;
      //   // }
      // }else{
        // incompleteCount++;

        let checkPx = self._isPrefItemSelected('Procedure', self.preferenceObject);
        if(checkPx && row.result.PATIENTCPTID != true){
          if(result.PATIENTCPTID==0){
            status = false;
            reason = reason.concat("No procedure.");
          }else{
            row.result.PATIENTCPTID = true;
          }
        }


        let checkDx = self._isPrefItemSelected('Diagnosis', self.preferenceObject);
        if(checkDx && row.result.PATIENTDXID != true){
          if(result.PATIENTDXID==0){
            status = false;
            reason = reason.concat("No diagnosis.");
          }else{
            row.result.PATIENTDXID = true;
          }
        }

        let checkXray = self._isPrefItemSelected('XRay', self.preferenceObject);
        if(checkXray){
          //if no xray has been performed, handle it as complete
          if(result.XRAYID == 0){
            row.result.XRAYCOMPLETE = true;
            //if an xray has been performed, and it has findings, handle it as complete
          }else if(result.XRAYID != 0 && !self.helper.isStringNullOrEmpty(result.XRAYFINDING)){
            row.result.XRAYCOMPLETE = true;
          }else{
            row.result.XRAYCOMPLETE = false;
            status = false;
            reason = reason.concat("Pending X-Ray findings.");
          }
        }
        let checkHpi = self._isPrefItemSelected('HPI', self.preferenceObject);
        if(checkHpi && row.result.CHARTNOTEHPI !=true){
          if (result.CHARTNOTEHPI == false && result.POSTOP == false)
          {
            status = false;
            reason = reason.concat("No HPI.");
          }else{
            row.result.CHARTNOTEHPI = true;
          }
        }

        let checkPlan = self._isPrefItemSelected('Plan', self.preferenceObject);
        if(checkPlan && row.result.PLAN !=true){
          if(!self.helper.isStringNullOrEmpty(result.CHARTNOTEPLAN) || result.PLAN == true){
            row.result.PLAN = true;
          }else{
            status = false;
            reason = reason.concat("No Plan.");
          }
        }

        let checkExam = self._isPrefItemSelected('Exam', self.preferenceObject);
        if(checkExam && row.result.CHARTNOTEEXAM != true){

          let isExamComplete = false;
          let ankleIsComplete = result.ANKLE;
          let cervicalIsComplete = result.CERVICAL;
          let elbowIsComplete = result.ELBOW;
          let handIsComplete = result.HAND;
          let hipIsComplete = result.HIP;
          let kneeIsComplete = result.KNEE;
          let lumbarIsComplete = result.LUMBAR;
          let shoulderIsComplete = result.SHOULDER;


          if(!self.helper.isStringNullOrEmpty(result.CHARTNOTEEXAM)){
            isExamComplete = true;
            row.result.CHARTNOTEEXAM = true;
          }

          if (!isExamComplete)
          {
            if ((!ankleIsComplete ) &&
              (!cervicalIsComplete ) &&
              (!elbowIsComplete ) &&
              (!handIsComplete ) &&
              (!hipIsComplete ) &&
              (!kneeIsComplete ) &&
              (!lumbarIsComplete) &&
              (!shoulderIsComplete))
            {
              status = false;
              reason = reason.concat("No exam.");
            }else{
              row.result.CHARTNOTEEXAM = true;
            }
          }
        }

        let checkHx = self._isPrefItemSelected('History', self.preferenceObject);
        if(checkHx && row.result.HISTORY != true){
          let phxIsComplete = result.PHX;
          let pfhxIsComplete = result.PFHX;
          let rosIsComplete = result.ROS;
          let sochxIsComplete = result.SOCHX;

          if (!phxIsComplete || !pfhxIsComplete || !rosIsComplete || !sochxIsComplete)
          {
            status = false;
            reason = reason.concat("No History.");
          }else{
            row.result.HISTORY=true;
          }
        }


        let checkDoc = self._isPrefItemSelected('Document', self.preferenceObject);
        if(checkDoc){
          if (result.DOCTYPE == null){
            status = false;
            reason = reason.concat("No Document.");
          }else{
            row.result.DOCTYPE = true;
          }
        }

        row['status']=status;
        row['reason']=reason;

        if(!status){
          incompleteCount++;
        }

      //}
    }

    return {
      rows: rows,
      incompleteCount: incompleteCount
    }
  }
}
