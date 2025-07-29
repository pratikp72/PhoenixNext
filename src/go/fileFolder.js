import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';
import {CreateVisitPopup} from './createVisitPopup'
import {DialogService} from 'aurelia-dialog';
import {PopupHelper} from "./popupHelper";
import {EventAggregator} from 'aurelia-event-aggregator';
import { Globals } from './globals';

class Image{
  constructor(id, name, data){
    this.id = id;
    this.name =name;
    this.data = data;
    this.selected = false;
    this.path;
    this.displayDelete = false;
    this.icon = this.getIcon(name);
  }

  getIcon(name){
    let lName = name.toLowerCase();
    if(lName.indexOf('.pdf') > 0){
      return 'fa-file-pdf-o';
    }else if(lName.indexOf('.doc') > 0 || lName.indexOf('.docx') > 0){
      return 'fa-file-word-o';
    }else if(lName.indexOf('.txt') > 0){
      return 'fa-file-text-o';
    }else if(lName.indexOf('.png') > 0 ||
            lName.indexOf('.jpg') > 0 ||
            lName.indexOf('.jpeg') > 0 ||
            lName.indexOf('.bmp') > 0 ){
      return 'fa-file-image-o';
    }else{
      return 'fa-file-o';
    }
  }
}

class Folder{

  constructor(id, name, data){
    this.id = id;
    this.name = name;
    this.data = data;
    this.folders=[];
    this.selected = false;
    this.images=[];
    this.hasParent = false;
    this.parent = null;
    this.index =-1;
    this.hasChildren = false;
  }

  select(){
    this.selected = this.selected ? false : true;
  }
}


@inject(helper,http, Data, Home, DialogService, PopupHelper, EventAggregator, Globals)
export class FileFolder {

  allFiles=[];
  folders=[];
  allFolders=[];
  zIndex=1000;
  listHeight = 0;
  patientId;
  userId;

  faxEnabled=false;

  @observable currentFolder=null;
  currentFolderChanged(newVal, oldVal){
    if(newVal){
      let n = newVal;
      if(newVal.folders.length > 0 ||
        newVal.images.length > 0){
        newVal.hasChildren = true;
      }else{
        newVal.hasChildren = false;
      }
    }
  }

  folderCount = 0;

  popupHelper;

  rootFolder;

