import {inject, bindable} from 'aurelia-framework';
//import moment from "moment";
import {Data} from '../../data/go/data';
import {DialogController} from 'aurelia-dialog';

@inject(Data, DialogController)
export class AddLicense {

  licenseTypes=['PRO', 'MID', 'NOREV'];
  selectedLicenseType=null;
  expireDays=null;
  authdate;
  @bindable datepicker;

  constructor(Data, DialogController){
    this.goData = Data;
    this.dialogController = DialogController;
  }

  cancel(){
    this.dialogController.cancel();
  }

  close(){
    this.dialogController.close(true, {'licenseType': this.selectedLicenseType, 'expireDays': this.expireDays});
  }

  activate(model){
    let self = this;
    //self.authdate = moment(self.ptAuth.AuthDate).format('MM/DD/YYYY');
  }

  attached(){
    var res = $(this.addLicense).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");
  }

  openCalendar(){
    this.datepicker.methods.toggle();
  }
}
