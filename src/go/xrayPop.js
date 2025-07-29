/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import {Data} from '../data/go/data'


@inject(http, helper, DialogController, Data)
export class XrayPopup {

  url;

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;
  popupLeft=0;
  popupTop=0;
  mynewValue=null;
  canClose = false;

  loadPop = null;

  displayFindings=false;

  xrayData;

  constructor(http, helper, DialogController, Data){
    this.http = http;
    this.helper = helper;
    this.dialogController = DialogController;
    this.dialogController.settings.lock = false;
    this.goData = Data;
  }

  cancel(){
    let self = this;

    self.updateXray();

    self.dialogController.cancel();
  }

  onFrameLoad(){
    var self = this;
    window.setTimeout(function () {

      if(self.loadPop != null)
        self.loadPop.close();


      // var res = $(self.docframe).contents().find('head');
      // console.log(res);
    }, 4000);
  }

  toggleFinding(){
    this.displayFindings = this.displayFindings ? false : true;
  }

  updateXray(){
    let self = this;
    let url = 'xrayresult';

    let dialog =self.helper.createNoty("Updating Findings...", 3000);
    dialog.show();

    self.goData.putWithUrlAndData(url, self.xrayData, function(res){

      dialog.close();

    });
  }

  // getXrayUrl(url){
  //   var ip = this.helper.xraypath != undefined ? this.helper.xraypath : window.location.host;
  //   return `${ip}/viewer?StudyInstanceUIDs=${url}`;
  // }

  activate(obj){
    let self = this;
    document.cookie = 'SameSite=None;';
    document.cookie = 'Secure;'

    // self.url = self.goData.getXrayUrl(obj.data.DocPath);
    self.url = self.goData.getXrayUrl(obj.data.studyId);

    self.popupWidth = obj.popupWidth - 73;
    self.popupHeight = obj.popupHeight;
    self.popupTop = 0;
    self.popupLeft = 0;

    // let xralUrl = `xrayresult/${obj.data.ObjectID}`;
    let xralUrl = `xrayresult/${obj.data.xrayId}`;
    self.goData.getWithUrl(xralUrl, function(res){
      self.xrayData = res;
    });

    self.loadPop = self.helper.createNoty("Loading viewer...", 3000);
    self.loadPop.show();
  }


  attached(){
    $('ux-dialog-overlay').css('left', '70px');
    $('ux-dialog-container').css('left', '70px');

  }

}
