/**
 * Created by montymccune on 5/7/18.
 */
import {DialogController} from 'aurelia-dialog';
import {http} from '../helpers/http';
import {inject} from 'aurelia-framework';

class OD_Patient_Implantable {
  constructor(id, patientId, json, status){
    this.PatientId = patientId;
    this.Id = id;
    this.Json = json;
    this.Status = status;
  }
}

@inject(DialogController, http)
export class DevicePop {
  //static inject = [DialogController];

  devices = null
  deviceValue ='00698764387125';

  constructor(DialogController, http){
    this.controller = DialogController;
    this.http = http;
  }

  activate(person){
    //this.person = person;
  }

  lookupDeviceWithDi(){

    var url = 'https://accessgudid.nlm.nih.gov/api/v1/devices/lookup.json?di=' + this.deviceValue;
    var self = this;
    this.http.get(url, function(res){

      console.log(res);

      if(res){
        var aDevice = res.gudid.device;
        var d = new OD_Patient_Implantable(0,null,aDevice, "Active");
        self.devices = [];
        self.devices.push(d);
      }

    });
  }

}
