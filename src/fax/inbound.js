
import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import {Data} from '../data/go/data';
import { PopupHelper } from '../go/popupHelper';
import {EventAggregator} from 'aurelia-event-aggregator';
import { TaskHelper } from '../go/task/taskHelper';
import { Globals } from '../go/globals';



class FaxObject{
  constructor(fax, helper){
    this.helper = helper;
    this.data = fax;
    this.date=null;
    this.successClass ="table-primary";
    this.setup(fax);
    this.checked=false;
    this.sendToFolder=false;
  }

  setup(fax){
    if(fax.Meta.Confidence != null){
      if(fax.Meta.Confidence == 'High'){
        this.successClass = 'table-success';
      }else if(fax.Meta.Confidence == 'Medium'){
        this.successClass = 'table-warning';
      }else if(fax.Meta.Confidence == 'Low'){
        this.successClass = 'table-danger';
      }
    }
    //date...
    var dtStr = Date.parse(fax.CreationTime);
    var newDate= new Date(dtStr);
    var month = newDate.getMonth() + 1;
    //add zero if needed...
    if(month.toString().length == 1){
      month = "0" + month;
    }
    this.date = `${month}/${newDate.getDate()}/${newDate.getFullYear()}`;
  }
}

@inject(DialogController, http, helper, Data, PopupHelper, EventAggregator, TaskHelper, Globals)
export class Inbound {

  goHome = null;
  confidenceList=["", "HIGH", "MEDIUM", "LOW"];
  confidenceFilter=null;
  inboundFaxFolders=[];
  folderFilter=null;
  faxes=[];
  folders=[];

  inboundFaxCompleteListener=null;
  filefolderListener=null;
  demographicsClosedLIstener=null;
  canAutoImport=false;
  filewatcherType=null;
  fileFolderOpenedListener=null;

  openFileFolderPatientId=null;

	constructor(DialogController, http, helper, Data, PopupHelper, EventAggregator, TaskHelper, Globals){
		this.message = "test login message";
		this.dialogController = DialogController;
		this.http = http;
		this.helper = helper;
    this.goData = Data;
    this.popupHelper = PopupHelper;
    this.eventAggregator = EventAggregator;
    this.taskHelper = TaskHelper;
    this.globals = Globals;
	}

	activate(model){
		let self = this;
    self.goHome = model.home;
    self.filewatcherType = model.filewatcherType;

    self.filefolderListener = this.eventAggregator.subscribe("fileFolderClosed", function(){
      self.setAllSendToFolderForFaxes(false);
    });

    self.filefolderOpenedListener = this.eventAggregator.subscribe("fileFolderOpened", function(patientId){
      self.openFileFolderPatientId = patientId;
      self.setAllSendToFolderForFaxes(true);
    });

    self.demographicsClosedLIstener = this.eventAggregator.subscribe("demographicsClosed", function(){
      self.setAllSendToFolderForFaxes(false);
    });

    self.inboundFaxCompleteListener = self.eventAggregator.subscribe('inboundFaxClickComplete', function(fax){
      var faxIndex = _.findIndex(self.faxes, function(f){return f.data.DisplayName == fax.data.DisplayName});
      if(faxIndex){
        self.faxes.splice(faxIndex, 1);
      }
    });

    if(self.filewatcherType=='fax'){
      self.getFolders();
    }

    self.getFilewatcherFolderWithTenantAndType(self.globals.admin.TenantId, self.filewatcherType);

	}

  close(){
    this.dialogController.cancel();
  }

  attached(){
    var style={
      'opacity': 0
    }
    $('ux-dialog-overlay').css(style);

    var uxStyle={
      'padding': 0
    }
    $('ux-dialog').css(uxStyle);

    var dxContainer = $('ux-dialog-container');
    dxContainer[0].style.setProperty("z-index", 3999, "important");//5001
  }

  detached(){
    this.inboundFaxCompleteListener.dispose();
    this.filefolderListener.dispose();
    this.demographicsClosedLIstener.dispose();
    this.filefolderOpenedListener.dispose();
  }

  viewPdf(fax, event){
    event.stopPropagation();
    var options={
      closeActiveDialog: false,
      width: window.innerWidth - 71 + "px",
      height: '100%',
      popupHeight: '100%'
    }

    // let iisFolder = this.folderFilter.Description;
    // var url = this.goData.admin.GoServerUrl + "/" + this.helper.imageRoot + `/${iisFolder}/${fax.data.DisplayName}`;//inboundfax

    this.popupHelper.openUrlPathPop(fax.data.FilePath, options);
  }

