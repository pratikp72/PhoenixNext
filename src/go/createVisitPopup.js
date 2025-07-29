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
import {Data} from '../data/go/data';
//import { Globals } from './globals';


@inject(DialogController, http, helper, DialogService, Data)
export class CreateVisitPopup {

  visitTypes=[];//["New Patient","Established Patient", "PT Visit", "Work Comp Visit", "Telemed"];
  bodyParts;//=Globals.bodyparts;//["Cervical", "Thoracic", "Lumbar", "Shoulder", "Elbow", "Wrist", "Hand", "Hip", "Knee", "Ankle", "Foot"];
  bodySides=["Right", "Left", "None"];
  userBoards=[];

  selectedVisitType=null;
  selectedBodypart=null;
  selectedBodyside=null;
  selectedBoard=null;
  createVisitDate;
  selectedBodyparts=[];
  selectedVisitProvider;
  selectedBillingProvider;
  providers=[];


  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;

  visitObject=null;
  extraVisible = false;

  constructor(DialogController, http, helper, DialogService, Data){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.dialogService = DialogService;
    this.data = Data;
  }

  extraToggle(){
    this.extraVisible = this.extraVisible ? false : true;
  }

  close(){
    let self = this;

    if(self.selectedBodyparts.length == 0)return;

    self.visitObject.visitType = self.selectedVisitType;
    self.visitObject.date = moment(self.createVisitDate).format('MM-DD-YYYY');
    self.visitObject.bodypart = self.selectedBodypart;
    self.visitObject.bodyside = self.selectedBodyside == 'None' ? 'EMPTY' : self.selectedBodyside;
    self.visitObject.bodyparts = self.selectedBodyparts;
    self.visitObject.providerId = self.selectedVisitProvider ? self.selectedVisitProvider.ProviderID : 0;
    self.visitObject.billingProviderId = self.selectedBillingProvider ? self.selectedBillingProvider.ProviderID : 0;

    let boardId = self.selectedBoard ? self.selectedBoard.id : 0;

    self.dialogController.close(true, {'visitObject': self.visitObject, "boardId": boardId  });
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  sideClicked(s){
    this.selectedBodyside = s;
  }

  partClicked(p){
    this.selectedBodypart = p;
  }

  addBodypart(){
    let self = this;
    for(let i = 0; i < self.selectedBodyparts.length; i++){
      let b = self.selectedBodyparts[i];
      if(b.part == self.selectedBodypart && b.side == self.selectedBodyside){
        return;
      }
    }

    let side = self.selectedBodyside == "None" ? null : self.selectedBodyside;

    self.selectedBodyparts.push(self.data.getBodypartSide(self.selectedBodypart, side));
  }

  bodypartClick(bp){
    let self = this;
    for(let i = 0; i < self.selectedBodyparts.length; i++){
      let b = self.selectedBodyparts[i];
      if(b.part == bp.part && b.side == bp.side){
        //remove from list...
        self.selectedBodyparts.splice(i, 1);
      }
    }
  }

  activate(obj){
    let self = this;

    self.bodyParts = self.data.bodyparts;

    self.visitTypes = self.data.getVisitTypes();

    self.visitObject = obj.visitObject;
    self.createVisitDate = moment(obj.visitObject.date).format('YYYY-MM-DD');// obj.visitObject.date;
    self.selectedBodypart = obj.visitObject.bodypart == null ? self.bodyParts[0] : obj.visitObject.bodypart;

    if(obj.visitObject.bodyside != null && obj.visitObject.bodyside == 'EMPTY'){
      self.selectedBodyside = 'None';
    }else{
      self.selectedBodyside = obj.visitObject.bodyside == null ? "Right" : obj.visitObject.bodyside;
    }

    if(obj.visitObject.visitType != null){
      const regex =  new RegExp(RegExp.quote('Pt'),'g'); // correct way
      self.selectedVisitType = obj.visitObject.visitType.replace(regex, 'PT'); // it works
    }else{
      self.selectedVisitType = self.visitTypes[0];
    }

    if(obj.visitObject.bodyparts){
      self.selectedBodyparts = obj.visitObject.bodyparts;
    }

    //remove 'ALL' provider, select current...
    for(let i = 0; i < obj.home.providers.length; i++){
      if(obj.home.providers[i].ProviderID != 0){
        self.providers.push(obj.home.providers[i]);

        if(obj.visitObject.visitCode == null){
          if(obj.home.providers[i].ProviderID == obj.home.currentProvider.ProviderID){
            self.selectedVisitProvider = obj.home.currentProvider;
            self.selectedBillingProvider = obj.home.currentProvider;
          }
        }else{
          if(obj.home.providers[i].ProviderID == obj.visitObject.visitCode.ProviderID){
            self.selectedVisitProvider = obj.home.providers[i];
          if(obj.home.providers[i].ProviderID == obj.visitObject.visitCode.BillingProvider){
            self.selectedBillingProvider = obj.home.providers[i];
          }
        }
      }
    }
  }

    self.userBoards = obj.home.userBoards;

    //default first board....
    if(self.userBoards.length > 0){
      self.selectedBoard = self.userBoards[0];
    }

    //self.providerId = obj.providerId;
    self.popupWidth = obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75) * .8;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;

  }


}
