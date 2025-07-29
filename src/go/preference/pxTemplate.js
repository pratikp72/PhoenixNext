import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import {PopupHelper} from "../popupHelper";

@inject(PopupHelper)
export class PxTemplate {

  section=null;

  // @observable selectedMod=null;
  // selectedModChanged(newVal, oldVal){
  //   this.section.modifier = newVal;
  // }
  templateId;

  modList = ['22', '24', '25', '26', '50', '51', '52', '55', '56', '57', '58',
  '59', '76', '77', '78', '79', '81', '93', '94', '95', 'LT', 'RT',
      'AS', 'CH', 'CI', 'CJ', 'CK', 'CL', 'CM', 'CN',
      'CO', 'CQ', 'FA', 'FY', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9',
      'GA', 'GO', 'GP', 'GY', 'GZ', 'KX', 'NU', 'Q7', 'Q8', 'Q9',
      'TA', 'TC', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9',
      'XE', 'XS', 'XP', 'XU'];

  constructor(PopupHelper) {
    this.popHelper = PopupHelper;
  }

  activate(params) {
    var self = this;
    let p = params;
    self.section = params;
    self.templateId = self.section.name.toLowerCase() + "Section";
  }

  displayPxPop(){
    let self = this;

    self.popHelper.openPxPop(self.bodypart, self.bodyside, undefined, function(res){
      // var aDx = self.createDxObject(res);
      // let todayDate = moment(self.date).format('MM/DD/YY');
      // if(!self.doesDiagnosisExist(aDx.code, todayDate)){
      //   //add to diagnosis???
      //   self.data.splice(0, 0, aDx);
      //   self.saveDiagnoses();
      // }else{
      //   self.displayExistingDxAlert(aDx);
      //   return;
      // }
    });

  }

}
