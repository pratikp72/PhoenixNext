/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';


@inject(DialogController, http, helper)
export class DocumentPopup {


  url;

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;


  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  // close(){
  //   let self = this;
  //   self.dialogController.close(true, self.selectedPatient);
  // }

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

  activate(obj){
    let self = this;

    self.url = obj.documentUrl;

    self.popupWidth = obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75);// * .8;
    self.popupTop = 50;//(obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;
  }

}
