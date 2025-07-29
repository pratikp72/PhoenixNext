/**
 * Created by montymccune on 7/26/19.
 */


import {inject, bindable, observable} from 'aurelia-framework';
import {DialogController} from 'aurelia-dialog';
import {http} from '../../helpers/http';
import {helper} from '../../helpers/helper';
import {Data} from '../../data/go/data';
import moment from "moment";
import {TaskHelper} from './taskHelper';

class TaskTarget {
  constructor() {
    this.id;
    this.isGroup= false;
    //this.description;
    this.firstName;
    this.lastName;
  }

  get description() {
    return `${this.firstName} ${this.lastName}`;
  }
}


@inject(http, helper, DialogController, Data, TaskHelper)
export class TaskPopup {

  url;

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;
  popupLeft = 0;
  popupTop = 0;
  overlayZIndex=5000;
  containerZIndex = 5001;

  patientId=null;
  patientName;
  providerId =null;
  taskTypeId=0;
  description="";

  @observable priority='Low';
  priorityChanged(newVal, oldVal){
    this.updateTaskItemsPriority(newVal);
  }

  createdById=0;
  objectId=0;
  objectDate=null;




  selectedTarget=null;
  taskType;
  taskTargets=[];
  filteredTaskTargets=[];
  priorityList=['Low','Med','High'];
  isSaving = false;

  @bindable datepicker;
  @observable dueDate = moment().format('MM/DD/YYYY');
  dueDateChanged(newVal, oldVal){
    this.updateTaskItemsDueDate(newVal);
  }

  home=null;

  taskToUpdate = null;
  fieldRequired =true

  //change here 
  taskItems=[];


  constructor(http, helper, DialogController, Data, TaskHelper) {
    this.http = http;
    this.helper = helper;
    this.dialogController = DialogController;
    this.goData = Data;
    this.taskHelper = TaskHelper;
  }

  activate(obj){
    let self = this;

    self.popupWidth = obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75) * .8;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;

    if(obj.data){
      if(obj.data.overlayZIndex){
        self.overlayZIndex = obj.data.overlayZIndex;
      }
      if(obj.data.containerZIndex){
        self.containerZIndex = obj.data.containerZIndex;
      }
    }

    self.home = obj.data.home;

    var descriptionDate = null;

    //check if we are updating a task....
    if(obj.data.taskToUpdate != undefined){
      // self.taskToUpdate = obj.data.taskToUpdate;//object to update on save...
      // self.patientId = obj.data.taskToUpdate.PatientID;
      // self.providerId = obj.data.taskToUpdate.ProviderID;
      // self.taskTypeId = obj.data.taskToUpdate.TypeID;
      // self.objectId = obj.data.taskToUpdate.formID;
      // self.createdById = self.helper._user.UserID;
      // self.patientName=obj.data.taskToUpdate.Patient_Name;
      // descriptionDate = obj.data.taskToUpdate.Date;
      self.taskItems.push(obj.data.taskToUpdate);
    }else{

      // self.patientId = obj.data.patientId;
      if(obj.data.providerId == 0){
        self.openProviderPicker(function(pro){
          self.home.popupHelper.closeActiveDialog();
          self.providerId = pro.ProviderID;
        });
      }else{
        self.providerId = obj.data.providerId;
      }

      self.setupTaskObjects(obj.data.taskPopupObjects);

      // self.taskTypeId = obj.data.taskTypeId;
      // self.objectId = obj.data.objectId;
      // self.createdById = self.helper._user.UserID;
      // self.objectDate = obj.data.date;
      // descriptionDate = obj.data.date;
    }

    // self.taskType = self.taskHelper.getTypeWithId(self.taskTypeId);

    // self.home.getPatientName(self.patientId, function(name){
    //   self.patientName=name;
    //   //set default description...
    //   self.description = "Review "+ self.patientName + " " + self.taskType.Description + " from " + descriptionDate;
    // });


    //create description from taskItems...
    // for(var i = 0; i < self.taskItems.length; i++){
    //   self.description += self.taskItems[i].Description + "&#13;&#10";
    // }

