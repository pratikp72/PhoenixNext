/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';

@inject(DialogController, http, helper)
export class Calculator {

  row = null;
  cell = null;
  rowIndex = -1;
  cellIndex =-1;
  value=null;
  activity=null;
  actPass=null;
  backgroundColor="transparent";
  dgHelper = null;

  constructor(DialogController, http, helper){
    this.message = "test login message";
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  close(){
    let self = this;
    self.dialogController.close(true, {"activity": self.activity, "value" : self.value, "actPass": self.actPass, "backgroundColor": self.backgroundColor});
  }

  activate(model){
    let self = this;
    self.dgHelper = model.helper;
    self.activity = model.activity;
    self.value = model.activity.value;
    self.actPass = model.activity.data == null ? null : model.activity.data.ActPass;
    if(self.actPass != null){
      //set color
      self.backgroundColor = self.dgHelper ? self.dgHelper.getActivityBackgroundColorByActPass(self.actPass) : self.backgroundColor;
    }
  }


  valueClick(dom){
    var v = dom.target.value;
    var tValue = this.value + " " + v;
    this.value =tValue;
  }

  clear(){
    this.value="";
    this.actPass=null;
  }

  numberClick(dom){
    var v = dom.target.value;
    var tValue;

    if(this.value == undefined || this.value == null){
      this.value="";
    }

    if(this.afterText()){
      tValue = this.value + " " + v;
    }else{
      tValue = this.value + v;
    }

    this.value =tValue;
  }

  linkClick(e){
    var txt = e.target.text;
    var tTxt = this.value + " " + txt;
    this.value = tTxt;
  }

  afterText() {
    var aList = ["reps", "lbs", "to"];
    for(var i = 0; i < aList.length; i++)
    {
      if (this.value.toLowerCase().endsWith(aList[i])){
        return true;
      }
    }
    return false;
  }

  actPassClick(val){
    this.actPass=val;
    this.backgroundColor = this.dgHelper ? this.dgHelper.getActivityBackgroundColorByActPass(this.actPass) : this.backgroundColor;
    ;
  }

}
