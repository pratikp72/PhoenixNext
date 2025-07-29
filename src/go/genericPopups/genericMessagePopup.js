import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../../helpers/http';
import {helper} from '../../helpers/helper';


@inject(DialogController, http, helper)
export class GenericMessagePopup {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  message="";
  header="";
  buttonOptions=[];

  contentHeight;
  customTemplate;
  styleClass;

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  activate(obj){
    let self = this;
    self.popupWidth = obj.popupWidth / 3;
    self.popupHeight = obj.popupHeight / 4;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;
    self.contentHeight = self.popupHeight * 0.5;

    self.message = obj.message;
    self.header = obj.header;
    self.buttonOptions = obj.options.buttons;
    if(obj.options.hasOwnProperty('template')){
      self.customTemplate = obj.options.template;
    }
    if(obj.options.hasOwnProperty('alertType')){
      if(obj.options.alertType=='warning'){
        self.styleClass = 'alert-warning';
      }
    }
  }

  attached(){
    let self = this;
    var res = $(self.messagepop).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");
  }

  buttonClick(data){
    let self = this;
    self.dialogController.close(true, {result: data});
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
