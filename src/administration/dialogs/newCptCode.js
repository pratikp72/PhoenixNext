import {inject} from "aurelia-dependency-injection";
import { observable } from 'aurelia-framework';
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";
import {DialogController} from 'aurelia-dialog';

@inject(helper, http, Data, DialogController)
export class NewCptCode {

  buttonText="";
  code=null;
  types=["Arthroplasty", "Bone Scan", "CT", "CVX", "DME", "Fracture Care", "Injection", "JCODE", "MRI", "OPS", "OPX", "OT", "PT", "Surgery", "Visit", "X-RAY"];
  bodyparts=[];
  canSave = false;
  checkTimer;

  constructor(helper, http, Data, DialogController) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.dialogController = DialogController;
  }

  activate(obj){
    this.code = obj;
    this.buttonText = obj.ProcedureID == 0 ? 'ADD' : 'UPDATE';

    let self = this;
    self.checkTimer = setInterval(self.checkRequirementsTick.bind(self), 1000);


    var url = 'listcombo/bodyparts';
    self.http.get(self.helper.getApiUrl(url), function(json){
      self.bodyparts = json;
      //insert JOINTs
      var joint={
        ListID:0,
        ListType:"Bodypart",
        Description1:"Joint"
      }
      self.bodyparts.push(joint);
    });
  }

  detached(){
    clearInterval(this.checkTimer);
  }

  add(){
    let self = this;
    if(self.checkRequirements()){

      // if(self.newUserCreated){
      //   self.dialogController.close(false, self.code);
      // }else{
      self.code.Body_Part = self.code.Body_Part.Description1;


      self.dialogController.close(true, self.code);
      //}
    }
  }

  checkRequirementsTick(){
    let self = this;
    self.canSave = self.checkRequirements();
  }

  checkRequirements(){
    let self = this;

    if(self.code.CptKey &&
      self.code.Description &&
      self.code.Type &&
      self.code.Body_Part &&
      self.code.Billable &&
      self.code.Units != null){

        return true;

    }else{
      return false;
    }
  }


}
