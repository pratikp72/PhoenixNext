import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';


@inject(DialogController, http, helper)
export class ViewModelPopup {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  overlayTop=0;

  viewPath="";
  header="";
  viewModel=null;
  displayHeader = true;
  bodyPadding=16;
  scrollheight;
  ignoreScrollHeightCalculation=false;

  backgroundColor='#ffffff';
  icon;
  dropshadow = true;
  overflowY='unset';

  displaySpinner=false;

  elId="test"

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  activate(obj){
    let self = this;
    //test width / height for numeric values...
    let widthFloor = Math.floor(obj.popupWidth);
    let heightFloor = Math.floor(obj.popupHeight);

    self.popupWidth = Number.isInteger(widthFloor) ? obj.popupWidth + "px" : obj.popupWidth;
    self.popupHeight = Number.isInteger(heightFloor) ? obj.popupHeight + "px" : obj.popupHeight;
    self.popupTop = obj.top;
    self.popupLeft = obj.left;

    self.viewPath = obj.viewPath;
    self.header = obj.header;
    self.viewModel=obj.viewModel;
    self.viewModel.dialog = self.dialogController;

    if(obj.options){
      if(obj.options.hasOwnProperty('icon')){
        self.icon = obj.options.icon;
      }
      if(obj.options.hasOwnProperty('dropshadow')){
        self.dropshadow = obj.options.dropshadow;
      }
      if(obj.options.hasOwnProperty('displayHeader')){
        self.displayHeader = obj.options.displayHeader;
      }
      if(obj.options.hasOwnProperty('bodyPadding')){
        self.bodyPadding = obj.options.bodyPadding;
      }
      if(obj.options.hasOwnProperty('overlayTop')){
        self.overlayTop = obj.options.overlayTop;
      }
      if(obj.options.hasOwnProperty('backgroundColor')){
        self.backgroundColor = obj.options.backgroundColor;
      }
      if(obj.options.hasOwnProperty('ignoreScrollHeightCalculation')){
        self.ignoreScrollHeightCalculation = obj.options.ignoreScrollHeightCalculation;
      }
      if(obj.options.hasOwnProperty('scrollHeight')){
        self.scrollheight = obj.options.scrollHeight;
      }else{
        self.scrollheight = 'initial';
      }
      if(obj.options.hasOwnProperty('overflowY')){
        self.overflowY = obj.options.overflowY;
      }
      if(obj.viewModel && 
        obj.viewModel.options && 
        obj.viewModel.options.hasOwnProperty('elId')){
        self.elId = obj.viewModel.options.elId;
      }
    }
  }

  showSpinner(){
    this.displaySpinner=true;
  }

  hideSpinner(){
    this.displaySpinner=false;
  }

  attached(){
    let self = this;
    var res = $(self.viewmodelpop).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    if(!self.ignoreScrollHeightCalculation){
      if(self.displayHeader){
        self.scrollheight = self.viewmodelpop.clientHeight - self.viewmodelheader.clientHeight;
      }else{
        self.scrollheight = self.viewmodelpop.clientHeight;
      }
    }

    var style={
      'top': self.overlayTop + 'px',
      'overflow-y': self.overflowY
    }

    let overlay = $('ux-dialog-overlay');
    self.viewModel.overlay = overlay;

    $('ux-dialog-overlay').css(style);
    $('ux-dialog-container').css(style);

    if(!self.dropshadow){
      var dxStyle={
        'box-shadow':'0 0 0 rgba(0,0,0,.5)'
      }
      $('ux-dialog').css(dxStyle);
    }

  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