    //load users/ groups...
    self.loadTargetList();

  }

  updateTaskItemsPriority(priority){
    for(var i = 0; i < this.taskItems.length; i++){
      this.taskItems[i].Priority = priority;
    }
  }

  updateTaskItemsDueDate(date){
    for(var i = 0; i < this.taskItems.length; i++){
      this.taskItems[i].DueDate = date;
    }
  }

  updateTaskItemsTarget(target){
    for(var i = 0; i < this.taskItems.length; i++){
      if(target.isGroup){
        this.taskItems[i].GroupId = target.id;
      }else{
        this.taskItems[i].AssignedToID = target.id;
      }
    }
  }



  setupTaskObjects(taskPopupObjects){
    let self = this;
    for(var i = 0; i < taskPopupObjects.length; i++){
      var tObj = taskPopupObjects[i];
      var taskToSave = self.goData.getTaskObject(tObj.taskTypeId, tObj.objectId);

      //var patientName = tObj.patientName;

      new Promise(function(resolve, reject) {
        resolve(tObj.patientName);
      }).then(function(pname){
        if(pname == null){
          return new Promise(function(resolve, reject){
            self.home.getPatientName(tObj.patientId, function(name){
              //patientName = name;
              resolve(name)
            });
          });
        }else{
          return pname;
        }
      }).then(function(finalPatientName){
    
        taskToSave['Patient_Name']=finalPatientName;
        taskToSave.Type = self.taskHelper.getTypeWithId(tObj.taskTypeId).TypeAsString;
        taskToSave.Description = "Review "+ finalPatientName + " " + taskToSave.Type + " from " + tObj.date;
        taskToSave.Priority = self.priority;
        taskToSave.Status = 'ASSIGNED';
        taskToSave.UserID = self.helper._user.UserID;
        taskToSave.CreatedByID = taskToSave.UserID;
        taskToSave.PatientID = tObj.patientId;
        taskToSave.AssignedToID = 0;
        taskToSave.GroupId = 0;
        // if(self.selectedTarget.isGroup){
        //   taskToSave.GroupId = self.selectedTarget.id;
        // }else{
        //   taskToSave.AssignedToID = self.selectedTarget.id;
        // }
        taskToSave.DueDate =self.dueDate;
        taskToSave.ProviderID = tObj.providerId;
        taskToSave.objectDate = tObj.date;

        //add to description...
        self.description += taskToSave.Description + "&#13;&#10";

        self.taskItems.push(taskToSave);

      });
    }


  }

  openProviderPicker(callback){
    let self = this;
    let providerList=[];
    for(let i = 0; i < self.home.providers.length; i++){
      //ignore "ALL" provider...
      if(i ==0)continue;
      let pItm = self.goData.getGenericPicklistItem(self.home.providers[i].ProviderEntity, self.home.providers[i]);
      providerList.push(pItm);
    }
    self.home.popupHelper.openGenericPicklistPop("A provider must be selected for the task.", "Select Task Provider", providerList, false, function(providerRes){
      callback(providerRes.item);
    });
  }

  filterTarget(t){
    let self = this;
    let search = t.target.value;
    // let searchRes = _.filter(self.taskTargets, function(t){return t.description.toLowerCase().startsWith(search.toLowerCase())});
    let searchRes = _.filter(self.taskTargets, function(t){return t.firstName.toLowerCase().startsWith(search.toLowerCase()) || t.lastName.toLowerCase().startsWith(search.toLowerCase())});
    self.filteredTaskTargets = _.sortBy(searchRes, function(u){return u.description.toLowerCase()});

    $('#assignedDropdown').dropdown('show');
    $('#assignedTextbox').focus();
  }

  targetSelected(t){
    this.selectedTarget = t;
    this.updateTaskItemsTarget(t);
    this.toggleRequiredFieldColor();
  }

  toggleRequiredFieldColor(){
    let self = this;
    self.fieldRequired = self.fieldRequired ? false : true;
  }

  loadTargetList(){
    let self = this;

    //load users...
    self.goData.getAllUsers(function(res){
      for(var i = 0; i < res.length; i++){
        var aTarget = new TaskTarget();
        aTarget.id = res[i].UserID;
        //aTarget.description = res[i].FirstName + " " + res[i].LastName;//res[i].UserName;
        aTarget.firstName = res[i].FirstName;
        aTarget.lastName = res[i].LastName
        self.taskTargets.push(aTarget);
      }

      //load groups...
      self.goData.getAllGroups(function(res){
        for(var g =0; g < res.length; g++){
          var aTarget = new TaskTarget();
          aTarget.id = res[g].GroupID;
          aTarget.isGroup = true;
          //aTarget.description = res[g].GroupName;
          aTarget.firstName = res[g].GroupName;
          aTarget.lastName = "";
          self.taskTargets.push(aTarget);
        }

        //sort results when last endpoint calls back...
        self.filteredTaskTargets = _.sortBy(self.taskTargets, function(u){return u.description.toLowerCase()});

      });
    });


  }

  attached(){
    var container = $(this.taskpop).closest('ux-dialog-container');
    var contDx = container[0];
    contDx.style.setProperty("z-index", this.containerZIndex, "important");
    contDx.classList.add("active");

    //overlay
    contDx.previousSibling.classList.add("active");
    contDx.previousSibling.style.setProperty("z-index", this.overlayZIndex, "important");
  }



  openCalendar(){
    this.datepicker.methods.toggle();
  }


  saveTask(callback){
    let self = this;

    if(self.selectedTarget == null){
      callback(false);
      return;
    }

    for(var i = 0; i < self.taskItems.length; i++){
      var aTask = self.taskItems[i];

      if(aTask.TaskID ==0){
        self.goData.saveTask(aTask, function(res){
          var success = res;
          if(self.taskItems.length == 1){
            callback(success);
          }
        });
      }else{
        self.goData.updateTask(aTask, function(res){
          var success = res;
          if(self.taskItems.length == 1){
            callback(success);
          }
        });
      }
    }


    callback(false);
    
  }



  // saveTask(callback){
  //   let self = this;

  //   if(self.selectedTarget == null){
  //     callback(false);
  //     return;
  //   }

  //   var taskToSave = self.taskToUpdate != null ? self.taskToUpdate : self.goData.getTaskObject(self.taskTypeId, self.objectId);

  //   //taskToSave.Date = self.visitDate;
  //   taskToSave['Patient_Name']=self.patientName;
  //   taskToSave.Type = self.taskType.TypeAsString;
  //   taskToSave.Description = self.description;
  //   taskToSave.Priority = self.priority;
  //   taskToSave.Status = 'ASSIGNED';
  //   taskToSave.UserID = self.helper._user.UserID;
  //   taskToSave.CreatedByID = self.createdById;
  //   taskToSave.PatientID = self.patientId;
  //   taskToSave.AssignedToID = 0;
  //   taskToSave.GroupId = 0;
  //   if(self.selectedTarget.isGroup){
  //     taskToSave.GroupId = self.selectedTarget.id;
  //   }else{
  //     taskToSave.AssignedToID = self.selectedTarget.id;
  //   }
  //   taskToSave.DueDate =self.dueDate;
  //   taskToSave.ProviderID = self.providerId;
  //   taskToSave.objectDate = self.objectDate;

  //   if(self.taskToUpdate == null){
  //     self.goData.saveTask(taskToSave, function(res){
  //       var success = res;
  //       callback(success);
  //     });
  //   }else{
  //     self.goData.updateTask(taskToSave, function(res){
  //       var success = res;
  //       callback(success);
  //     });
  //   }

  // }

  close(){
    let self = this;

    if(self.fieldRequired)return;


    self.isSaving = true;
    self.saveTask(function(res){
      if(res == false){
        //no save...
        self.isSaving = false;
      }else{
        self.dialogController.close(true, {"taskToOpen" : res});
      }
    });
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
