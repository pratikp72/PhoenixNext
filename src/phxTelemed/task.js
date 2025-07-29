/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import moment from 'moment';
import {UserSearch} from '../phxTelemed/userSearch';
import {PxSearch} from "./pxSearch";
import {DialogService} from 'aurelia-dialog';
import * as _ from 'lodash';


class OD_Task{
  constructor(id, date, data){
    this.id = id;
    this.date = date;
    this.selected = false;
    this.data = data;
  }
}


@inject(DialogController, http, helper, DialogService)
export class Task {


  selectedTask=null;
  taskResults=[];
  filteredTasks=[];
  taskStatusList=["ASSIGNED","COMPLETED"];

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;
  openPatientOnClose = false;
  launchPatientId=null;

  tasksToUpdate=[];

  filterStatus='assigned';


  constructor(DialogController, http, helper, DialogService){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.dialogService = DialogService;
  }

  close(){
    let self = this;
    self.dialogController.close(true, {'launchPatientId': self.launchPatientId });
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  launchPatient(task){
    this.launchPatientId = task.data.PatientID;
    this.close();
  }

  addToUpdate(task){
    var index =  _.findIndex(this.tasksToUpdate, function(o) { return o.TaskID == task.id; });
    if(index == -1){
      this.tasksToUpdate.push(task.data);
    }else{
      this.tasksToUpdate.splice(index, 1, task.data);
    }
  }


  saveAndClose(){
    var self = this;
    self.saveTasks(function (res) {
      self.close();
    });
  }

  saveTasks(callback){
    let self = this;

    if(self.tasksToUpdate.length == 0){
      callback();
      return;
    }

    let url = "tasks";

    var toUpdate = {
      'tasks' : []
    }

    for(var i = 0; i < self.tasksToUpdate.length; i++){
      var aTask = {
        'Id': self.tasksToUpdate[i].TaskID,
        'Description': self.tasksToUpdate[i].Description,
        'Status': self.tasksToUpdate[i].Status,
        'AssignedToID': self.tasksToUpdate[i].AssignedToID
      };
      toUpdate.tasks.push(aTask);
    }

    self.http.put(self.helper.getApiUrl(url), toUpdate, function (res) {
      if(callback != undefined && callback != null){
        callback(res);
      }
      //clear out tasks on success...
      self.tasksToUpdate = [];
    }, function(err){
      if(callback != undefined && callback != null){
        callback(err);
      }
    });
  }

  activate(obj){
    let self = this;

    //self.providerId = obj.providerId;
    self.popupWidth = obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75) * .8;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;

    self.getTaskByUserId();
  }

  setStatus(task, status){
    task.data.Status = status;
    this.addToUpdate(task);
  }

  toggleFilterStatus(){
    var self = this;
    self.filterStatus = self.filterStatus == 'assigned' ? 'completed' : 'assigned';
    self.refreshFilteredTasks(self.filterStatus);
  }

  refreshFilteredTasks(status){
    var self = this;
    var tStatus = status == undefined ? 'assigned' : self.filterStatus;
    var filtered = _.filter(self.taskResults, function(t){ return t.data.Status.toLowerCase() == tStatus; });
    self.filteredTasks = filtered;
  }

  setDescription(task){
    //task.data.Description = description;
    this.addToUpdate(task);
  }

  forwardTask(task){
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth / 2;

    var self = this;
    self.dialogService.open({viewModel: UserSearch, model: {popupWidth: 250, popupHeight: windowHeight, taskpop: self.taskdialog}}).whenClosed(response => {
      let res = response.output;
      if(res != null){
        //update task with selected user...
        task.data.AssignedToID = res.id;
        task.data.Status = 'ASSIGNED';
        self.addToUpdate(task);
        self.saveTasks(function (res){
          //remove task from table on success...
          var indexToRemove = _.findIndex(self.taskResults, function(o) { return o.id == task.id; });
          if(indexToRemove > -1){
            self.taskResults.splice(indexToRemove, 1);
          }
          //refresh table...
          self.refreshFilteredTasks(self.filterStatus);

          //clear out task to update...
          self.tasksToUpdate = [];
        });
      }
    });
  }

  getTaskByUserId(){
    var self = this;
    self.taskResults=[];
    self.filteredTasks=[];
    var url = 'tasks?userId='+self.helper._user.UserID;
    self.http.get(self.helper.getApiUrl(url), function (res) {

      for(var i = 0; i < res.length; i++){
        var aTask = res[i];
        var date = self.helper.getISODateToFormat(aTask.DateCreated, "MM/DD/YYYY");
        self.taskResults.push(new OD_Task(aTask.TaskID, date, aTask));
      }

      //display ONLY assigned...
      self.refreshFilteredTasks('assigned');
    });
  }

  rowClicked(r){
    this.selectedTask = r;
    for(var i = 0; i < this.filteredTasks.length; i++){
      if(this.filteredTasks[i].id == r.id){
        this.filteredTasks[i].selected = true;
      }else{
        this.filteredTasks[i].selected = false;
      }
    }
  }

}
