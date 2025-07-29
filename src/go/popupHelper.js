import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import {Data} from '../data/go/data';
import {DialogService} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {TaskHelper} from './task/taskHelper';
import {PtPopup} from "./ptPopup";
import {DocumentPopup} from "./documentPopup";
import {XrayPopup} from "./xrayPop";
import {EventAggregator} from 'aurelia-event-aggregator';
import {UserSearch} from "./userSearch";
import {Task} from "./task/task";
import {TaskPopup} from "./task/taskPopup";


import * as _ from "lodash";
import {PatientSearch} from "./patientSearch";
import {AppendOverwritePopup} from "./appendOverwritePopup";
import {BodypartPickerPopup} from "./bodypartPickerPopup";
import {GenericMessagePopup} from "./genericPopups/genericMessagePopup";
import {ViewModelPopup} from "./viewModelPopup";
import {PxSearch} from "./pxSearch";
import {GenericInputPopup} from "./genericPopups/genericInputPopup";
import {GenericPicklistPopup} from "./genericPopups/genericPicklistPopup";
import {GenericTablePopup} from "./genericPopups/genericTablePopup";
import {GenericMultiTabPickerPopup} from "./genericPopups/genericMultiTabPickerPopup"; 
import moment from "moment";
import {DxSearch} from "./dxSearch";
import {AlertPopup} from "./alertPopup";
import {CreateVisitPopup} from "./createVisitPopup";
import {Camera} from "./camera";

import { SqlSelector } from '../formbuilder/dialogs/sqlSelector';



@inject(http, helper, DialogService, Data, TaskHelper, EventAggregator)
export class PopupHelper {

  constructor(http, helper, DialogService, Data, TaskHelper, EventAggregator){
    this.http = http;
    this.helper = helper;
    this.dialogService = DialogService;
    this.goData = Data;
    this.taskHelper = TaskHelper;
    this.eventAggregator = EventAggregator;
  }

  activeController = null;

  closeActiveDialog(){
    let self = this;
    if(self.activeController != null){
      self.activeController.cancel();
    }
  }

  showVisitTypePicker(callback){
    let self = this;
    let visitTypeList=[];
    let visitTypeStrings=self.goData.getVisitTypes();

    for(let i = 0; i < visitTypeStrings.length; i++){
      let pItm = self.goData.getGenericPicklistItem(visitTypeStrings[i], visitTypeStrings[i]);
      visitTypeList.push(pItm);
    }

    self.openGenericPicklistPop("Please select a type for this visit.", "Select Visit Type", visitTypeList, false, function(selectedVisitType){
      let sType = selectedVisitType.item;
      callback(sType);
    });
  }

