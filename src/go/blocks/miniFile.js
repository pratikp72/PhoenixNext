import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {DocumentPopup} from "../documentPopup";
import {XrayPopup} from "../xrayPop";
import {DialogService} from 'aurelia-dialog';
import {Data} from '../../data/go/data';
import {PopupHelper} from "../popupHelper";
import {Home} from '../home';
import {TaskHelper} from '../task/taskHelper';
import moment from 'moment';
import { Globals } from '../globals';


@inject(helper,http, DialogService, Data, PopupHelper, Home, TaskHelper, Globals)
export class MiniFile {

  data;
  date;
  isXray=false;
  displayFinding=false;
  xrayViewerEnabled=false;
  xrayData=null;
  xrayId;
  isPdf = false;
  isGoForm=false;
  isDocument = false;
  canDeleteDocument = false
  backgroundColor="bg-primary";
  providerId;
  xrayPrefs=[];


  constructor(helper, http, DialogService, Data, PopupHelper, Home, TaskHelper, Globals){
    this.helper = helper;
    this.http = http;
    this.dialogService = DialogService;
    this.goData = Data;
    this.popHelper = PopupHelper;
    this.home = Home;
    this.taskHelper = TaskHelper;
    this.globals = Globals;
  }

  activate(model) {
    let self = this;
    self.data = model;
    self.providerId = model.data.ProviderID;
    self.date = this.helper.getISODateToFormat(model.data.CreateDate, "MM/DD/YYYY");
    self.isXray = model.data.TaskTypeDescription == 'XRAY' ? true : false;
    self.isPdf = self.setIsPdf(model.data);
    self.isGoForm = model.blockType == 'goForm' ? true : false;
    self.isDocument = !self.isPdf && model.blockType == 'document' ? true : false;
    self.setCanDeleteDocument();
    if(self.isXray){
      self.xrayId = self.data.data.ObjectID;
      self.getXray(self.xrayId, function(res){
        self.xrayData = res;
      });
      self.getXrayPrefs();
    }

    //enable loading xrays if path to xray app is populated...
    if(self.helper.xraypath != null && self.helper.xraypath.length > 0){
      self.xrayViewerEnabled = true;
    }
    if(self.isXray){
      self.backgroundColor = 'bg-dark';
    }
    if(self.isGoForm){
      self.backgroundColor = 'bg-info';
    }
  }

  getXrayPrefs(){
    let self = this;
    var bp = self.home.currentBoard.visitInfo.bodypart;
    let url = `xray/pref?providerId=${self.providerId}&bodypart=${bp}`;
    self.goData.getWithUrl(url, function(res){
      self.xrayPrefs = res;
    });
  }

  xrayPrefClick(pref){
    if(this.data){
      this.data.data.Details = pref.XRayText;
    }
  }

  setCanDeleteDocument(){
    let self = this;
    //document CAN be deleted if...
    //logged-in user is provider who generated note...OR
    //logged-in user has DeleteHistory Role...AND
    //visit is NOT locked.

    //check visit lock first!!
    if(self.home.currentBoard.visitInfo.locked){
      self.canDeleteDocument = false;
      return
    }

    //is logged-in user == provider who generated document???
    if(self.data.data.ProviderID == self.helper._user.UserData.ProviderID){
      self.canDeleteDocument = true;
    }else if(self.helper._user.RoleDetails.DeleteHistory){
      self.canDeleteDocument = true;
    }
  }

  setIsPdf(data){
    if(data.hasOwnProperty('DocPath')){
      return data.DocPath.includes(".pdf") ? true : false;
    }else if(data.hasOwnProperty('DocumentLocation')){
      return data.DocumentLocation.includes(".pdf") ? true : false;
    }else{
      return false;
    }
  }

  detached(){
    let self = this;
    //update xray findings....
    if(self.xrayData != null &&
      self.xrayData.XRayFinding != self.data.data.Details){
      self.xrayData.XRayFinding = self.data.data.Details;
      self.updateXray(self.xrayData);
    }
  }

  toggleFinding(){

    let self = this;
    self.displayFinding = self.displayFinding ? false : true;

    if(!self.displayFinding){
      //update xray findings....
      if(self.xrayData != null){
        self.xrayData.XRayFinding = self.data.data.Details;
        self.updateXray(self.xrayData);
      }
    }
  }

  getXray(id, callback){
    let self = this;
    let xralUrl = `xrayresult/${id}`;
    self.goData.getWithUrl(xralUrl, function(res){
      callback(res);
    });
  }

  updateXray(xData){
    let self = this;
    let url = 'xrayresult';
    let dialog =self.helper.createNoty("Updating Findings...", 3000);
    dialog.show();

    self.goData.putWithUrlAndData(url, xData, function(res){
      dialog.close();
    });
  }

