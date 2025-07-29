import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../../helpers/http';
import {helper} from '../../helpers/helper';


@inject(DialogController, http, helper)
export class GenericPicklistPopup {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  items=[];
  header;
  selectedItem;

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

    self.header = obj.header;
    self.description = obj.description;

    self.items = obj.items;
  }

  attached(){
    let self = this;
    var res = $(self.genpicklist).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    // var overlays = $('ux-dialog-overlay');//.closest('ux-dialog-container');
    // for(let i = 0; i < overlays.length; i++){
    //   let over = overlays[i];
    //   over.style.setProperty("z-index", "5001", "important");
    // }
  }

  ok(){
    let self = this;
    self.dialogController.close(true, {item: self.selectedItem});
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