  addToFolder(fax, e){
    let self = this;
    e.stopPropagation();

    if(self.openFileFolderPatientId != null){
      fax.data.Meta.PatientID = self.openFileFolderPatientId;
    }


    this.eventAggregator.publish('inboundFaxClick', fax);
  }

  autoAttach(task){
    var self = this;
    var checkedFaxes = _.filter(self.faxes, function(f){return f.checked});
    var taskType = self.taskHelper.getTaskTypeWithTypeAndDescription('Image', "Image");

    var batched={
      Images:[]
    }
    var url = 'images/move/batch';
    for(var i = 0; i < checkedFaxes.length; i++){
      var fax = checkedFaxes[i];

      //saerch FolderName, see if selected folder matches...
      //if so, move to that folder, if not move to OTHER
      var foundFolder = _.find(self.folders, function(f){return f.FolderName == self.folderFilter.Description});
      if(!foundFolder){
        foundFolder = _.find(self.folders, function(f){return f.FolderName == 'Other'});
      }

      var od_image={
        ImageID: 0,
        PatientID: fax.data.Meta.PatientID,
        Date: fax.date,
        ImageType: "File",
        ImageName: fax.data.DisplayName,
        ImagePath: fax.data.FilePath,
        ImageLogicalFolder: foundFolder.LogicalPath,
        Folder_Id: foundFolder.Folder_Id
      }
      batched.Images.push(od_image);
    }

    let saveDescription = `Auto-attaching selected images...`;
    let saveDialog = self.helper.createNoty(saveDescription, 3000);
    saveDialog.show();

    self.goData.postWithUrlAndData(url, JSON.stringify(batched), function(res){

      var taskObjectList=[];

      //remove each successful image...
      for(var i = 0; i < res.length; i++){
        var aImg = res[i];
        var faxIndex = _.findIndex(self.faxes, function(f){return f.data.DisplayName == res[i].ImageName});
        if(faxIndex){

          //TASK???
          if(task){
            var todayDate = new Date();
            var dateStr =self.helper.getMMDDYYYYDateWithDate(todayDate);
            var provId = self.goHome.currentProvider ? self.goHome.currentProvider.ProviderID : 0;
            var taskPopupObject = self.goData.getNewTaskPopupObject(self.faxes[faxIndex].data.Meta.PatientID, provId, dateStr, aImg.ImageID, taskType.Id);
            taskPopupObject.patientName =self.faxes[faxIndex].data.Meta.PatientName;
            taskObjectList.push(taskPopupObject);
          }
          self.faxes.splice(faxIndex, 1);
        }
      }

      if(taskObjectList.length > 0){
        self.goHome.taskObjectList(taskObjectList,false);
      }

      saveDialog.close();
    });

  }

  toggleCheck(fax, e){
    fax.checked = fax.checked ? false : true;
    e.stopPropagation();

    //set canAutoImport boolean...
    var foundChecked = _.find(this.faxes, function(f){return f.checked});
    this.canAutoImport = foundChecked ? true : false;
  }

  deleteSelectedItems(){
    let self = this;
    var foundChecked = _.filter(self.faxes, function(f){return f.checked});
    for(var i = 0; i < foundChecked.length; i++){
      var url = `faxing/inbound/delete`;
      var itemToDelete={
        "FilePath": foundChecked[i].data.FilePath,
        "XmlFilePath": foundChecked[i].data.XmlFilePath
      }
      self.goData.postWithUrlAndData(url, JSON.stringify(itemToDelete), function(res){
        if(res){
          //remove from list...
          var index = _.findIndex(self.faxes, function(f){return f.data.FilePath == res.FilePath});
          self.faxes.splice(index, 1);
        }
      });
    }
  }

  moveToPending(){
    let self = this;
    var foundChecked = _.filter(self.faxes, function(f){return f.checked});
    for(var i = 0; i < foundChecked.length; i++){
      var url = `faxing/inbound/pending`;
      var itemToDelete={
        "FilePath": foundChecked[i].data.FilePath,
        "XmlFilePath": foundChecked[i].data.XmlFilePath
      }
      self.goData.postWithUrlAndData(url, JSON.stringify(itemToDelete), function(res){
        if(res){
          //remove from list...
          var index = _.findIndex(self.faxes, function(f){return f.data.FilePath == res.FilePath});
          self.faxes.splice(index, 1);
        }
      });
    }
  }

