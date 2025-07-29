/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
//import {Home} from './home';//PASS THIS VIA ACTIVATE....!!!!
import {EventAggregator} from 'aurelia-event-aggregator';





@inject(http, helper, DialogController, EventAggregator)
export class PtPopup {


  url;

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;
  mynewValue=null;
  canClose = false;
  home = null;

  params=null;

  constructor(http, helper, DialogController, EventAggregator){
    //this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.dialogController = DialogController;

    this.dialogController.settings.lock = false;

    var container = document.getElementById('mycontainer');
    this.dialogController.settings.host = container;
    this.eventAggregator = EventAggregator;

  }

  cancel(){
    let self = this;
    //this.canClose = true;
    self.home.ptDialog = null;
    self.eventAggregator.publish('filterPreferencesWithCurrentProvider');
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

    self.home = obj.home;
    let vi = self.home.currentBoard.visitInfo;
    self.board = self.home.currentBoard;
    self.patientId = self.home.currentBoard.visitInfo.patientId;
    self.date = self.home.currentBoard.visitInfo.date;
    self.providerId= self.home.currentBoard.visitInfo.providerId;// == undefined ? self.home.currentProvider.ProviderID : self.home.currentBoard.visitInfo.providerId;
    self.userId = self.home.currentBoard.userId;
    // self.bodypart = self.getFirstAvailBodypartForExam().part;
    self.boardType = self.home.currentBoard.visitInfo.typeForSave;

    self.params={
      patientid:vi.patientId,
      providerid:vi.providerId,
      bodypart:vi.bodyparts[0].part,
      userid:self.home.currentBoard.userId,
      visitdate:vi.date,
      type:'PT'
    }



    document.cookie = 'SameSite=None;';
    document.cookie = 'Secure;'

    self.url = obj.documentUrl;

    self.popupWidth =  obj.popupWidth - 88;//  obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75);// * .8;
    self.popupTop = 0;//60;
    self.popupLeft = 10;//(obj.popupWidth - self.popupWidth) / 2;


    window.onmessage = function(event){
      if (event.data == 'savedaysheetcomplete') {
          self.canClose = true;
          self.cancel();
          //self.dialogController.close(true);
      }
      if (event.data == 'datagridattached') {
        // self.docframe.contentWindow.postMessage('gosetup', '*');
        self.docframe.contentWindow.postMessage('gosetup', '*');
      }
    };


  }



  canDeactivate(dialogResult){
    if(!this.canClose){
      var frm = this.docframe;
      frm.contentWindow.postMessage('savedaysheet', '*');
    }
    return this.canClose;
  }

  attached(){

    var style={
      'left': '70px',
      'top': '63px'
    }

    $('ux-dialog-container').css(style);

    style['background-color']='white';
    style['opacity']=1;
    $('ux-dialog-overlay').css(style);

  }

}
