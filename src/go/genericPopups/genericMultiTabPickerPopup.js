import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../../helpers/http';
import {helper} from '../../helpers/helper';


@inject(DialogController, http, helper)
export class GenericMultiTabPickerPopup {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  items=[];
  header;

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

    self.deselectItems();

    var res = $(self.genmultipicklist).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    var overlays = $('ux-dialog-overlay');
    for(let i = 0; i < overlays.length; i++){
      let over = overlays[i];
      over.style.setProperty("z-index", "5001", "important");
    }
  }

  itemClick(i){
    let self = this;
    i.selected = i.selected ? false : true;
  }

  deselectItems(){
    let self = this;
    for(let i = 0; i < self.items.length; i++){
      self.items[i].selected=false;
    }
  }

  getSelectedItems(){
    let self = this;
    let selected = [];
    for(let i = 0; i < self.items.length; i++){
      if(self.items[i].selected){
        selected.push(self.items[i]);
      }
    }
    return selected;
  }

  ok(){
    let self = this;

    let selectedItems = self.getSelectedItems();

    self.dialogController.close(true, {items: selectedItems});
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
