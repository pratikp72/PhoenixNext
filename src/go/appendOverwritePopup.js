import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';


@inject(DialogController, http, helper)
export class AppendOverwritePopup {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;
  headerText;
  bodyText;

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  activate(obj){
    let self = this;
    self.headerText = obj.headerText;
    self.bodyText = obj.bodyText;
    self.popupWidth = obj.popupWidth / 3;
    self.popupHeight = obj.popupHeight / 4;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;
  }

  append(){
    let self = this;
    self.dialogController.close(true, {result: "append"});
  }

  overwrite(){
    let self = this;
    self.dialogController.close(true, {result: "overwrite"});
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
