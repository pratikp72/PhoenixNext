import {inject, observable} from 'aurelia-framework';//observable
import {Data} from '../../data/go/data';
import * as _ from "lodash";

@inject(Data)
export class TaskHelper {

  constructor(Data) {
    var self = this;
    this.goData = Data;
    this.taskTypeList = [];
    this.all=[];
  }


   @observable objectId=0;
  //objectId=0;
  taskTypeId=0;

  cacheObjectId=0;
  cacheTaskTypeId=0;

  hasTaskableObject=false;

  patientId;
  userId;
  date;

  search='';
  filterUserId=0
  filterUserName=null;
  filterPatientOrUser='patient';
  displayTaskOrMessage='Tasks';


  setup(){
    let self = this;
    self.goData.getAllowableTaskTypes(function (allowed, all) {
      self.taskTypeList = allowed;
      self.all = all;
    });
  }

  clear(){
    this.objectId = 0;
    this.taskTypeId = 0;
    this.patientId=null;
    this.userId=0;
    this.date=null;
  }

  objectIdChanged(newVal, oldVal){
    if(newVal == 0){
      this.hasTaskableObject = false;
    }else{
      this.hasTaskableObject = true;
    }
  }

  clearCachedTask(){
    this.cacheObjectId=0;
    this.cacheTaskTypeId=0;
  }

  canOpen(taskTypeId){
    return _.find(this.taskTypeList, function (t){ return t.Id == taskTypeId});
  }

  setObjectToTask(objectId, taskTypeId){
    this.objectId = objectId;
    this.taskTypeId = taskTypeId;
  }

  cacheObjectToTask(objectId, taskTypeId){
    this.cacheObjectId = objectId;
    this.cacheTaskTypeId = taskTypeId;
  }

  cacheCurrentTask(){
    this.cacheObjectId = this.objectId;
    this.cacheTaskTypeId = this.taskTypeId;
  }

  getTypeWithId(id){
    return _.find(this.all, function (t){ return t.Id == id});
  }

  getTaskTypeWithTypeAndDescription(type, desc){
    return  _.find(this.all, function (t) {
      return t.TypeAsString.toLowerCase() == type.toLowerCase() && t.Description.toLowerCase() == desc.toLowerCase();
    });
  }
}
