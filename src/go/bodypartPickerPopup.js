import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';


class BodypartSelect{
  constructor(bodypartSide){
    this.bodypartSide = bodypartSide;
    this.selected = false;
  }

  select(){
    this.selected = this.selected ? false : true;
  }
}

@inject(DialogController, http, helper)
export class BodypartPickerPopup {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  bodyparts=[];

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  activate(obj){
    let self = this;
    self.popupWidth = obj.popupWidth / 4;
    self.popupHeight = obj.popupHeight / 4;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;

    for(let i = 0; i < obj.bodyparts.length; i++){
      self.bodyparts.push(new BodypartSelect(obj.bodyparts[i]));
    }
  }

  ok(){
    let self = this;
    let selectedBodyparts = [];
    for(let i = 0; i < self.bodyparts.length; i++){
      if(self.bodyparts[i].selected){
        selectedBodyparts.push(self.bodyparts[i].bodypartSide);
      }
    }

    self.dialogController.close(true, {bodyparts: selectedBodyparts});
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