  constructor(helper, http, Data, Home, DialogService, PopupHelper, EventAggregator, Globals) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
    this.eventAggregator = EventAggregator;
    this.globals = Globals;
  }

  activate(model){
    let self = this;

    self.faxEnabled = self.home.faxEnabled;

    self.popupHelper = model.home.popupHelper;

    self.patientId = model.patient.data.PatientID;
    self.userId = self.helper._user.UserID;

    self.data.getWithUrl('folders', function(f){
      self.allFolders = f;

      self.loadPatientFileFolder(self.patientId);

    });

    self.eventAggregator.subscribe("loadPatientFileFolder", function(patientId){

      self.loadPatientFileFolder(patientId);

    });

    self.eventAggregator.subscribe("inboundFaxClick", function(fax){
      var url = 'images/move';
      var od_image={
        ImageID: 0,
        PatientID: fax.data.Meta.PatientID,
        Date: fax.date,
        ImageType: "File",
        ImageName: fax.data.DisplayName,
        ImagePath: fax.data.FilePath,
        ImageLogicalFolder: self.currentFolder.data.LogicalPath,
        Folder_Id: self.currentFolder.data.Folder_Id
      }


      let saveDescription = `Moving ${od_image.ImageName} to ${od_image.ImageLogicalFolder}`;
      let saveDialog = self.helper.createNoty(saveDescription, 3000);
      saveDialog.show();

      self.data.postWithUrlAndData(url, JSON.stringify(od_image), function(res){

        if(res){
          //add result to folder view...
          self.addImagesToFolder([res], self.currentFolder);
          self.eventAggregator.publish("inboundFaxClickComplete", fax);
        }

        saveDialog.close();

      });
    });
  }

  openFax(image, event){

    let self = this;

    event.stopPropagation();

    self.home.openFax(image.data.ImageName, image.data.ImageID, image.data.ImageType.toUpperCase());
  }

  loadPatientFileFolder(patientId){
    let self = this;
    self.loadAllFiles(patientId, function(){
      self.loadFolders();
    });
  }

  attached(){
    let self = this;
    self.listHeight = window.innerHeight - 16;


    //IMAGE PICKER CHANGE EVENT...
    var imgPicker = document.getElementById('fileFolderPicker');
    imgPicker.onchange = () => {
      for(var i = 0; i < imgPicker.files.length; i++){
        var imgFile = imgPicker.files[i];  
        self.saveFileDrop(imgFile);
      }
    }
  }



  loadAllFiles(patientId, callback){
    let self = this;
    self.data.getWithUrl(`images?patientId=${patientId}`, function(imgs){
      self.allFiles = imgs;
      callback();

    });
  }

  loadFolders(){
    let self = this;

    self.currentFolder = null;

    let folderList = JSON.parse(JSON.stringify(self.allFolders));

    let imagingFolder = _.find(folderList, function(f){return f.FolderName == 'Imaging'});
    self.rootFolder = new Folder(imagingFolder.Folder_Id, imagingFolder.FolderName, imagingFolder);
    //let current = root;
    //remove imagingFolder from list...
    _.remove(folderList, function(r){r.Folder_Id == imagingFolder.Folder_Id});

    self.currentFolder = self.rootFolder;

    self.loopFolder(self.currentFolder);

    self.currentFolder = self.rootFolder;

    self.listHeight = self.fileListDiv.clientHeight;
  }

  loopFolder(folder){
    let self = this;

    if(self.folderCount == self.allFolders.length)return;

    let childFolders = self.getListOfChildFolders(folder.id, self.allFolders);
    if(childFolders.length > 0) {

      if(folder.folders.length == 0 && !folder.complete){
        self.createChildFoldersWithFolder(folder);
      }

      for(let i = 0; i < folder.folders.length; i++){
        self.currentFolder = folder.folders[i];
        if(!self.currentFolder.complete){
          self.loopFolder(self.currentFolder);
        }
      }
    }else{
      //no children...
      //get next child folder of parent...
      folder.complete = true;

      let nextChild = self.getNextChildFromParentWithIndex(folder.parent, folder.index);
      if(nextChild != null){
        self.loopFolder(nextChild);
      }else{

        //current folder complete...
        folder.parent.complete = true;

        //get parent...
        if(folder.parent && folder.parent.parent){
          self.currentFolder = folder.parent.parent;
          self.loopFolder(folder.parent.parent);
        }
      }
    }
  }

  createChildFoldersWithFolder(folder){
    let self = this;
    let children = _.filter(self.allFolders, function(f){return f.Parent_Id == folder.id });
    for(let i = 0; i < children.length; i++){
      let aChild = children[i];

      let childFolder = new Folder(aChild.Folder_Id, aChild.FolderName, aChild);
      childFolder.index = i;
      childFolder.parent = folder;
      childFolder.hasParent = true;

      //get images...
      let imgs = self.getChildImages(childFolder.id);
      self.addImagesToFolder(imgs, childFolder);

      folder.folders.push(childFolder);

      self.folderCount++;

      folder.complete = true;
    }
  }

  getNextChildFromParentWithIndex(parent, currentFolderIndex){
    if(parent.folders.length > currentFolderIndex + 1){
      return parent.folders[currentFolderIndex + 1];
    }else{
      return null;
    }
  }

  addFolderToFolder(folderToAdd, folderToAddTo){
    folderToAddTo.folders.push(folderToAdd);
  }

  addImagesToFolder(images, folder){
    for(let i = 0; i < images.length; i++){
      let aImg = new Image(images[i].ImageID, images[i].ImageName, images[i]);
      //aImg.path = this.createImagePath(aImg);
      folder.images.push(aImg);
    }
  }

  getChildImages(folderId){
    let self = this;
    return _.filter(self.allFiles, function(f){return f.Folder_Id == folderId});
  }

  getListOfChildFolders(parentId, folders){
    let self = this;
    return _.filter(folders, function(f){return f.Parent_Id == parentId && f.UserID == 0});
  }

  getFolder(folderId){
    let self = this;
    return _.filter(self.allFolders, function(f){return f.Folder_Id == folderId});
  }

  doesFolderChildIndexExist(folder, index){
    for(let i = 0;i < folder.folders.length; i++){
      let child = folder.folders[i];
      if(child.index == index){
        return true;
      }
    }
    return false;
  }

  backClick(){
    let self = this;

    // if(self.selectedItem){
    //   self.selectedItem.selected = false;
    // }

    if(self.currentFolder.parent){
      self.currentFolder = self.currentFolder.parent;
    }
    //self.hasParent = self.currentItem.parent ? true : false;
  }

  folderClick(folder){
    let self = this;

    self.currentFolder = folder;
    self.currentFolder.hasParent = folder.parent ? true : false;

  }

  imageClick(i){
    this.openImage(i);
  }



  createImagePath(image){
    let physicalPath = image.data.ImagePath;
    let patientDocuemntIndex = physicalPath.indexOf('Documents');
    let docPathSplit = physicalPath.substring(patientDocuemntIndex, physicalPath.length).split('\\');
    let docPath = '';
    for(let i = 0; i < docPathSplit.length; i++){
      docPath += docPathSplit[i] + '/';
    }
    return `${docPath}${image.data.ImageName}`;
  }

  openImage(image){

    let self = this;

    let physicalPath = image.data.ImagePath;
    /*
    let patientDocuemntIndex = physicalPath.indexOf('Documents');
    let docPathSplit = physicalPath.substring(patientDocuemntIndex, physicalPath.length).split('\\');
    let docPath = '';
    for(let i = 0; i < docPathSplit.length; i++){
      docPath += docPathSplit[i] + '/';
    }
     */
    //let url = `${self.data.admin.GoServerUrl}${self.helper.imageTenantRoot}/${docPath}${image.data.ImageName}`;
    //let url = `${self.data.admin.GoServerUrl}${self.helper.imageTenantRoot}/${docPath}${image.data.ImageName}`;
    let url =null;

    if(self.globals.selfHosted){
      let isFullPath = image.data.ImagePath.indexOf(image.data.ImageName) > -1;
      if(isFullPath){
        url = image.data.ImagePath;
      } else {
        url = `${image.data.ImagePath}/${image.data.ImageName}`;
      }
    } else{
      url = `${physicalPath}/${image.data.ImageName}`;
    }

    // const windowHeight = window.innerHeight;s
    // const windowWidth = window.innerWidth;
    const windowHeight = '100%';
    const windowWidth = '100%';

    let options={
      closeActiveDialog: false,
      width: windowWidth,
      height: windowHeight,
      top: 0,
      left:0,
      title: "",
      popupHeight: '100%'
      // popupHeight: windowHeight - 41 //minus toolbar height
    };

    this.popupHelper.openUrlPathPop(url, options);

  }


  fileDropped(event){
    event.preventDefault();
    var dt = event.dataTransfer;
    if (dt) {
        var files = dt.files;
        for(var i = 0; i < files.length; i++){
          this.saveFileDrop(files[i]);
        }
    }
  }

  dragOver(event){
    event.preventDefault();
  }

  folderDragEnter(event){
    event.stopPropagation();
    if(event.target.nodeName == 'LI'){
      event.target.classList.add("file-dragenter");
    }

    return true;
  }

  folderDragLeave(event){
    event.stopPropagation();
    if(event.target.nodeName == 'LI'){
      event.target.classList.remove("file-dragenter");    
    }
    return true;
  }

  saveFileDrop(file){
    let self = this;
    var fData = new FormData();
    fData.append("pic", file, file.name);
    fData.append("patientId", self.patientId);
    fData.append("logicalFolder", self.currentFolder.data.LogicalPath);
    fData.append("folderId", self.currentFolder.data.Folder_Id);
   // fData.append("imageAndData", newImg);

    var url = self.helper.getApiUrl('images');
    fetch(url, {
       method: "POST",
       body: fData,
       headers:{
        "Authorization-Token": self.helper.jwt()
       }
    })
    .then((response) => response.text())
    .then((imgTxt) => {
       //add new file to folder...
       var img = JSON.parse(imgTxt);
       let aImg = new Image(img.ImageID, img.ImageName, img);
       self.currentFolder.images.push(aImg);
    });
  }

  blobToBase64(blob, callback){
    let reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
    let base64String = reader.result;
    // console.log('Base64 String - ', base64String);

    // Simply Print the Base64 Encoded String, 
     // without additional data: Attributes. 
     //var res = this.imageData.replace('data:image/jpeg;base64,', '');
    //  console.log('Base64 String without Tags- ',
     base64String =base64String.substr(base64String.indexOf(',') + 1);//);
     callback(base64String);
    } 
  }



  openFileBrowser(){
    let self = this;
    self.myInput.click();
  }

  filesPicked(event){
    var e = event;
  }

  openCamera(){
    let self = this;
    this.popupHelper.openCameraPop(function(imgStr){

      self.popupHelper.openGenericInputPop("Create New Image", ['Name'], null, false, function(res) {

        let imageName = res.inputs[0].value;

        //remove leading data info...
        //img = img.replace('data:image/jpeg;base64,','');

        let iData = imgStr.image;
        let folderID = self.currentFolder.id;

        let newImg = {
          'PatientID': self.patientId,
          'UserID': self.userId,
          'ImageName': imageName + ".jpeg",
          'ImageLogicalFolder': self.getLogicalFolderPath(folderID),
          'Folder_Id': folderID,
          'Base64String': iData,
          'ImageFormat': 'JPEG'
        }

        self.saveImage(newImg);

      });

    });
  }

  saveImage(ImageAndData){
    let self = this;
    let saveDescription = `Saving ${ImageAndData.ImageName}...`;
    let saveDialog = self.helper.createNoty(saveDescription, 3000);
    saveDialog.show();

    self.data.postWithUrlAndData('images/camera', JSON.stringify(ImageAndData), function(res){

      saveDialog.close();
      //add image to folder...
      let newImg = new Image(res.ImageID, res.ImageName, res);
      self.currentFolder.images.push(newImg);

    });
  }


  newImage(){
    let self = this;
    self.home.openCamera(function(img){

      self.popupHelper.openGenericInputPop("Create New Image", ['Name'], null, false, function(res) {

        let imageName = res.inputs[0].value;

        //remove leading data info...
        img = img.replace('data:image/jpeg;base64,','');

        let iData = img;
        let folderID = self.currentFolder.id;

        let newImg = {
          'PatientID': self.patientId,
          'UserID': self.userId,
          'ImageName': imageName,
          'ImageLogicalFolder': self.getLogicalFolderPath(folderID),
          'Folder_Id': folderID,
          'Base64String': iData
        }

        let saveDescription = `Saving ${imageName}...`;
        let saveDialog = self.helper.createNoty(saveDescription, 3000);
        saveDialog.show();

        self.data.postWithUrlAndData('images/camera', JSON.stringify(newImg), function(res){

          saveDialog.close();
          //add image to folder...
          let newImg = new Image(res.ImageID, res.ImageName, res);
          self.currentFolder.images.push(newImg);

        });

      });
    });
  }

  getLogicalFolderPath(folderId){
    let self = this;
    let logicalPath = '';
    let current = _.find(self.allFolders, function(f){return f.Folder_Id == folderId});
    if(!current){
      return null;
    }
    logicalPath = current.FolderName;
    while (current.Parent_Id != 0){
      current = _.find(self.allFolders, function(f){return f.Folder_Id == current.Parent_Id});
      logicalPath = current.FolderName + "\\" + logicalPath;
    }
    return logicalPath;
  }

  newFolder(){
    let self = this;
    self.popupHelper.openGenericInputPop("Create New Folder", ['Name'], null, false, function(res){
      let folderNmae = res.inputs[0].value;

      let aFolder ={
        'FolderName': folderNmae,
        'PatientID': 0,
        'Parent_Id': self.currentFolder.id,
        'IsFolderFixed': 0,
        'IsPatientFolder': 0,
        'UserID': 0
      }

      let saveDescription = `Saving ${folderNmae}...`;
      let saveDialog = self.helper.createNoty(saveDescription, 3000);
      saveDialog.show();
      self.data.postWithUrlAndData('folders', JSON.stringify(aFolder), function(res){

        saveDialog.close();

        if(res ==null){
          //error
        }else{
          //add new folder to list...
          let newFolder = new Folder(res.Folder_Id, res.FolderName, res);
          newFolder.index = self.currentFolder.folders.length;
          newFolder.parent = self.currentFolder;
          newFolder.hasParent = true;

          self.currentFolder.folders.push(newFolder);
        }
      });
    });
  }

  renameFolder(){
    let self = this;
    self.popupHelper.openGenericInputPop("Rename Folder", ['Name'], null, false, function(res){
      let folderNmae = res.inputs[0].value;

      let aFolder ={
        'Folder_Id': self.currentFolder.data.Folder_Id,
        'FolderName': folderNmae,
        'PatientID': self.currentFolder.data.PatientID,
        'Parent_Id': self.currentFolder.data.Parent_Id,
        'IsFolderFixed': self.currentFolder.data.IsFolderFixed,
        'IsPatientFolder': self.currentFolder.data.IsPatientFolder,
        'UserID': self.currentFolder.data.UserID,
      }

      let saveDescription = `Renaming ${folderNmae}...`;
      let saveDialog = self.helper.createNoty(saveDescription, 3000);
      saveDialog.show();
      self.data.putWithUrlAndData('folders', aFolder, function(res){

        saveDialog.close();

        if(res ==null){
          //error
        }else{
          //update folder name...
          self.currentFolder.name = folderNmae;
        }
      });
    });
  }

  moveImage(image){
    let self = this;

    let viewPath = './moveFolderView';

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let third = windowWidth / 3;

    let width = third * 2;
    let left = third / 2;

    let height = windowHeight - 100;
    let top = 50;

    let options={
      displayHeader: false,
      bodyPadding: 0
    }

    this.popupHelper.openViewModelPop(viewPath, self, 'Move to new folder...', width, height, top, left, options, function(res){

      if(res.cancelled == true){
        //turn off delete...
        image.displayDelete = false;
        return;
      }

      let targetFolder = res.folder;

      image.data.Folder_Id = targetFolder.data.Folder_Id;
      image.data.ImageLogicalFolder = targetFolder.data.FolderName;

      let saveDescription = `Moving ${image.name} to ${targetFolder.data.name}...`;
      let saveDialog = self.helper.createNoty(saveDescription, 3000);
      saveDialog.show();
      self.data.putWithUrlAndData('images', image.data, function(res){

        //turn off delete...
        image.displayDelete = false;

        saveDialog.close();

        if(res ==null){
          //error
        }else{
          //remove image from current location...
          let images = self.currentFolder.images;

          for(let f = 0; f < images.length; f++){
            let img = images[f];
            if(img.id == image.id){
              //found it, delete!
              images.splice(f, 1);

              //add to new folder...
              targetFolder.images.push(image);
              break;
            }
          }
        }
      });


    });

  }

  deleteImage(image){
    let self = this;

      let msg = `Do you wish to delete ${image.name}?`;
      self.popupHelper.openGenericMessagePop(msg, 'Delete Image', ['YES','NO'], false, function(res){
        let r = res.result;
        if(r == 'YES'){

          let saveDescription = `Deleting ${image.name}...`;
          let saveDialog = self.helper.createNoty(saveDescription, 3000);
          saveDialog.show();

          let url = `images?id=${image.id}`;
          self.data.deleteWithUrl(url, function(res){

            saveDialog.close();

            if(!res){
              //error
            }else{
              //remove folder from list...
              let images = self.currentFolder.images;

              for(let f = 0; f < images.length; f++){
                let img = images[f];
                if(img.id == image.id){
                  //found it, delete!
                  images.splice(f, 1);
                  break;
                }
              }
            }
          });

        }
      });

  }

  deleteFolder() {
    let self = this;

    if(self.currentFolder.hasChildren){
      //cant delete folder with images...
      self.popupHelper.openGenericMessagePop('You cannot delete a folder with children.', 'Delete Failed', ['OK'], false, function(res){
        return;
      });
    }else{

      let msg = `Do you wish to delete ${self.currentFolder.name}?`;
      self.popupHelper.openGenericMessagePop(msg, 'Delete Folder', ['YES','NO'], false, function(res){
        let r = res.result;
        if(r == 'YES'){

          let saveDescription = `Deleting ${self.currentFolder.name}...`;
          let saveDialog = self.helper.createNoty(saveDescription, 3000);
          saveDialog.show();

          let url = `folders?id=${self.currentFolder.id}`;
          self.data.deleteWithUrl(url, function(res){

            saveDialog.close();

            if(!res){
              //error
            }else{
              //remove folder from list...
              let parent = self.currentFolder.parent;

              for(let f = 0; f < parent.folders.length; f++){
                let folder = parent.folders[f];
                if(folder.id == self.currentFolder.id){
                  //found it, delete!
                  parent.folders.splice(f, 1);

                  //set currentfolder = parent...
                  self.currentFolder = parent;
                  break;
                }
              }
            }
          });

        }
      });

    }
  }


  rowSwipe(event, row) {
    if (event.direction === 'left') {
      //display delete option...
      if(!row.displayDelete){
        row.displayDelete = true;
      }
    }else if(event.direction === 'right') {
      //display delete option...
      if(row.displayDelete){
        row.displayDelete = false;
      }
    }
  }


}