  parseDocPath(docpath){
    var splitArray = docpath.split("\\");
    var length = splitArray.length;
    if(length > 0){
      //get last two items in array...
      var patientId = splitArray[length - 2];
      var filepath = splitArray[length - 1]
      return {
        "patientId": patientId,
        "filepath": filepath
      }
    }
    return null;
  }

  deleteDocument(){
    let self = this;
    let url = null;
    if(!self.isGoForm){
      url = 'documents?id=' + self.data.id;
    }else{
      url = 'goforms/instances?id=' + self.data.id;
    }

    self.home.displayDocumentSpinner = true;
    self.goData.deleteWithUrl(url, function(res){
      self.home.displayDocumentSpinner = false;
      if(res == true){
        //remove document from tray...
        for(let i = 0; i < self.home.currentBoard.documents.length; i++){
          let aDocument = self.home.currentBoard.documents[i];
          // var idToFind = self.isGoForm ? aDocument.data.formId : aDocument.data.ObjectID;
          if(aDocument.id == self.data.id){
            //remove it here...
            self.home.currentBoard.documents.splice(i, 1);
            self.deleteGoFormBlockInstanceId(self.data.id);
            break;
          }
        }
      }
    });
  }

  deleteGoFormBlockInstanceId(instanceId){
    let self = this;
    for(var b = 0; b < self.home.currentBoard.blocks.length; b++){
      var aBlock = self.home.currentBoard.blocks[b];
      if(aBlock.blockType == 'goForm' && aBlock.goFormInstanceId == instanceId){
        aBlock.goFormInstanceId = null;
        //update db...
        self.goData.saveVisitBoard(self.home.currentBoard);
        self.home.currentBoard.hasChanged=false;
        break;
      }
    }
  }

  faxDocument(){
    let self = this;
    var document = self.data.data;
    // var slashIndex = document.DocPath.lastIndexOf("\\") + 1
    // var docName = document.DocPath.slice(slashIndex, document.DocPath.length);
    var docName = self.globals.getFileNameWithPath(document.DocPath);
    self.home.openFax(docName, document.ObjectID, 'DOCUMENT');
  }

  exportDocument(){
    let self = this;
    self.home.displayDocumentSpinner = true;
    var jwt = self.helper.jwt();
    // let url = `documents/export/pdf?id=${self.data.id}&jwt=${jwt}`;
    let url = `documents/export/pdf?id=${self.data.id}`;
    self.goData.getWithUrl(url, function(res){
      //reload here on success??
      if(res.Success == true){
        //add new file...

        var aBlock = self.goData.getNewBlock();
        aBlock.description = res.Filetype;
        aBlock.setBlockType('DOCUMENT');
        aBlock.objectId = res.ID;
        //aBlock.data = 

        var blockData ={
          "CreateDate": moment().toISOString(),// self.date,
          "TaskTypeDescription": "Document",
          "DocPath": res.Filepath,
          "ObjectID": res.ID
        }

        aBlock.data = blockData;
        self.home.currentBoard.documents.push(aBlock);
        self.home.documentCount = self.home.documentCount + 1;
      }
      self.home.displayDocumentSpinner = false;
    })
  }

  documentClicked(){
    var self = this;

    if(self.displayFinding){
      //dont open document if reviewing findings...
      return;
    }

    //cache current tasktype / object id so we can load it back once xray OR document is closed....
    //self.taskHelper.cacheObjectToTask(self.taskHelper.objectId, self.taskHelper.taskTypeId);

    // let taskTypeId;
    // if(!self.data.data.ObjectID){
    //   //this is a newly created document, get DocumentID and taskType with DocumentType and description....
    //   let tt = self.taskHelper.getTaskTypeWithTypeAndDescription("DOCUMENT", self.data.data.DocumentType);
    //   taskTypeId = tt.Id;
    // }else{
    //   taskTypeId = self.data.data.TaskTypeID;
    // }

    if(self.isXray && self.xrayViewerEnabled){
      //cache current tasktype / object id so we can load it back once xray OR document is closed....
      self.taskHelper.cacheObjectToTask(self.taskHelper.objectId, self.taskHelper.taskTypeId);
      self.popHelper.openXrayPop(self.data.data.DocPath, self.xrayId);
    }
    if(!self.isXray && self.isDocument){
      let taskTypeId;
      if(!self.data.data.ObjectID){
        //this is a newly created document, get DocumentID and taskType with DocumentType and description....
        let tt = self.taskHelper.getTaskTypeWithTypeAndDescription("DOCUMENT", self.data.data.DocumentType);
        taskTypeId = tt.Id;
      }else{
        taskTypeId = self.data.data.TaskTypeID;
      }
      self.home.openDocument(self.data.id, taskTypeId);
    }
    if(!self.isXray && self.isPdf){
      self.home.openPdf(self.data.data.DocPath, self.data.data.PatientID);
    }
    if(!self.isXray && self.isGoForm){
      var inst={
        'Description': this.data.description,
        'Id': self.data.id,
        'FormId': self.data.data.formId
      }
      self.home.openGoFormInstance(inst);
    }
  }

}
