import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {inject, bindable} from 'aurelia-framework';
import {Data} from "../../data/go/data";
import moment from 'moment';
import {PopupHelper} from "../../go/popupHelper";


@inject(helper, http, Data, PopupHelper)
export class DbMaintenance {

  @bindable deletePatientDatepicker;
  deletePatientVisitPatientId;
  deletePatientVisitDate = moment().format('MM/DD/YYYY');

  @bindable changeVisitOriginalDatepicker;
  @bindable changeVisitNewDatepicker;
  changeVisitDatePatientId;
  changeVisitDateOriginal= moment().format('MM/DD/YYYY');
  changeVisitDateNew= moment().format('MM/DD/YYYY');

  @bindable changePatientDatepicker;
  changePatientOriginalPatientId;
  changePatientNewPatientId;
  changePatientDate= moment().format('MM/DD/YYYY');

  constructor(helper, http, Data, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.popupHelper = PopupHelper;
  }

  activate(obj) {
    let self = this;

  }

  openCalendar(){
    this.mydatepicker.methods.toggle();
  }

  deletePatientVisit(callback){
    let self = this;
    let url = `helpers/deletepatientvisit?patientId=${self.deletePatientVisitPatientId}&date=${self.deletePatientVisitDate}`;
    self.goData.deleteWithUrl(url, function(res){
      callback(res);
    });
  }

  changeVisitDate(callback){
    let self = this;
    let url = `helpers/changeVisitDate?originalDate=${self.changeVisitDateOriginal}&newDate=${self.changeVisitDateNew}&patientId=${self.changeVisitDatePatientId}`;
    self.goData.getWithUrl(url, function(res){
      callback(res);
    });
  }

  changeVisitPatient(callback){
    let self = this;
    let url = `helpers/changeVisitPatient?originalPatientId=${self.changePatientOriginalPatientId}&newPatientId=${self.changePatientNewPatientId}&visitdate=${self.changePatientDate}`;
    self.goData.getWithUrl(url, function(res){
        callback(res);
    });
  }


  submit(messageType){
    let self = this;
    let message = `This database change is permanent. Do you wish to proceed?`;
    let header = 'WARNING!';
    let options=['YES', 'NO'];
    self.popupHelper.openGenericMessagePop(message, header, options, true, function(res){
      if(res.result == 'YES'){

        var noty = self.helper.createNoty("Updating Database...", 3000);
        noty.show();

        if(messageType=='changeVisitPatient'){
          self.changeVisitPatient(function(res){

            if(res==true){
              noty.notySuccess(noty, 'Change Visit Patient Success!');
            }else{
              noty.notyError(noty, 'Change Visit Patient Failed!');
            }
            noty.close();
          });
        }else if(messageType == 'changeVisitDate'){
          self.changeVisitDate(function(res){
            if(res==true){
              noty.notySuccess(noty, 'Change Visit Date Success!');
            }else{
              noty.notyError(noty, 'Change Visit Date Failed!');
            }
            noty.close();
          });
        }else{
          self.deletePatientVisit(function(res){
            if(res==true){
              noty.notySuccess(noty, 'Delete Patient Visit Success!');
            }else{
              noty.notyError(noty, 'Delete Patient Visit Failed!');
            }
            noty.close();
          });
        }
      }
    });
  }
}
