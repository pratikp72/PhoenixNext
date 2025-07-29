/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import moment from 'moment';
import {DialogService} from 'aurelia-dialog';
import * as _ from 'lodash';




@inject(DialogController, http, helper, DialogService)
export class CreateVisitPopup {

  visitTypes=["New Patient","Established Patient", "Pt Visit", "Work Comp Visit"];
  bodyParts=["Cervical", "Thoracic", "Lumbar", "Shoulder", "Elbow", "Wrist", "Hand", "Hip", "Knee", "Ankle", "Foot"];
  bodySides=["Right", "Left", "Bilateral"];

  selectedVisitType;
  selectedBodypart;
  selectedBodyside;
  visitDate;

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;

  visitObject=null;


  constructor(DialogController, http, helper, DialogService){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.dialogService = DialogService;
  }

  close(){
    let self = this;
    self.visitObject.visitType = self.selectedVisitType;
    self.visitObject.bodypart = self.selectedBodypart;
    self.visitObject.bodyside = self.selectedBodyside;
    self.dialogController.close(true, {'visitObject': self.visitObject });
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }



  activate(obj){
    let self = this;

    self.visitObject = obj.visitObject;

    //self.providerId = obj.providerId;
    self.popupWidth = obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75) * .8;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;

  }


}
