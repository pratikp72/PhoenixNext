/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';


@inject(http, helper, DialogController)
export class DocumentPopup {


  url;

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;
  mynewValue=null;
  bgColor = 'white';
  borderSize = 1;
  closeColor = 'black';

  docTop=50;

  title='Document';
  contentHeight;

  constructor(http, helper, DialogController){
    //this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.dialogController = DialogController;
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  onFrameLoad(){
    var self = this;
    //var res = $('#docframe').contents().find('.fr-box');//' .fr-basic .fr-top');//.attr("style","width:100%;height:100%")
    window.setTimeout(function () {
      var res = $(self.docframe).contents().find('head');//' .fr-basic .fr-top');//.attr("style","width:100%;height:100%")
      console.log(res);
    }, 4000);
  }

  attached(){
    let self = this;
    var style={
      'top': self.popupTop + 'px'
    }

    $('ux-dialog-overlay').css(style);
    $('ux-dialog-container').css(style);


    var res = $(self.docpop).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5002", "important");
  }

  activate(obj){
    let self = this;

    document.cookie = 'SameSite=None;';
    document.cookie = 'Secure;'

    self.url = obj.url;

   // default
    self.popupWidth = obj.popupWidth - 72;
    self.popupHeight = obj.popupHeight - 50;
    self.popupTop = 50;//50;
    self.popupLeft = 72;
    self.docTop=0;
    self.contentHeight = (obj.popupHeight - 100) + 'px';

    if(obj.options){
      if(obj.options.hasOwnProperty('width')){
        self.popupWidth = obj.options.width;
      }
      if(obj.options.hasOwnProperty('height')){
        self.popupHeight = obj.options.height;
      }
      if(obj.options.hasOwnProperty('popupHeight')){
        self.contentHeight = obj.options.popupHeight;
      }
      if(obj.options.hasOwnProperty('top')){
        self.popupTop = obj.options.top;
        self.docTop = obj.options.top;
      }
      if(obj.options.hasOwnProperty('left')){
        self.popupLeft = obj.options.left;
      }
      if(obj.options.hasOwnProperty('title')){
        self.title = obj.options.title;
      }
    }
  }

}
