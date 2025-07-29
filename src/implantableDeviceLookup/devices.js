/**
 * Created by montymccune on 5/7/18.
 */

import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject} from 'aurelia-framework';
import {DialogService} from 'aurelia-dialog';
import {DevicePop} from './devicePop';


class OD_Patient_Implantable {
  constructor(id, patientId, json, status){
    this.PatientId = patientId;
    this.Id = id;
    this.Json = json;
    this.Status = status;
    this.statusCss = this.Status === "Active" ? "btn btn-primary" : "btn btn-secondary";
  }
}

@inject(helper,http, DialogService)
export class Devices {

  patientDevices = [];
  patientId;

  constructor(helper, http, DialogService){
    this.helper = helper;
    this.http = http;
    this.dialogService = DialogService;
  }

  activate(params) {

    console.log('window', window);

    var self = this;

    //here we check for out authentication key
    //IF it hasn't been obtained yet, we look to the query string
    if(typeof this.helper.jwt() === 'undefined' ||
      this.helper.jwt() == null){

      //if we find an API key in the query string
      //we need to re-authenticate to make sure it is still valid
      if (params.hasOwnProperty("jwt")){
        this.helper.processToken(params.jwt);
      }
    }
    else{
      //if we already have the apiKey we dont need to authenticate
      //mustAuthenticate = false;
    }

    if (params.hasOwnProperty("patientid")){
      this.patientId = params.patientid;
    }


    this.getPatientDevices();

  }

  attached(){

  }


  save(device){

  var self = this;

  var config = {};

  var pi = new OD_Patient_Implantable(0, this.patientId, JSON.stringify(device.Json), "Active");

  var url = 'patient/implantables';
  this.http.post(this.helper.getApiUrl(url), pi, function(res){

    var d = res;

    self.patientDevices.push(new OD_Patient_Implantable(d.Id, d.PatientId, JSON.parse(d.Json), d.Status));

  }, config);
}


  update(device, index) {

    var self = this;

    var status = device.Status == "Active" ? "Inactive" : "Active";
    device.Status = status;

    var pi = new OD_Patient_Implantable(device.Id, this.patientId, JSON.stringify(device.Json), device.Status);
    var url = 'patient/implantables';

    this.http.put(this.helper.getApiUrl(url), pi, function (res) {

      var d = res;

      //self.patientDevices[index] = new OD_Patient_Implantable(d.Id, d.PatientId, JSON.parse(d.Json), d.Status);
      self.patientDevices.splice(index, 1);
      self.patientDevices.splice(index, 0, new OD_Patient_Implantable(d.Id, d.PatientId, JSON.parse(d.Json), d.Status));
      //self.patientDevices.push(new OD_Patient_Implantable(d.Id, d.PatientId, JSON.parse(d.Json), d.Status));

    });
  }


  deviceLookupPop(){

    var self = this;

    this.dialogService.open({ viewModel: DevicePop, model: null, lock: false }).whenClosed(response => {
      if (!response.wasCancelled) {
        console.log('good - ', response.output);

        self.save(response.output[0]);


      } else {
        console.log('bad');
      }
      console.log(response.output);
    });
  }

  getPatientDevices(){
    var self = this;
    var url = 'patient/implantables?patientId=' + self.patientId;
    self.http.get(self.helper.getApiUrl(url), function(res){

      for(var i = 0; i < res.length; i++){

        var d = res[i];
        var json = JSON.parse(d.Json);
        var pi = new OD_Patient_Implantable(d.Id, d.PatientId, json, d.Status);
        self.patientDevices.push(pi);
      }

    });
  }


  delete(device, index){

    var self = this;
    var url = 'patient/implantables?id=' + device.Id;
    self.http.del(self.helper.getApiUrl(url), function(res){

      if(res === "true"){
        for(var i = 0; i < self.patientDevices.length; i++){
          var d= self.patientDevices[i];
          if(d.Id == device.Id){
            self.patientDevices.splice(i, 1);
          }
        }
      }

    });
  }

}
