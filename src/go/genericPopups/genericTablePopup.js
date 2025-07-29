import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../../helpers/http';
import {helper} from '../../helpers/helper';


@inject(DialogController, http, helper)
export class GenericTablePopup {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;
  zIndex = 1000;

  rows=[];
  columnHeaders=[];
  header;
  selectedRow;
  scrollHeight;

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  activate(obj){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.popupWidth = windowWidth / 2;
    self.popupHeight = windowHeight / 2;
    self.popupTop = windowHeight / 4;
    self.popupLeft = windowWidth / 4;

    if(obj.options){
      if(obj.options.hasOwnProperty('width')){
        self.popupWidth = obj.options.width;
      }
      if(obj.options.hasOwnProperty('height')){
        self.popupHeight = obj.options.height;
      }
      if(obj.options.hasOwnProperty('top')){
        self.popupTop = obj.options.top;
      }
      if(obj.options.hasOwnProperty('left')){
        self.popupLeft = obj.options.left;
      }
      if(obj.options.hasOwnProperty('zIndex')){
        self.zIndex = obj.options.zIndex;
      }
    }

    self.header = obj.header;
    self.rows = obj.rows;
    self.columnHeaders= obj.columnHeaders;
  }

  attached(){
    this.scrollHeight = this.popupHeight - (this.dxheader.clientHeight + this.footer.clientHeight);

    var res = $(this.genTablePop).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");
  }

  rowClick(r){
    let self = this;
    self.selectedRow = r;
    for(var i = 0; i < self.rows.length; i++){
      if(self.rows[i].id == r.id){
        self.rows[i].selected = true;
      }else{
        self.rows[i].selected = false;
      }
    }
  }

  ok(){
    let self = this;
    self.dialogController.close(true, {row: self.selectedRow});
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
