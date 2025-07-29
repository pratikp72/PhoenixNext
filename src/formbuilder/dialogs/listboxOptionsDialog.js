import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import { formhelper } from '../formhelper';
import {EventAggregator} from 'aurelia-event-aggregator';
import { PopupHelper } from '../../go/popupHelper';
import * as _ from 'lodash';


@inject(DialogController, formhelper, EventAggregator, PopupHelper)
export class ListboxOptionsDialog {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  options=[];
  optionToAdd=null;

  showSaveButton=true;

  showNormal=false;
  showName=false;
  listName=null;
  canAdd=true;

  listHeight=200;

  get enableAdd(){
    if(this.canAdd){
      //SQL exists???
      var sql = _.find(this.options, function(o){return o.sql != null});
      return !sql ? true : false;
    }else{
      return false;
    }
  }

  get enableAddSql(){
    return this.canAdd && this.options.length == 0 ? true : false;
  }

  constructor(DialogController, formhelper, EventAggregator, PopupHelper){
    this.dialogController = DialogController;
    this.formHelper = formhelper;
    this.ea = EventAggregator;
    this.popupHelper = PopupHelper;
  }

  activate(obj){
    let self = this;

    if(obj && obj.hasOwnProperty('showSaveButton')){
      this.showSaveButton = obj.showSaveButton;
    }
    if(obj && obj.hasOwnProperty('showNormal')){
      this.showNormal = obj.showNormal;
    }
    if(obj && obj.hasOwnProperty('showName')){
      this.showName = obj.showName;
      this.listName = obj.name;
    }
    if(obj && obj.hasOwnProperty('canAdd')){
      this.canAdd = obj.canAdd;
    }

    if(obj && obj.options){
      self.options = this.convertOptionsToNewFormat(obj.options);
    }

    if(obj && obj.hasOwnProperty('listHeight')){
      self.listHeight = obj.listHeight;
    }
  }

  convertOptionsToNewFormat(options){
    //check for Text property...
    var newFormat = _.find(options, function(o){return o.text});
    if(!newFormat){
      //update to new format...
      var newOptions=[];
      for(var i = 0; i < options.length; i++){
        var listItm = this.formHelper.getNewListItem(options[i], false);
        newOptions.push(listItm);
      }
      return newOptions;
    }else{
      return options;
    }
  }

  normalClicked(o){
    var normal = o.normal ? false : true;
    for(let i = 0; i < this.options.length; i++){
      if(this.options[i].text == o.text){
        this.options[i].normal = normal;
      }else{
        this.options[i].normal = normal ? false : true;
      }
    }
  }

  editClicked(o){
    let self = this;
    self.popupHelper.openSqlSelector(function(sqlObj){

      if(self.options.length > 0){
        //update
        self.options[0].sql = sqlObj;
      }else{
        //add
        var listItm = self.formHelper.getNewListItem('SQL', false);
        listItm.sql = sqlObj;
        self.options.push(listItm);
        self.optionToAdd = null;
        self.ea.publish("listboxOptionChanged", self.options);
      }

    }, {sqlObj: o.sql});
  }

  ok(){
    let self = this;
    self.dialogController.close(true, {options: self.options});
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  addOption(){
    if(this.optionToAdd && this.optionToAdd.length > 0){
      var listItm = this.formHelper.getNewListItem(this.optionToAdd, false);
      this.options.push(listItm);
      this.optionToAdd = null;
      this.ea.publish("listboxOptionChanged", this.options);
    }
  }
  
  addSql(){
    let self = this;
    self.popupHelper.openSqlSelector(function(sqlObj){
      var listItm = self.formHelper.getNewListItem('SQL', false);
      listItm.sql = sqlObj;
      self.options.push(listItm);
      self.optionToAdd = null;
      self.ea.publish("listboxOptionChanged", self.options);

    }, null);
  }

  deleteOption(o){
    for(let i = 0; i < this.options.length; i++){
      var op = this.options[i];
      if(op.text == o.text){
        this.options.splice(i, 1);
        this.ea.publish("listboxOptionChanged", this.options);
        break;
      }
    }
  }
}