  reprocess(){
    let self = this;
    var foundChecked = _.filter(self.faxes, function(f){return f.checked});
    var url = `PDFOCR/files`;
    var filesObject={
      "files": [],
      "tenantId": self.globals.admin.TenantId,
      "filewatcherType": 'fax'
    }
    for(var i = 0; i < foundChecked.length; i++){
      filesObject.files.push(foundChecked[i].data.FilePath);
    }
    self.goData.postWithFaxUrlAndData(url, JSON.stringify(filesObject), function(res){
      if(res){
        //remove from list...
        // var index = _.findIndex(self.faxes, function(f){return f.data.FilePath == res.FilePath});
        // self.faxes.splice(index, 1);
      }
    });
  }

  // getInboundFolders(){
  //   let self = this;
  //   var url = `faxing/inbound/folders`;
  //   self.goData.getWithUrl(url, function(res){
  //     self.inboundFaxFolders = res;
  //   });
  // }

  getFolders(){
    let self = this;
    var url = `folders`;
    self.goData.getWithUrl(url, function(res){
      //just PHX Auto-Match folders...
      var autoMatch = _.find(res, function(f){return f.FolderName == 'PHX Auto-Match'});
      self.folders = _.filter(res, function(af){return af.Parent_Id == autoMatch.Folder_Id});
    });
  }

  getFilewatcherFolderWithTenantAndType(tenantId, type){
    let self = this;
    // var url = `filewatcher/folders?tenantId=${tenantId}&type=${type}`;
    // self.goData.getWithFaxUrl(url, function(res){
    //   self.inboundFaxFolders = res;
    // });

    var inboundFolder={
      "FullPath": "inboundFaxes",
      "Description": "inboundFaxes"
    }
    self.folderFilter = inboundFolder;
    self.inboundFaxFolders.push(inboundFolder);
    self.getInboundWithConfidence();

  }

  getInboundWithConfidence(){
    let self = this;
    self.faxes=[];
    // var url = `faxing/inbound?folderPath=${self.folderFilter.FullPath}`;
    // if(self.confidenceFilter != null){
    //   url += `&confidence=${self.confidenceFilter}`;
    // }else{
    //   url += `&confidence=`;
    // }

    var tenantIdDashed = self.helper.getTenantIdDashed(self.helper._user.TenantId);

    var url = `inboundfaxing/directory/uris?tenantId=${tenantIdDashed}&directory=${self.folderFilter.FullPath}`;
    self.goData.getWithUrl(url, function(res){
      for(var i = 0; i < res.length; i++){


        var fax={
          "Meta":{
            "Confidence":"Low"
          },
          "CreationTime": new Date(),
          "DisplayName": self.parseDisplayNameFromAzureDirectoryUri(res[i]),
          "FilePath": res[i]
        }

        // if(fax.Meta.Confidence != null){
        //   if(fax.Meta.Confidence == 'High'){
        //     this.successClass = 'table-success';
        //   }else if(fax.Meta.Confidence == 'Medium'){
        //     this.successClass = 'table-warning';
        //   }else if(fax.Meta.Confidence == 'Low'){
        //     this.successClass = 'table-danger';
        //   }
        // }
        // //date...
        // var dtStr = Date.parse(fax.CreationTime);
        // var newDate= new Date(dtStr);
        // var month = newDate.getMonth() + 1;
        // //add zero if needed...
        // if(month.toString().length == 1){
        //   month = "0" + month;
        // }
        // this.date = `${month}/${newDate.getDate()}/${newDate.getFullYear()}`;


        var aFax = new FaxObject(fax);
        self.faxes.push(aFax);
      }
    });
  }

  parseDisplayNameFromAzureDirectoryUri(uri){
    var lastSlashIndex = uri.lastIndexOf("/");
    var displayName = uri.slice(lastSlashIndex + 1, uri.length);
    return decodeURI(displayName);
  }

  confidenceSelected(){
    this.getInboundWithConfidence();
  }

  folderSelected(){
    this.getInboundWithConfidence();
  }

  setSendToFolderForFaxesWithData(data){
    let self = this;
    for(var i = 0; i < self.faxes.length; i++){
      var aFax = self.faxes[i];
      if(data.DisplayName == aFax.data.DisplayName){
        aFax.sendToFolder = true;
      }else{
        aFax.sendToFolder = false;
      }
    }
  }

  setAllSendToFolderForFaxes(sendToFolder){
    let self = this;
    for(var i = 0; i < self.faxes.length; i++){
      var aFax = self.faxes[i];
      aFax.sendToFolder = sendToFolder;
    }
  }

  openPatientFolder(data, event){
    let self = this;
    event.stopPropagation();
    self.goHome.loadPatient(data.Meta.PatientID, function(patient){
      self.goHome.showDemographics(false);
      setTimeout(()=>{
        self.eventAggregator.publish('showDemographicsFiles', patient);

        self.setSendToFolderForFaxesWithData(data);

      }, 500);
    });
  }

  

}
