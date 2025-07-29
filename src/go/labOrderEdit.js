import {inject} from "aurelia-dependency-injection";
import { observable } from 'aurelia-framework';
import {helper} from "../helpers/helper";
import {http} from "../helpers/http";
import {Data} from "../data/go/data";// "../../data/go/data";
import {DialogController} from 'aurelia-dialog';

@inject(helper, http, Data, DialogController)
export class LabOrderEdit {


  px=null;
  locations=[];
  selectedLocation;

  constructor(helper, http, Data, DialogController) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.dialogController = DialogController;
  }

  activate(model) {
    let self = this;
    self.px = model;

    self.getLabLocations(function(){

      if(self.px.data.LocationID){
        //set location from location list...
        self.selectedLocation = _.find(self.locations, function(l){return l.LocationID == self.px.data.LocationID});
      }

    });
  }

  attached(){
    let self = this;
    var res = $(self.laborderedit).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");
  }

  getLabLocations(callback){
    let self =this;
    self.goData.getWithUrl("locations?type=lab", function(res){
      self.locations = res;
      callback();
    });
  }

  add(){
    let self = this;

    if(self.selectedLocation){
      self.px.data.LocationID = self.selectedLocation.LocationID;
    }

    self.dialogController.close(true, self.px);
  }
}
