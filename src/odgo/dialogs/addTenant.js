import {inject, bindable} from 'aurelia-framework';
//import moment from "moment";
import {Data} from '../../data/go/data';
import {DialogController} from 'aurelia-dialog';

@inject(Data, DialogController)
export class AddTenant {

  dbNames=[];
  selectedDatabase;
  tenantId;

  constructor(Data, DialogController){
    this.goData = Data;
    this.dialogController = DialogController;
  }

  cancel(){
    this.dialogController.cancel();
  }

  close(){
    this.dialogController.close(true, {'tenantId': this.tenantId, 'database': this.selectedDatabase});
  }

  activate(model){
    let self = this;
    self.dbNames = model.dbNames;
  }
}