  openCreateVisitPopup(visitInfo, homeInstance, callback){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: CreateVisitPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, visitObject: visitInfo, home: homeInstance}}).whenClosed(response => {

      let px = response.output;
      if(px != null){
        callback(px);
      }
    });
  }

  openSqlSelector(callback, options){
    let self = this;

    if(options != null){
      if(options.hasOwnProperty('closeActiveDialog')){
        if(options.closeActiveDialog==true){
          self.closeActiveDialog();
        }
      }
    }else{
      self.closeActiveDialog();
    }

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: SqlSelector, model: {popupWidth: windowWidth, popupHeight: windowHeight, options: options}})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){
        if(callback){
          callback(res);
        }
      }
    });
  }

  openProcedureSearchPop(filterType, displayModifers, callback){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: PxSearch, model: {popupWidth: windowWidth, popupHeight: windowHeight,
                                                          typeFilter: filterType, displayModifers: displayModifers, popupHelper: self}}).whenClosed(response => {
      let px = response.output;
      if(px != null){
        callback(px);
        //add search result to list...
        // px.date = moment().format("MM/DD/YYYY");
        // self.data.push(px);
      }
    });
  }

  openAlertPop(alerts, options, callback){
    let self = this;

    if(options != null){
      if(options.hasOwnProperty('closeActiveDialog')){
        if(options.closeActiveDialog==true){
          self.closeActiveDialog();
        }
      }
    }else{
      self.closeActiveDialog();
    }

    self.dialogService.open({viewModel: AlertPopup, model: {alerts: alerts.Response, options: options}})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){
        if(callback){
          callback(res);
        }
      }
    });
  }

  openViewModelPop(viewpath, viewmodel, header, width, height, top, left, options, callback){
    let self = this;

    if(options != null){
      if(options.hasOwnProperty('closeActiveDialog')){
        if(options.closeActiveDialog==true){
          self.closeActiveDialog();
        }
      }
    }else{
      self.closeActiveDialog();
    }

    self.dialogService.open({viewModel: ViewModelPopup, model: {popupWidth: width, popupHeight: height, top: top, left: left, header: header, viewPath: viewpath, viewModel: viewmodel, options: options}})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;

        self.updateDialogOverlayZIndex();

        return openDialogResult.closeResult;
      }).then((response) => {

        self.updateDialogOverlayZIndex();

        let res = response.output;
        if(res != null){
          if(callback){
            callback(res, response);
          }
        }else{
          callback({'cancelled': response.wasCancelled});
        }
    });
  }

  openGenericTablePop(header, columnHeaders, genericTableRows, closeActiveDialog, options, callback){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    if(closeActiveDialog == true){
      self.closeActiveDialog();
    }

    self.dialogService.open({viewModel: GenericTablePopup, model: {header: header, columnHeaders: columnHeaders, rows: genericTableRows, options:options}})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
        let res = response.output;
        if(res != null){
          if(callback){
            callback(res);
          }
        }
    });
  }

  openGenericPicklistPop(description, header, genericPicklistItems, closeActiveDialog, callback){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    if(closeActiveDialog == true){
      self.closeActiveDialog();
    }


    self.dialogService.open({viewModel: GenericPicklistPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, description: description, header: header, items: genericPicklistItems}})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;

        self.updateDialogOverlayZIndex();

        return openDialogResult.closeResult;
      }).then((response) => {

        self.updateDialogOverlayZIndex();

      let res = response.output;
      if(res != null){
        if(callback){
          callback(res);
        }
      }
    });
  }

  openGenericMultiTabPickerPopup(description, header, genericPicklistItems, closeActiveDialog, callback){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    if(closeActiveDialog == true){
      self.closeActiveDialog();
    }

    self.dialogService.open({viewModel: GenericMultiTabPickerPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, description: description, header: header, items: genericPicklistItems}})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){
        if(callback){
          callback(res);
        }
      }
    });
  }


  openGenericInputPop(message, inputDescriptionArray, saveButtonText, closeActiveDialog, callback){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    if(closeActiveDialog == true){
      self.closeActiveDialog();
    }

    let btnText = saveButtonText != null ? saveButtonText : 'Save';

    self.dialogService.open({viewModel: GenericInputPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, message: message, inputs: inputDescriptionArray, buttonText: btnText }})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){
        if(callback){
          callback(res);
        }
      }
    });
  }



  openGenericMessagePop(message, header, buttonDescriptionsArray, closeActiveDialog, callback, options){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    if(closeActiveDialog == true){
      self.closeActiveDialog();
    }

    let ops={}
    ops.buttons = buttonDescriptionsArray;
    if(options){
      if(options.htmlTemplate){
        ops.template = options.htmlTemplate;
      }
      if(options.alertType){
        ops.alertType = options.alertType;
      }
    }

    self.dialogService.open({viewModel: GenericMessagePopup,
      model: {popupWidth: windowWidth, popupHeight: windowHeight,
              message: message, header: header, options: ops}})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){
        if(callback){
          callback(res);
        }
      }
    });
  }

  openBodysidePickerPop(callback, message){
    let msg = message != undefined ? message : `Please select body side.`;
    this.openGenericMessagePop(msg, 'Select Body Side', ['RIGHT','LEFT','NONE'], false, function(res){
      let side = res.result;
      callback(side);
    });
  }


  openBodypartPickerPop(bodyparts, callback){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.closeActiveDialog();

    self.dialogService.open({viewModel: BodypartPickerPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, bodyparts: bodyparts}})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){
        if(callback){
          callback(res);
        }
      }
    });
  }


  openCameraPop(callback){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.closeActiveDialog();

    self.dialogService.open({viewModel: Camera, model: {popupWidth: windowWidth, popupHeight: windowHeight}})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){
        if(callback){
          callback(res);
        }
      }
    });
  }




  openAppendOverwitePop(headerText, bodyText, callback){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.closeActiveDialog();

    self.dialogService.open({viewModel: AppendOverwritePopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, headerText: headerText, bodyText: bodyText}})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){
        if(callback){
          callback(res);
        }
      }
    });
  }


  openPatientPop(closeActiveDialog, fullData, callback){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    if(closeActiveDialog)
      self.closeActiveDialog();

    self.dialogService.open({viewModel: PatientSearch, model: {popupWidth: windowWidth, popupHeight: windowHeight}})
      .then(openDialogResult => {

        self.activeController = openDialogResult.controller;

        return openDialogResult.closeResult;
      }).then((response) => {
         let aPat = response.output;

        if(response.hasOwnProperty('wasCancelled') && response.wasCancelled){
          callback({'cancelled': response.wasCancelled});
        }else if(aPat.hasOwnProperty('createPatient')){
          callback({'createPatient': true});
        }else if(aPat != null){
          if(callback){
            callback(fullData ? aPat.data : aPat.id);
          }
        }

        //  if(aPat != null){
        //    if(callback){
        //      callback(fullData ? aPat.data : aPat.id);
        //    }
        //  }else{
        //    callback({'cancelled': response.wasCancelled});
        //  }
    });
  }

  updateDialogOverlayZIndex(){
    let overlay = $('ux-dialog-overlay');
    let container = $('ux-dialog-container');

    if(container.length > 0){
      //find top-most container z-index...
      var topIndex = null;
      for(var i = 0; i < container.length; i++){
        let z = parseInt(container[i].style.zIndex);
        if(topIndex == null || z > topIndex){
          topIndex = z;
        }
      }

      //just ONE overlay, one less z-index of container...
      if(topIndex != null && overlay.length > 0){
        for(var i = 0; i < overlay.length; i++){
          if(i ==0){
            overlay[i].style.zIndex = (topIndex - 1);
            overlay[i].classList.add("active");
          }else{
            //remove...
            overlay[i].style.zIndex = 1000;
            overlay[i].classList.remove("active");
          }
        }
      }
    }
  }

  getNewDialogZIndex(){
    let oZ = 1000;
    let cZ = 1001;
    let dialogObj={
      overlayZ: oZ,
      containerZ: cZ
    }
    let overlay = $('ux-dialog-overlay');
    let container = $('ux-dialog-container');
    if(container.length > 0){
      let z = parseInt(container[0].style.zIndex);
      if(z >= cZ){
        dialogObj.containerZ = z + 2;
        dialogObj.overlayZ = z + 1;
      }

      //remove ACTIVE class from existing container???
      // container[0].classList.remove("active");
      // //remove ACTIVE class from existing container???
      // overlay[0].classList.remove("active");
    }
    return dialogObj;
  }



  openTaskPop(patientId, providerId, date, objectId, taskTypeId, home, callback, OD_Task_ToUpdate, options){

    var self = this;

    let closeActive = true;
    if(options){
      if(options.hasOwnProperty('closeActiveDialog')){
        closeActive = options.closeActiveDialog;
      }
    }
    if(closeActive){
      self.closeActiveDialog();
    }

    let zObject = self.getNewDialogZIndex();
    let overlayZIndex = zObject.overlayZ;// > 2000 ? zObject.overlayZ + 1 : zObject.overlayZ;
    let containerZIndex = zObject.containerZ;// > 2001 ? zObject.containerZ + 1 : zObject.containerZ;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    var taskObj={
      "patientId": patientId,
      'providerId': providerId,
      'date': date,
      "objectId": objectId,
      "taskTypeId": taskTypeId,
      'home': home,
      'taskToUpdate': OD_Task_ToUpdate,
      'overlayZIndex': overlayZIndex,
      'containerZIndex': containerZIndex
    }

    self.dialogService.open({viewModel: TaskPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, data: taskObj}})
      .then(openDialogResult => {

        self.activeController = openDialogResult.controller;

        self.updateDialogOverlayZIndex();

        return openDialogResult.closeResult;
      }).then(response => {

        self.updateDialogOverlayZIndex();

      let res = response.output;
      if(res != null){
        //open task....
        //self.openTask(res.taskToOpen);

        if(callback){
          callback(res);
        }
      }
    });
  }

  openTaskPopNew(taskPopupObjectList, home, callback, OD_Task_ToUpdate, options){

    var self = this;

    let closeActive = true;
    if(options){
      if(options.hasOwnProperty('closeActiveDialog')){
        closeActive = options.closeActiveDialog;
      }
    }
    if(closeActive){
      self.closeActiveDialog();
    }

    let zObject = self.getNewDialogZIndex();
    let overlayZIndex = zObject.overlayZ;// > 2000 ? zObject.overlayZ + 1 : zObject.overlayZ;
    let containerZIndex = zObject.containerZ;// > 2001 ? zObject.containerZ + 1 : zObject.containerZ;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // var taskObj={
    //   "patientId": patientId,
    //   'providerId': providerId,
    //   'date': date,
    //   "objectId": objectId,
    //   "taskTypeId": taskTypeId,
    //   'home': home,
    //   'taskToUpdate': OD_Task_ToUpdate,
    //   'overlayZIndex': overlayZIndex,
    //   'containerZIndex': containerZIndex
    // }

    var taskObj={
      'taskPopupObjects': taskPopupObjectList,
      'home': home,
      'taskToUpdate': OD_Task_ToUpdate,
      'overlayZIndex': overlayZIndex,
      'containerZIndex': containerZIndex
    }

    self.dialogService.open({viewModel: TaskPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, data: taskObj}})
      .then(openDialogResult => {

        self.activeController = openDialogResult.controller;

        self.updateDialogOverlayZIndex();

        return openDialogResult.closeResult;
      }).then(response => {

        self.updateDialogOverlayZIndex();

      let res = response.output;
      if(res != null){
        if(callback){
          callback(res);
        }
      }
    });
  }

  openUserSearchPop(callback, host, options){
    var self = this;

    if(options != null && options != undefined){
      if(options.hasOwnProperty('closeActiveDialog')){
        if(options.closeActiveDialog==true){
          self.closeActiveDialog();
        }
      }
    }else{
      self.closeActiveDialog();
    }

    const windowHeight = window.innerHeight / 2;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let width = quarter;
    let eights = windowWidth / 8;

    let op={
      popupWidth:width,
      popupHeight:windowHeight,
      popupTop: windowHeight / 2,
      popupLeft:eights*3
    }

    //self.dialogService.settings.host = host;

    self.dialogService.open({viewModel: UserSearch, model: {options: op, host:host}})
      .then(openDialogResult => {

      self.activeController = openDialogResult.controller;

      return openDialogResult.closeResult;
    }).then(response => {
      let res = response.output;
        callback(res);
    });
  }

  openMessagePop(callback, popupHelper, home){
    let self = this;

    self.closeActiveDialog();

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: Task, model: {popupWidth: windowWidth, popupHeight: windowHeight, popupHelper: popupHelper, home: home}}).then(openDialogResult => {

      self.activeController = openDialogResult.controller;

      return openDialogResult.closeResult;
    }).then(response => {
      let res = response.output;
      if(res != null && res.taskToOpen != null){
        //open task....
        //self.openTask(res.taskToOpen);

        callback(res.taskToOpen);

      }
    });
  }

  openDxPop(bodypart, bodyside, options, callback){
    let self = this;

    self.dialogService.open({viewModel: DxSearch, model: {"bodypart": bodypart, bodyside: bodyside, popupHelper: self, options:options}})
      .then(openDialogResult => {
        self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){
        if(callback){
          callback(res);
        }
      }
    });
  }


  openPtPop(board, home){
    var self = this;

    if(home.ptDialog){
      return;
    }

    var patientId = board.visitInfo.patientId;
    var date = board.visitInfo.date;
    var providerId= board.visitInfo.providerId;
    var userId = board.userId;
    var bodypart = board.visitInfo.bodypart;

    var url = self.goData.createPttUrl(patientId, providerId, userId, bodypart, date);
    //this.displayDocumentPopup(url);
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;


    self.dialogService.open({viewModel: PtPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, documentUrl: url, home: home}})
      .then(openDialogResult => {
        home.ptDialog = openDialogResult;
        self.eventAggregator.publish('filterPreferencesWithCurrentProvider');
      }).then((response) => {
        //home.ptDialog = null;
        let res = response.output;
        if(res != null){
          if(callback){
            callback(res);
          }
       }
    });
  }

  openXrayPop(studyId, xrayId){
    let self = this;

    self.closeActiveDialog();

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let data={
      studyId:studyId,
      xrayId: xrayId
    }

    self.dialogService.open({viewModel: XrayPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, data: data }}).then(openDialogResult => {

      self.activeController = openDialogResult.controller;

      return openDialogResult.closeResult;
    }).then(response => {
      //retrieve cached task object...
      self.taskHelper.setObjectToTask(self.taskHelper.cacheObjectId, self.taskHelper.cacheTaskTypeId);
      self.taskHelper.clearCachedTask();
    });
  }

  openUrlPathPop(path, options){
    let self = this;

    if(options != null){
      if(options.hasOwnProperty('closeActiveDialog')){
        if(options.closeActiveDialog==true){
          self.closeActiveDialog();
        }
      }
    }else{
      self.closeActiveDialog();
    }

    // const windowHeight = '100%';//window.innerHeight;
    // const windowWidth = '100%';//window.innerWidth;

    // var options={
    //   'width': (window.innerWidth - 72) + 'px',
    //   'height': '100%',
    //   'popupHeight': '100%'
    // }


    self.dialogService.open({viewModel: DocumentPopup, model: {url: path, options: options}}).then(openDialogResult => {

      self.activeController = openDialogResult.controller;

      return openDialogResult.closeResult;
    }).then(response => {

    });
  }

  openPdfPop(patientId, filepath, callback, buildUrl){
    let self = this;

    self.closeActiveDialog();

    const windowHeight = '100%';//window.innerHeight;
    const windowWidth = '100%';//window.innerWidth;

    var options={
      'width': (window.innerWidth - 72) + 'px',
      'height': '100%',
      'popupHeight': '100%'
    }

    var url = "";

    if(buildUrl === true) {
      url = self.goData.createPdfUrl(patientId, filepath);
    } else {
      url = filepath;
    }

    self.dialogService.open({viewModel: DocumentPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, url: url, options: options }}).then(openDialogResult => {

      self.activeController = openDialogResult.controller;

      return openDialogResult.closeResult;
    }).then(response => {

      //if(openEditor)return;

      if(callback){
        callback(true);
      }
    }).catch(err=>{
      if(callback){
        callback(false);
      }
    })
  }

  openDocPop(documentId, openEditor, taskTypeId){
    let self = this;

    self.closeActiveDialog();

    const windowHeight = '100%';//window.innerHeight;
    const windowWidth = '100%';//window.innerWidth;

    var options={
      'width': (window.innerWidth - 72) + 'px',
      'height': '100%',
      'popupHeight': '100%'
    }

    const webDocsUrl = self.helper._webDocsServer;// 'https://lively-water-016adb510.6.azurestaticapps.net/';

    var url = openEditor ? `${webDocsUrl}/#editor` : self.goData.createDocumentUrl(documentId);

    self.dialogService.open({viewModel: DocumentPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, url: url, options: options }}).then(openDialogResult => {

      self.activeController = openDialogResult.controller;

      if(taskTypeId){
        self.taskHelper.setObjectToTask(documentId, taskTypeId);
      }

      return openDialogResult.closeResult;
    }).then(response => {

      if(openEditor)return;

      //retrieve cached task object...
      self.taskHelper.setObjectToTask(self.taskHelper.cacheObjectId, self.taskHelper.cacheTaskTypeId);
      self.taskHelper.clearCachedTask();
    });
  }

}
