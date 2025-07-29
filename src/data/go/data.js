import moment from 'moment';
import * as _ from 'lodash';
import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject} from 'aurelia-framework';
import {Globals} from '../../go/globals';
import Packery from  'packery';

//chang

class TaskPopupObject{
  constructor(patientId, providerId, date, objectId, taskTypeId){
    this.patientId = patientId;
    this.patientName=null;
    this.providerId = providerId;
    this.date = date;
    this.objectId = objectId;
    this.taskTypeId = taskTypeId;
  }
}

class ParentChildItem{
  constructor(description, data, parent){
    this.description = description;
    this.data = data;
    this.items=[];
    this.parent = parent ? parent : null;
    this.selected=false;
    this.id=0;
  }

  addItem(item){
    let id = this.items.length + 1;
    item.id = id;
    this.items.push(item);
  }
}

class GenericTableRow{
  constructor(cells, data){
    this.cells = cells;
    this.data = data;
    this.selected=false;
    this.id=0;
  }
}


class GenericPicklistItem{
  constructor(description, data){
    this.description = description;
    this.data = data;
  }
}

class PreferenceObj{
  constructor(description, data, bodypart){
    this.description = description;
    this.data = data;
    this.bodypart = bodypart;
    this.selected = false;
  }
}

class ExamData{
  constructor(exam, hpi, plan){
    this.exam = exam;
    this.plan = plan;
    this.hpi = hpi;
  }
}

class BodypartSide{
  constructor(part, side){
    this.part = part;
    this.side = side;
  }
}

class MessageTarget{
  constructor(id, first, last, targetType, targetId, photo){
    this.id = id;
    this.firstName = first;
    this.lastName = last;
    this.selected = false;
    this.matchedLast = false;
    this.targetType = targetType;
    this.targetId = targetId;
    this.photo = photo;
  }
}



class Px{
  constructor(id, code, desc, date, data){
    this.id = id;
    this.selected = false;
    this.code = code;
    this.description = desc;
    this.date = date;
    this.data = data;
    this.modifier=null;
    if(data && data.Modifier){
      this.modifier = data.Modifier
    } 
    this.index =0;
    this.displayDelete=false;
    this.side;
    this.part;
    this.type;
    this.outside;
    this.canDelete=false;
  }

  isEven(){
    return this.index % 2 == 0;
  }
}

class filterData{
  constructor(type, data){
    this.type = type;
    this.data = data;
  }
}

class MedRow{
  constructor(id, description, lastRefill, status){
    this.id = id;
    this.description = description;
    this.lastRefill = lastRefill;
    this.status = status;
    this.displayDelete=false;
    this.index=0;
  }

  isEven(){
    return this.index % 2 == 0;
  }
}

class AllergyRow{
  constructor(id, description, date, reaction){
    this.id = id;
    this.description = description;
    this.date = date;
    this.reaction = reaction;
    this.displayDelete=false;
    this.index=0;
  }

  isEven(){
    return this.index % 2 == 0;
  }

  testMethod(){

  }
}

class DxRow{
  constructor(id, code, desc, date, data){
    this.id = id;
    this.code = code;
    this.description = desc;
    this.date = date;
    this.data = data;
    this.selected = false;
    this.displayDelete=false;
  }
}

class Patient{
  constructor(patient, admin, imageRoot, fileRoot){
    let self = this;
    self.helper = helper;
    this.data = patient.Patient;
    console.log('Patient:', this.data);
    this.latestVisitDate = patient.Visit ? moment(patient.Visit.ExamDateTime).format('MM-DD-YYYY') : null;
    // if(patient.Patient.Photo === undefined ||
    //   patient.Patient.Photo === null ||
    //   patient.Patient.Photo.length == 0){
    //   this.imagepath = '/images/Photos/blank.png';
    // } else{
    //   this.imagepath = '/images/Photos/' + patient.Patient.Photo;
    // }
    this.imagepath = this.getImagePathWithPatientAndGoServerUrl(patient.Patient, admin.GoServerUrl, imageRoot, fileRoot);
  }

  PatientName(){
    return this.data.NameLast + ", " + this.data.NameFirst;
  }

  getImagePathWithPatientAndGoServerUrl(patient, goServerUrl, imageRoot, fileRoot){
    let self = this;

    if(patient.Photo === undefined ||
      patient.Photo === null ||
      patient.Photo.length == 0){
      return `${fileRoot}images/blank.png`;
    } else{
      return `${imageRoot}Photos/${patient.Photo}`;
    }

    // if(patient.Photo === undefined ||
    //   patient.Photo === null ||
    //   patient.Photo.length == 0){
    //   this.imagepath = '/images/Photos/blank.png';
    // } else{
    //   this.imagepath = '/images/Photos/' + patient.Photo;
    // }
  }

  Age(){
    var now = moment();
    var dob = moment(this.data.DOB);
    var d = moment.duration(now.diff(dob));
    return Math.floor(d.asYears());
  }
}

class ScheduleRow{
  constructor(id, name, time, patientId, isNewPatient, latestVisit, status, room, pod, type, data){
    this.id = id;
    this.name = name;
    this.time = time;
    this.status = status;
    this.room = room;
    this.pod = pod;
    this.type = type;
    this.patientId = patientId;
    this.isNewPatient = isNewPatient;
    this.latestVisitDate = latestVisit ? moment(latestVisit.ExamDateTime).format('MM-DD-YYYY') : null;
    this.latestVisitBodyPart = latestVisit ? latestVisit.VisitBodyPart : null;
    this.latestVisitDateMoment = latestVisit ? moment(latestVisit.ExamDateTime) : null;
    this.data = data;
    this.bgColor ='';
    this.txtColor='#495057';
    this.providerName = data ? this.getProviderName(data.Schedule) : undefined;
    this.reasonForVisit= data ?  data.Schedule.Reason_for_Visit : undefined;
    this.nearestSchedule = false;
  }

  getProviderName(data){
    let provider = data.OD_Provider_ID;
    if(provider == null){
      return undefined;
    }
    return provider.NameFirst.toUpperCase().substring(0, 1) + " " + provider.NameLast;
  }
}


class VisitInfo{
  constructor(date, visitType, bodypart){
    this.date = date;
    this.visitType = visitType;
    this.bodypart = bodypart;
    this.bodyside=null;
    this.providerId=null;
    this.patientId=null;
    this.boardId = null;
    this.visitCodeId = null;
    this.isPt = this.checkForPt(visitType);
    this.typeForSave = this.getVisitTypeForSave(visitType);
    this.visitCode = null;
    this.locked = false;
    this.bodyparts=[];
    this.examBodyPartsToLoad=[];
    this.hpiBodyPartsToLoad=[];
    this.planBodyPartsToLoad=[];
    this.selectedBodypart;
  }

  getDisplayedCode(){
    var txtCode = 'Code';

    if(this.visitCode == null){
      return txtCode;
    }else{
      return  this.visitCode.Visit_Code_System;
    }
  }

  getFirstAvailBodypartForExam(examType){
    let self = this;
    if(examType == 'exam'){
      let examBp = self.examBodyPartsToLoad.shift();
      if(examBp == undefined){
        return self.bodyparts[0];
      }else{
        return examBp;
      }
    }else if(examType == 'hpi'){
      let hpiBp = self.hpiBodyPartsToLoad.shift();
      if(hpiBp == undefined){
        return self.bodyparts[0];
      }else{
        return hpiBp;
      }
    }else{
      let planBp = self.planBodyPartsToLoad.shift();
      if(planBp == undefined){
        return self.bodyparts[0];
      }else{
        return planBp;
      }
    }
  }

  removeBodypartToLoad(type, bodypart){

    if(bodypart == null || bodypart == undefined)return;

    if(type.toLowerCase() == 'exam' ){
      for(let i = 0; i < this.examBodyPartsToLoad.length; i++){
        if(this.examBodyPartsToLoad[i].part.toLowerCase() == bodypart.toLowerCase()){
          this.examBodyPartsToLoad.splice(i, 1);
        }
      }
    }
    if(type.toLowerCase() == 'plan' ){
      for(let i = 0; i < this.planBodyPartsToLoad.length; i++){
        if(this.planBodyPartsToLoad[i].part.toLowerCase() == bodypart.toLowerCase()){
          this.planBodyPartsToLoad.splice(i, 1);
        }
      }
    }
    if(type.toLowerCase() == 'hpi' ){
      for(let i = 0; i < this.hpiBodyPartsToLoad.length; i++){
        if(this.hpiBodyPartsToLoad[i].part.toLowerCase() == bodypart.toLowerCase()){
          this.hpiBodyPartsToLoad.splice(i, 1);
        }
      }
    }
  }

  hasBodypartToLoad(type, bodypart){

    if(bodypart == null || bodypart == undefined)return false;

    if(type.toLowerCase() == 'exam' ){
      for(let i = 0; i < this.examBodyPartsToLoad.length; i++){
        if(this.examBodyPartsToLoad[i].part.toLowerCase() == bodypart.toLowerCase()){
          return true;
        }
      }
    }
    if(type.toLowerCase() == 'plan' ){
      for(let i = 0; i < this.planBodyPartsToLoad.length; i++){
        if(this.planBodyPartsToLoad[i].part.toLowerCase() == bodypart.toLowerCase()){
          return true;
        }
      }
    }
    if(type.toLowerCase() == 'hpi' ){
      for(let i = 0; i < this.hpiBodyPartsToLoad.length; i++){
        if(this.hpiBodyPartsToLoad[i].part.toLowerCase() == bodypart.toLowerCase()){
          return true;
        }
      }
    }
    return false;
  }

  addBodypartSide(BodypartSide){
    this.bodyparts.push(BodypartSide);
  }

  hasBodypart(bodypart){
    for(let i = 0; i < this.bodyparts.length; i++){
      if(this.bodyparts[i].part.toLowerCase() == bodypart.toLowerCase()){
        return true;
      }
    }
    return false;
  }

  checkForPt(visitType){
    if(visitType == undefined ||
    visitType == null)
      return  false;

    var lowerVisitType = visitType.toLowerCase();

    if(lowerVisitType.indexOf('pt') > -1 ||
      lowerVisitType.indexOf('ot') > -1){
      return true;
    }else{
      return false;
    }

    // return lowerVisitType.indexOf('therapy') > -1 ? true : false;
  }

  getVisitTypeForSave(visitType){
    if(visitType == null || visitType == undefined)
      return  null;

    var lowerVisitType = visitType.toLowerCase();
    if(lowerVisitType.indexOf('pt') > -1){
      return 'PT';
    }else if(lowerVisitType.indexOf('ot') > -1){
      return 'OT';
    }else if(lowerVisitType.indexOf('follow') > -1) {
      return  'FOLLOW';
    }else if(lowerVisitType.indexOf('telemed') > -1) {
      return 'TELEMED';
    }
    else{
      return 'FOLLOW';
    }
  }

}

class BlockData{
  constructor(description){
    this.widthCls='pack-w25';
    this.widthMult = 1;
    this.heightMult=1;
    this.heightCls='pack-h25';
    this.description = description;
    this.editing = false;
    this.blockType;
    this.element;
    this.id;
    this.x=0;
    this.data;
    this.showResizeButton=false;
    this.loadData = true;
    this.objectId=0;
    this.options;
    this.sortIndex=0;
    this.dataObject = null;
    this.dontSave=false;
    this.pinned=false;
    this.goFormId;
    this.goFormInstanceId;
    this.bodyparts=[];
  }

  setBlockType(blockType){
    this.blockType = blockType;
    var resizables = ['hpi', 'exam', 'plan'];
    for(var i = 0; i < resizables.length; i++){
      if(resizables[i]==blockType){
        this.showResizeButton = true;
        break;
      }
    }
  }

  toggleEditing(){
    this.editing = this.editing ? false : true;

    //manage sizing...
    if(this.editing && this.element){
      this.element.style.height = "";
    }
  }
}




class Board{
  constructor(description){
    this.blocks =[];
    this.description = description;
    this.editing = false;
    this.quickAdd = false;
    this.draggies=[];
    this.elementsToBeAdded=[];
    this.positions=[];
    this.visitInfo=null;
    this.id = 0;
    this.userId;
    this.providerId;
    this.patientId;
    this.date;
    this.hasChanged=false;
    this.documents=[];
    this.blockLayout = true;
    this.userBoardEdit=false;
    this.topToBottomBlocks=[];
    this.isDefault = false;
  }

  getPositions(altBlocks){
    var pos =[];

    let blks = altBlocks ? altBlocks : this.blocks;

    for(var i = 0; i < blks.length; i++){
      var aBlock = blks[i];
      var p= {
        attr: aBlock.id,
        x: aBlock.x
      }
      pos.push(p);
    }
    return pos;
  }

  addDocument(docBlock){
    //does the doc exist??
    //if so, replace... else... add
    var add = true;

    for(var i = 0; i < this.documents.length; i++){
      var aDoc = this.documents[i];
      if(aDoc.id== docBlock.id){
        this.documents.splice(i, 1, docBlock);
        add = false;
        break;
      }
    }

    if(add){
      this.documents.push(docBlock);
    }

    return add;
  }


  displayBlockLayout(){
    var pos = this.getPositions();
    if(pos.length > 0) {
      var pckry = Packery.data('#blockContainer');
      var els = document.getElementsByClassName('block');
      //pckry.addItems(els);
      //pckry.remove(els);
      pckry.initShiftLayout(pos, 'data-id');

      //IF NOT EDITING,update elements heights to px...
      for (var e = 0; e < els.length; e++) {
        var eHeight = window.getComputedStyle(els[e]).height;
        // els[e].style.height = !self.editing ? eHeight : "";
        els[e].style.height = eHeight;
      }
    }
  }




  toggleLayout(layout){

    this.blockLayout = layout == 'block' ? true : false;


    // let tBlocks = this.blocks;
    //
    // if(!this.blockLayout){
    //   tBlocks = this.sortBlocksForListLayout(this.blocks);
    // }

    let widthMultiplier = 4;
    let heightMultipler = 1;

    for(let b = 0; b < this.blocks.length; b++){
      let aBlock = this.blocks[b];

      if(!aBlock.hasOwnProperty('originalHeightMult')){
        aBlock.originalHeightMult = aBlock.heightMult;
      }
      if(!aBlock.hasOwnProperty('originalWidthMult')){
        aBlock.originalWidthMult = aBlock.widthMult;
      }
      if(!aBlock.hasOwnProperty('originalHeight')){
        aBlock.originalHeight = aBlock.element.style.height;
      }

      if(this.blockLayout){
        widthMultiplier = aBlock.originalWidthMult;
        heightMultipler = aBlock.originalHeightMult;
        aBlock.element.style.height = aBlock.originalHeight;
      }else{
        widthMultiplier = 4;
        heightMultipler = 2;
        aBlock.element.style.height='';
        //aBlock.element.style.width='';
      }

      aBlock.widthMult = widthMultiplier;
      aBlock.heightMult = heightMultipler;

      let width = widthMultiplier * 25;
      let height = heightMultipler * 25;

      $(aBlock.element).removeClass([aBlock.widthCls, 'pack-w25']);
      $(aBlock.element).removeClass([aBlock.heightCls, 'pack-h25']);

      aBlock.widthCls = 'pack-w' + width;
      aBlock.heightCls = 'pack-h' + height;

      $(aBlock.element).addClass(aBlock.widthCls);
      $(aBlock.element).addClass(aBlock.heightCls);
    }

    if(this.blockLayout){
      this.displayBlockLayout();
    }else{
      var pckry = Packery.data('#blockContainer');
      // let self = this;
      this.sortBlocksForListLayout(pckry, this.blocks);

      // setTimeout(this.layoutPackery.bind(this, pckry), 500);
    }
  }

  sortBlocksForListLayout(packery, blocks){

    let self = this;
    let sortedBlocks= _.orderBy(blocks, 'x', 'asc');
    let pos=[];
    for(let i = 0; i < sortedBlocks.length; i++){
      let p={
        "attr": sortedBlocks[i].id,
        "x": 0
      }
      pos.push(p);
    }

    //pos = self.getPositions(sortedBlocks);


    packery.initShiftLayout(pos, 'data-id');

  }




  layoutPackery(packery){
    packery.layout();
  }

  toggleEditing(callback){
    this.editing = this.editing ? false : true;
    for(var i = 0; i < this.blocks.length; i++){
      var aBlock = this.blocks[i];

      aBlock.toggleEditing();
      var aDraggy = this.draggies[i];
      aDraggy[this.editing ? 'enable' : 'disable']();
    }

    //IF NOT EDTING...
    if(!this.editing){

      this.updatePositions();

      //reset quickAdd flag...
      this.quickAdd = false;
    }

    if(callback != null &&
    callback != undefined){
      callback();
    }
  }

  updatePositions(){
    var pckry = Packery.data('#blockContainer');
    var positions = pckry.getShiftPositions('data-id' );
    this.positions= positions;

    //update each blocks X position by id
    for(var i = 0; i < this.positions.length; i++){
      var pos = this.positions[i];
      var blockToUpdate = _.find(this.blocks, function(b){return b.id == pos.attr});
      blockToUpdate.x = pos.x;
    }
  }

  getPositionWithId(id){
    //update each blocks X position by id
    for(var i = 0; i < this.positions.length; i++){
      var pos = this.positions[i];
      if(pos.attr == id){
        return  pos;
      }
    }
    return null;
  }

  addBlockCopyExistingSize(blockType, options){
    //try to copy existing block sizes...
    let tBlock = _.find(this.blocks, function(b){return b.blockType == blockType});
    let tOptions={
      editing: false,
      widthMult:2,
      heightMult:1,
      x:0,
      soapSort: false
    }

    if(options && options.hasOwnProperty('x')){
      tOptions.x = options.x;
    }
    if(options && options.hasOwnProperty('soapSort')){
      tOptions.soapSort = options.soapSort;
    }

    if(tBlock){
      tOptions.widthMult = tBlock.widthMult;
      tOptions.heightMult = tBlock.heightMult;
    }
    return this.addBlock(blockType, tOptions);
  }

  getBlockWithTypeAndObjectId(type, objectId){
    return _.find(this.blocks, function(b){return b.blockType == type && b.objectId == objectId});
  }

  getBlockWithType(type){
    return _.find(this.blocks, function(b){return b.blockType == type});
  }

  getSortIndex(blockType){
    //HPI     | DIAGNOSIS
    //EXAM    | ORDER
    //PLAN    | PROCEDURE
    //JOINT   | ??
    //        | ??
    //        | ??
    let sortArray=['hpi', 'exam', 'plan', 'jointInjection', 'diagnosis', 'order', 'procedure'];
    let sortINdex = _.findIndex(sortArray, function(i){return i == blockType});
    if(sortINdex == undefined){
      //which is bigger ??
      //sortArray OR blocks???
      if(this.blocks.length > sortArray.length){
        return this.blocks.length;
      }else{
        return sortArray.length;
      }
    }else{
      return sortINdex;
    }
  }

  addBlock(blockType, optional){
    var aBlock = new BlockData(blockType);

    let editing = true;
    let load = true;
    let wMult = 2;
    let hMult = 2;
    let x = 0;
    let soapSort = false;
    let objectId = 0;
    let leftToRightSort = false;
    let openPopup = false;
    let loadPreferenceCallback=null;
    let sortIndex = this.getSortIndex(blockType);
    let dataObject = null;

    if(optional != undefined){
      if(optional.hasOwnProperty('loadPreferenceCallback')){
        loadPreferenceCallback = optional.loadPreferenceCallback;
      }
      if(optional.hasOwnProperty('editing')){
        editing = optional.editing;
      }
      if(optional.hasOwnProperty('loadData')){
        load = optional.loadData;
      }
      if(optional.hasOwnProperty('dataObject')){
        dataObject = optional.dataObject;
        load = false;
      }
      if(optional.hasOwnProperty('widthMult')){
        wMult = optional.widthMult;
      }
      if(optional.hasOwnProperty('heightMult')){
        hMult = optional.heightMult;
      }
      if(optional.hasOwnProperty('x')){
        x = optional.x;
      }
      if(optional.hasOwnProperty('soapSort')){
        soapSort = optional.soapSort;
      }
      if(optional.hasOwnProperty('objectId')){
        objectId = optional.objectId;
      }
      if(optional.hasOwnProperty('leftToRightSort')){
        leftToRightSort = optional.leftToRightSort;
      }
      if(optional.hasOwnProperty('openPopup')){
        openPopup = optional.openPopup;
      }
      // if(optional.hasOwnProperty('sortIndex')){
      //   sortIndex = optional.sortIndex;
      // }
    }

    aBlock.sortIndex = sortIndex;
    aBlock.blockType = blockType;
    aBlock.editing = editing;
    aBlock.widthMult = wMult;
    aBlock.heightMult = hMult;
    var newId = this.getNewBlockId();
    aBlock.id = newId;
    aBlock.x = x;
    aBlock.loadData = load;
    aBlock.objectId = objectId;
    aBlock.openPopup = openPopup;
    aBlock.loadPreferenceCallback = loadPreferenceCallback;
    aBlock.dataObject = dataObject;
    this.hasChanged = true;

    if(soapSort==true) {
      let soapBlocks = this.addBlockWithSoapSort(this.blocks, aBlock);
      this.blocks = soapBlocks;
    }else if(leftToRightSort==true) {
      this.addBlockLeftToRight(this.blocks, aBlock);
    }else{
      this.blocks.push(aBlock);
    }

    return aBlock;
  }

  addBlockLeftToRight(blocks, newBlock){

    //how many blocks do we have?
    let blockCount = blocks.length; //+ 1;
    //odd or even??
    let oddEven = blockCount % 2;
    if(oddEven == 1){
      //odd block, shift right...
      newBlock.x = 0.5;
    }
    blocks.push(newBlock);
  }


  addBlockWithSoapSort(blocks, newBlock){

    let self = this;
    //HPI     | DIAGNOSIS
    //EXAM    | ORDER
    //PLAN    | PROCEDURE
    //JOINT   | ??
    //        | ??
    //        | ??

    let xPositions={
      hpi: 0,
      exam: 0,
      plan: 0,
      jointInjection: 0,
      diagnosis: 0.5,
      order: 0.5,
      procedure: 0.5
    }

    //find any block NOT in array...
    let sortArray=['hpi', 'exam', 'plan', 'jointInjection', 'diagnosis', 'order', 'procedure'];
    for(let b = 0; b < blocks.length; b++){
      //find block in array...
      let exists = _.find(sortArray, function(s){return s == blocks[b].blockType});
      if(!exists){
        //send block to end of list...
        blocks[b].sortIndex = 20;
      }
    }

    blocks.push(newBlock);

    blocks = _.sortBy(blocks, function(s){return s.sortIndex});
    //update block X position and ID for sorting...
    for(let i = 0; i < blocks.length; i++){
      let aBlock = blocks[i];
      let x = xPositions[aBlock.blockType];
      aBlock.x = x == undefined ? 0.5 : x;
      aBlock.id = i + 1;
    }

    return blocks;
  }

  findNextAvailableSortIndex(sortIndex, blocks){
    let finalIndex = sortIndex;
    for(let i = 0; i< blocks.length; i++){
      let nextBlock =  _.find(blocks, function(b){return b.sortIndex == finalIndex});
      if(nextBlock){
        finalIndex++;
      }else{
        return finalIndex;
      }
    }
  }

  deleteBlock(id){
    for(var i = 0; i < this.blocks.length; i++){
      if(this.blocks[i].id == id){
        this.blocks.splice(i, 1);
      }
    }
  }

  clearDraggables(){
    this.draggies=[];
    this.elementsToBeAdded=[];
  }

  addDraggable(draggy){
    this.draggies.push(draggy);
    this.elementsToBeAdded.push(draggy);
  }

  removeDraggable(id){
    for(var i = 0; i < this.draggies.length; i++){
      var drag = this.draggies[i];
      if(drag.element.dataset.id == id){
        this.draggies.splice(i, 1);
      }
    }
  }

  getBlockElementsToBeAdded(){
    var els = [];
    for(var i = 0; i < this.elementsToBeAdded.length; i++){
      var aDrag = this.elementsToBeAdded[i];
      if(aDrag.$element){
        els.push(aDrag.$element[0]);
      }
    }
    //clear out elements to be added...
    this.elementsToBeAdded=[];

    return els;
  }

  getBlockElements(){
    var els = [];
    for(var i = 0; i < this.draggies.length; i++){
      var aDrag = this.draggies[i];
      if(aDrag.$element){
        els.push(aDrag.$element[0]);
      }
    }
    return els;
  }

  getNewBlockId(){
    var res =  _.orderBy(this.blocks, ['id'], ['desc']);
    var lastId = res.length > 0 ? res[0].id : 0;
    lastId++;
    return lastId;
  }

  addPosition(id, x){
    var aPosition = {
      attr: id,
      x: x
    }
    this.positions.push(aPosition);
  }

  removePosition(id){
    for(var i = 0; i < this.positions.length; i++){
      var pos = this.positions[i];
      if(pos.attr == id){
        this.positions.splice(i, 1);
      }
    }
  }
}







@inject(helper,http,Globals)
export class Data {

  admin=null;

  bodyparts=[];

  constructor(helper, http, Globals) {
    this.helper = helper;
    this.http = http;
    this.globals = Globals;
    this.TARGETTYPE = {
      PATIENT: "patient",
      USER: "user",
      GROUP: "group"
    };
  }

  lateralityFromIcd10Code(code){
    let split = code.split(".");
    let finalDigits = split[1];
    let length = finalDigits.length;
    for(var i = length; i > -1; i--){
      //is value a number???
      let place = finalDigits[i-1];
      let aInt = parseInt(place);
      if(!isNaN(aInt)){
        if(aInt == 1){
          return 'RIGHT';
        }else if(aInt == 2){
          return 'LEFT';
        }else if(aInt == 3){
          return 'BILATERAL';
        }else{
          return "UNSPECIFIED";
        }
      }else{
        continue;
      }
    }
  }

  lateralitySidePartFromIcd10Code(data){

    var side =this.lateralityFromIcd10Code(data.Code);

    let split = data.Descriptor.split(" ");
    let part=null;
    let length = split.length;
    //look for side...
    var lastHalfSplit = split;
    for (var i = 0; i < lastHalfSplit.length; i++){

        var foundSide = false;

        if(lastHalfSplit[i].toUpperCase() == 'RIGHT'){
          //side =lastHalfSplit[i];
          foundSide = true;
        }else if(lastHalfSplit[i].toUpperCase() == 'LEFT'){
          //side =lastHalfSplit[i];
          foundSide = true;
        }else if(lastHalfSplit[i].toUpperCase() == 'BILATERAL'){
          //side =lastHalfSplit[i];
          foundSide = true;
        }else if(lastHalfSplit[i].toUpperCase() == 'UNSPECIFIED'){
          //side =lastHalfSplit[i];
          foundSide = true;
        }

        if(foundSide){
          //look for part...
          if(lastHalfSplit[i + 1].toUpperCase()== 'UPPER'){
            part = lastHalfSplit[i + 1] + " " + lastHalfSplit[i + 2];
          }else{
            part = lastHalfSplit[i + 1]
          }

          //clean any trailing characters...
          const regex = /[^a-zA-Z\d\s:]/g;//new RegExp('[^a-zA-Z\d\s:]','g'); // 
          part = part.replace(regex, "");
          break;
        }
      }
    

    return{
      "part": part,
      "side": side
    }
  }

  getParentChildItem(description, data, parent){
    return new ParentChildItem(description, data, parent);
  }

  getGenericTableRow(cells, data){
    return new GenericTableRow(cells, data);
  }

  getGenericPicklistItem(description, data){
    return new GenericPicklistItem(description, data);
  }

  getPreferenceObj(description, data, bodypart){
    return new PreferenceObj(description, data, bodypart);
  }

  getPreviousExamData(patientId, bodypart, date, callback){
    let self = this;
    let url = `examfollowup/previous/patients/${patientId}/bodypart/${bodypart}/date/${date}`;
    var data = new ExamData(null, null, null);
    self.http.get(self.helper.getApiUrl(url), function (json) {
      if(json != null){
        var exam ={
          PostOpID: 0,
          PatientID: patientId,
          UserID: json.UserID,
          ProviderID: json.ProviderID,
          ExamDateTime: date,
          DateSurgery: json.DateSurgery,
          CaseID: json.CaseID,
          PostOpDays: json.PostOpDays,
          Surgeron: json.Surgeron,
          PreOpDiag: json.PreOpDiag,
          PostOpDiag: json.PostOpDiag,
          Procedure: json.Procedure,
          Timeframe: json.Timeframe,
          TYPE: json.TYPE,
          IsComplete: json.IsComplete,
          DateCreated: json.DateCreated,
          DateModified: json.DateModified,
          BodyPart: json.BodyPart,
          ChartNoteExam: json.ChartNoteExam
        }
        data.exam = exam;

        var plan={
          PlanID: 0,
          PlanText: json.PlanText,
          PatientID: patientId,
          UserID: json.UserID,
          ProviderID: json.ProviderID,
          ExamDateTime: date,
          BodyPart: json.BodyPart
        }

        data.plan = plan;

        var hpi={
          HPIID: 0,
          BodyPart: json.BodyPart,
          BodySide: json.BodySide,
          VisitDate: date,
          HpiText: json.HpiText,
          PatientID: patientId,
          UserID: json.UserID,
          ProviderID: json.ProviderID,
        }

        data.hpi = hpi;
      }
      callback(data);
    });
  }

  getXrayUrl(studyId){
    var ip = this.helper.xraypath != undefined ? this.helper.xraypath : window.location.host;
    return `${ip}/viewer?StudyInstanceUIDs=${studyId}`;
  }


  getHpiLists(listNames, callback){
    var self = this;
    var url = 'hpilist';
    self.http.post(self.helper.getApiUrl(url), listNames, function(res){
          callback(res);
      },
      null,
      function(err){
        var e = 'oops';
      });
  }

  getLoinc(callback){
    var self = this;
    var url = 'loinc';
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  searchLoinc(term, callback){
    var self = this;
    var url = 'loinc/search?term='+ term;
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getLabOrders(patientId, date, callback){
    var self = this;
    var date = self.helper.getDateWithFormat(date, "MM-DD-YYYY");
    var url = `laborder/query`;

    let queryObject ={
      PatientId: patientId,
      //Types: ['quick'],
      Date: date
    }

    self.http.post(self.helper.getApiUrl(url), JSON.stringify(queryObject), function(res){
        if(callback){
          callback(res);
        }
      },
      { contentType: "application/json" },
      function(err){
        var e = 'oops';
      });
  }

  saveLabOrders(orders, callback){
    var self = this;
    var url = 'laborders';

    let saveObject ={
      Orders: orders
    }

    self.http.post(self.helper.getApiUrl(url), saveObject, function(res){
        if(callback){
          callback(res);
        }
      },
      null,
      function(err){
        var e = 'oops';
      });
  }

  updateLabOrders(orders, callback){

    let saveObject ={
      Orders: orders
    }

    var self = this;
    var url = 'laborders';
    self.http.put(self.helper.getApiUrl(url), saveObject, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
      callback(false)
    });
  }

  searchDrugs(search, callback){
    var self = this;
    var url = `drugs?search=${search}`;
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getPatientAllergiesMeds(patientId, callback){
    var self = this;
    var url = `patientportal/allergiesmeds?patientId=${patientId}`
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  savePatientMeds(meds, callback){
    var self = this;
    var url = 'rxs/list2';
    self.http.post(self.helper.getApiUrl(url), meds, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
      callback(false)
    });
  }

  updatePatientMeds(meds, callback){
    var self = this;
    var url = 'rxs/list2';
    self.http.put(self.helper.getApiUrl(url),meds, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
    });
  }

  savePatientAllergies(allergies, callback){
    var self = this;
    var url = 'patientallergies/list2';
    self.http.post(self.helper.getApiUrl(url), allergies, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
      callback(false)
    });
  }

  updatePatientAllergies(allergies, callback){
    var self = this;
    var url = 'patientallergies/list2';
    self.http.put(self.helper.getApiUrl(url),allergies, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
    });
  }

  updateVitalSigns(vital, callback){
    var self = this;
    var url = 'vitalsigns';
    self.http.post(self.helper.getApiUrl(url), vital, function(res){
        callback(res);
      },
      null,
      function(err){
        var e = 'oops';
      });
  }

  getNewPatientHistory(callback){
    var self = this;
    var url = `patienthistory`;
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  createPatientHistory(history, callback){
    var self = this;
    var url = 'patienthistory';
    self.http.post(self.helper.getApiUrl(url), history, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      //alert(error.responseText);
      callback(false)
    });
  }

  updatePatientHistory(history, callback){
    var self = this;
    var url = 'patienthistory';
    self.http.put(self.helper.getApiUrl(url),history, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      //alert(error.responseText);
      callback(error);
    });
  }


  getReportingColumnInfoWithCategory(category, callback){
    var self = this;
    var url = `reportingcolumninfo/getbycategory?category=${category}`
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getBodypartSide(part, side){
    return new BodypartSide(part, side);
  }

  getBodypartList(){
    var self = this;
    self.getList("Bodypart", function(res){
      var bps = _.map(res, "Description1");
      self.bodyparts = bps;
    });
  }

  getPatientHistory(patientId, callback){
    var self = this;
    //var aDate =  self.helper.getDateWithFormat(date, 'MM/DD/YYYY');//{ moment(date).format('MM/DD/YYYY');
    var url = `patienthistory/latest?patientId=${patientId}`
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getPatientHistoryWithPatientIdAndDate(patientId, date, callback){
    var self = this;
    var aDate =  self.helper.getDateWithFormat(date, 'MM-DD-YYYY');//{ moment(date).format('MM/DD/YYYY');
    var url = `patienthistory/latestWithDate?patientId=${patientId}&date=${aDate}`;
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getList(description, callback){
    //ListType = description
    var self = this;
    var url = 'listcombo?listType='+ description;
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getModifiers(callback){
    var self = this;
    var url = 'listcombo/modifiers'
    var mods=[];
    self.http.get(self.helper.getApiUrl(url), function(res){
      for(var i = 0; i < res.length; i++){
        mods.push(res[i].Description1);
      }
      callback(mods);
    });
    //return ['22','24','25','26','50','51','52','53','55','56','57','58','59','76','77','78','79','81','93','94','95','LT','RT','AS','CH','CI','CJ','CK','CL','CM','CR','CN','CO','CQ','FA','FY','F1','F2','F3','F4','F5','F6','F7','F8','F9','GA','GO','GP','GY','GZ','JW','KX','NU','Q7','Q8','Q9','QW','TA','TC','T2','T3','T4','T5','T6','T7','T8','T9','XE','XS','XP','XU'];
  }

  getLists(descriptionArray, callback){
    //ListType = description
    var self = this;
    var url = 'listcombos';

    let lc={
      listTypes: descriptionArray
    }

    self.http.post(self.helper.getApiUrl(url), lc, function(res){
        callback(res);
      },
      null,
      function(err){
        var e = 'oops';
      });
  }

  getListWithProviderId(description, providerId, callback){
    //ListType = description
    var self = this;
    var url = 'listcombo?listType='+ description+'&providerId='+providerId;
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getListWithListTypeDescription2AndProviderId(listType, desc2, providerId, callback){
    var self = this;
    var url = `listcombos?listType=${listType}&description2=${desc2}&providerId=${providerId}`;
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getEmployers(callback){
    var self = this;
    var url = 'employers';
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getAdmin(callback){
    var self = this;
    var url = 'admin';
    self.http.get(self.helper.getApiUrl(url), function(res){
      self.admin = res;
      callback(res);
    });
  }

  getMessageConversationsWithUserId(userId, callback){
    let self = this;
    let url = 'messages/conversations?userId='+userId;
    self.http.get(self.helper.getApiUrl(url), function (res) {
        //order by most recent first...
        let sorted = _.orderBy(res, 'DateCreated','desc');
        callback(sorted);
    });
  }

  getConversationTargetsWithConversationIds(idArray, callback){
    var self = this;
    var url = 'messages/conversationtargets';
    self.http.post(self.helper.getApiUrl(url), JSON.stringify(idArray), function(res){
        callback(res);
      },
      { contentType: "application/json" },
      function(err){
        var e = 'oops';
      });
  }

  updateConversationStatusWithIdsAndStatus(conversationIds, status, callback){
    var self = this;
    var url = 'messages/conversations/status';

    var conversations={
      'Ids': conversationIds,
      'Status': status
    }

    self.http.put(self.helper.getApiUrl(url), conversations, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
    });
  }


  getConversationTargetsWithConversationResult(result, callback, optionalIndexToReturn){
    var self = this;
    var targetUrl = 'messages/targets?conversationId='+result.ConversationID;
    self.http.get(self.helper.getApiUrl(targetUrl), function(targs){
      callback(targs, optionalIndexToReturn, result);
    });
  }


  getNewMessageTarget(id, first, last, targetType, targetId, photo){
    return new MessageTarget(id, first, last, targetType, targetId, photo);
  }

  getXrayWithId(id, callback){
    var self = this;
    var url = 'xrayresult/'+id;
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getXrayResultNew(callback){
    var self = this;
    var url = 'xrayresult';
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  saveXrayResult(xray, callback){
    let self = this;
    let url = `xrayresult`;
    self.http.post(self.helper.getApiUrl(url), xray, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
    });
  }

  deleteXrayResult(id, callback){
    let self = this;
    let url = `xrayresult?id=${id}`;
    self.http.del(self.helper.getApiUrl(url), (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
    });
  }

  updateXrayResult(xray, callback){
    let self = this;
    let url = `xrayresult`;
    self.http.put(self.helper.getApiUrl(url), xray, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
    });
  }

  getAllUsers(callback){
    var self = this;
    var url = 'login/users';
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  getUser(id, callback){
    var self = this;
    var url = 'users/'+id;
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  getAllGroups(callback){
    var self = this;
    var url = 'groups';
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  // getTaskPopDataObject(visitInfo, objectId, taskTypeId, home, callback, OD_Task_ToUpdate){
  //   var taskObj={
  //     "visitInfo": visitInfo,
  //     "objectId": objectId,
  //     "taskTypeId": taskTypeId,
  //     'home': home,
  //     'taskToUpdate': OD_Task_ToUpdate
  //   }
  // }

  getTaskObject(taskTypeId, objectId){

    var aTask ={
      "Date": "",
      "Patient Name": null,
      "Subject": null,
      "Type": null,
      "Description": null,
      "Priority": null,
      "Status": null,
      "UserID": null,
      "TaskID": 0,
      "formID": objectId,
      "CreatedByID": null,
      "AssignedToID": null,
      "PatientID": null,
      "GroupId": null,
      "DueDate": null,
      "TypeID": taskTypeId,
      "ProviderID": null,
      "DateCreated": null,
      "DateModified": null,
      "DisplayOnVisitConsole": 0
    }

    return aTask;
  }

  saveTask(od_task, callback){
    var self = this;
    var url = 'task';

    self.http.post(self.helper.getApiUrl(url), od_task, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
      callback(false)
    });
  }

  saveTaskNew(taskTypeId, objectId, patientName, taskTypeStr, taskDescription, priority, userId, createdById, patientId, assignedToId, groupId, dueDate, providerId, objectDate, callback){

    var taskToSave = this.getTaskObject(taskTypeId, objectId);

    taskToSave['Patient_Name']=patientName;
    taskToSave.Type = taskTypeStr;
    taskToSave.Description = taskDescription;
    taskToSave.Priority = priority;
    taskToSave.Status = 'ASSIGNED';
    taskToSave.UserID = userId;
    taskToSave.CreatedByID = createdById;
    taskToSave.PatientID = patientId;
    taskToSave.AssignedToID = assignedToId;
    taskToSave.GroupId = groupId;
    // if(self.selectedTarget.isGroup){
    //   taskToSave.GroupId = self.selectedTarget.id;
    // }else{
    //   taskToSave.AssignedToID = self.selectedTarget.id;
    // }
    taskToSave.DueDate =dueDate;
    taskToSave.ProviderID = providerId;
    taskToSave.objectDate = objectDate;

    this.saveTask(taskToSave, function(res){
      if(callback){
        callback(res);
      }
    })
  }

  updateTask(od_task, callback){
    var self = this;
    var url = 'task';

    self.http.put(self.helper.getApiUrl(url), od_task, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
      callback(false)
    });
  }

  getAllowableTaskTypes(callback){

    //TYpe = Document
    //Description = XRAY and Type = Order
    //Type = Board

    var tts = [];

    var self = this;
    var url = 'tasktype';
    self.http.get(self.helper.getApiUrl(url), function(json){

      var docs = _.filter(json, function(t){return t.TypeAsString.toLowerCase() == 'document'});
      for(var d = 0; d < docs.length; d++){
        tts.push(docs[d]);
      }

      var xray = _.find(json, function(t){return t.TypeAsString.toLowerCase() == 'order' && t.Description.toLowerCase() == 'xray'});
      var board = _.find(json, function(t){return t.TypeAsString.toLowerCase() == 'board'});

      var examHpiPlan = _.filter(json, function(t){return t.TypeAsString.toLowerCase() == 'exam' || t.TypeAsString.toLowerCase() == 'plan' || t.TypeAsString.toLowerCase() == 'hpi'});
      for(var e = 0; e < examHpiPlan.length; e++){
        tts.push(examHpiPlan[e]);
      }

      var phone = _.find(json, function(t){return t.TypeAsString.toLowerCase() == 'phone' && t.Description.toLowerCase() == 'phone call'});


      tts.push(xray);
      tts.push(board);
      tts.push(phone);

      callback(tts, json);
    });
  }

  updateSelectedCode(patientPx, callback){
    var self = this;
    var url = 'patientprocedures';
    self.http.put(self.helper.getApiUrl(url), patientPx, (returnData) => {
      callback(returnData);
    }, (error) => {
      alert(error.responseText);
    });
  }

  saveSelectedCode(patientPx, callback) {
    var self = this;
    var url = 'patientprocedures';
    self.http.post(self.helper.getApiUrl(url), patientPx, (returnData) => {
      callback(returnData);
    }, null, (error) => {
      alert(error.responseText);
    });
  }

  getJointInjectionPreferencesWithProviderIdAndBodypart(providerId, bodypart, callback){
    var self = this;
    var url = `injection/pref?providerid=${providerId}&bodypart=${bodypart}`;
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  getJointInjectionPreferencesWithProviderId(providerId, callback){
    var self = this;
    var url = `injection/pref?providerid=${providerId}`;
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  getProceduresWithType(type, callback){
    var self = this;
    var url = `procedures?type=${type}`;
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  getAllProcedures(callback){
    var self = this;
    var url = `procedures`;
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  saveProcedure(Px, patientId, providerId, date, callback) {
    let self = this;

    var hasData = Px.data ? true : false
    var dataJcodeUnits = hasData ? Px.data.JCodeUnits : 0

    var patientCptId = 0;
    if(hasData && Px.data.hasOwnProperty('PatientCPTID')){
      patientCptId = Px.data.PatientCPTID;
    }

    let patientPx = {
      CptCode: Px.code,
      CodeDescr: Px.description,
      PatientID: patientId,
      ProviderID: providerId,
      ExamDateTime: date,// moment(date).format(),
      UserID: self.helper._user.UserID,
      Type: hasData ? Px.data.Type : null,
      BodyPart: Px.bodypart,
      BodySide: Px.bodyside,
      Modifier: Px.modifier,
      MfgCode: hasData ? Px.data.Cpt_Code : null,
      PatientCPTID : patientCptId,
      ProcedureID: hasData ? Px.data.ProcedureID : 0,
      InjectSite: Px.injectSite,
      NotePx: Px.note,
      JCodeUnits: Px.hasOwnProperty('jcodeunits') ? Px.jcodeunits : dataJcodeUnits
    };

    if(patientPx.PatientCPTID == 0){
      self.saveSelectedCode(patientPx, (returnData) => {
        //self.needsSavingPx = false;

        var px ={
          "id": returnData.PatientCPTID,
          "selected": false,
          "code": returnData.CptCode,
          "description": returnData.CodeDescr,
          "modifier": returnData.Modifier,
          "data": returnData
        };
        //self.selectedCode = px;

        self.helper.createNotySuccess(px.description + ' Saved Successfully!');
        if(callback) callback(returnData);
      });
    }
    else{
      self.updateSelectedCode(patientPx, (returnData) => {
       // self.needsSavingPx = false;

        var px ={
          "id": returnData.PatientCPTID,
          "selected": false,
          "code": returnData.CptCode,
          "description": returnData.CodeDescr,
          "modifier": returnData.Modifier,
          "data": returnData
        };
        //self.selectedCode = px;

        self.helper.createNotySuccess(px.description + ' Updated Successfully!');
        if(callback) callback(returnData);
      });
    }
   // console.log('SAVE PROCEDURE');
  }

  createVisitCode(visitCode, callback){
    var self = this;
    var url = 'visitcode';
    self.http.post(self.helper.getApiUrl(url), JSON.stringify(visitCode), function (schedule) {
      callback(schedule)
    }, { contentType: "application/json" });
  }

  updateVisitCode(visitCode, callback){
    const self = this;
    const url = 'visitcode'
    self.http.put(self.helper.getApiUrl(url), visitCode, (returnData) => {
      if(callback != undefined)
        callback(returnData);
    }, (error) => {
      alert(error.responseText);
    });
  }

  getVisitInfo(date, patientId, providerId, visitType, bodyparts, boardId, visitCodeId, locked){

    let part = bodyparts != undefined ? bodyparts[0].part : null;
    let side =  bodyparts != undefined ? bodyparts[0].side : null;

    var vi = new VisitInfo(date,visitType, this.formatBodypart(part));
    vi.patientId = patientId;
    vi.providerId = providerId;
    vi.bodyside = side;
    vi.boardId = boardId;
    vi.visitCodeId = visitCodeId;
    vi.locked = locked;
    vi.bodyparts = bodyparts;
    if(bodyparts != undefined){
      vi.examBodyPartsToLoad = JSON.parse(JSON.stringify(bodyparts));
      vi.planBodyPartsToLoad = JSON.parse(JSON.stringify(bodyparts));
      vi.hpiBodyPartsToLoad = JSON.parse(JSON.stringify(bodyparts));
    }

    return vi;
  }

  getNewPx(id, code, desc, date, data){
    return new Px(id, code, desc, date, data);
  }

  getVisitCodeObject(callback){
    var self = this;
    var url = 'visitcode';
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  getVisitCode(id, callback){
    var self = this;
    var url = 'visitcode/'+ id;
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  getVisitCodeWithPatientIdProviderIdAndDate(patientId, providerId, date, callback){
    var self = this;
    var url = `visitcode/patients/${patientId}/providers/${providerId}/date/${date}`;
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  getNewExamData(){
    return new ExamData();
  }

  getNewDxRow(id, code, desc, date, data){
    return new DxRow(id, code, desc, date, data);
  }

  getWithUrl(url, callback){
    var self = this;
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);
    });
  }

  getWithFaxUrl(url, callback){
    var self = this;
    self.http.getNoAuth(self.helper.getFilewatcherUrl(url), function(json){
      callback(json);
    });
  }

  postWithFaxUrlAndData(url, data, callback){
    var self = this;
    self.http.postNoAuth(self.helper.getFilewatcherUrl(url), data, function(res){
        if(callback){
          callback(res);
        }
      },
      { contentType: "application/json" },
      function(err){
        if(callback){
          callback(err.responseText, err);
        }
      });
  }

  postWithUrlAndData(url, data, callback){
    var self = this;
    self.http.post(self.helper.getApiUrl(url), data, function(res){
        if(callback){
          callback(res);
        }
      },
      { contentType: "application/json" },
      function(err){
        if(callback){
          callback(err.responseText, err);
        }
      });
  }

  putWithUrlAndData(url, data, callback){
    var self = this;
    self.http.put(self.helper.getApiUrl(url), data, (success) => {
      if(callback){
        callback(success);
      }
    }, (error) => {
      if(callback){
        callback(error.responseText);
      }
    });
  }

  deleteWithUrl(url, callback){
    var self = this;

    self.http.del(self.helper.getApiUrl(url), function(success){
      if(callback){
        callback(success);
      }
    }, function (err) {
      if(callback){
        callback(err);
      }
    });
  }

  deleteWithFaxUrl(url, callback){
    var self = this;

    self.http.delNoAuth(self.helper.getFilewatcherUrl(url), function(success){
      if(callback){
        callback(success);
      }
    }, function (err) {
      if(callback){
        callback(err);
      }
    });
  }

  getProviders(includeDisabledProviders, callback){
    var self = this;
    var url = 'providers';
    self.http.get(self.helper.getApiUrl(url), function(json){
      if(json != null){
        if(!includeDisabledProviders){
          json = _.filter(json, function(r){return r.OD_Users.AccountEnabled && r.OD_Users.AccountEnabled == 1});
        }
        callback(json);
      }
    });
  }

  getProvider(id, callback){
    var self = this;
    var url = `providers/${id}`;
    self.http.get(self.helper.getApiUrl(url), function(json){
      callback(json);  
    });
  }

  createSchedule(OD_Schedule, callback){
    let self = this;
    self.postWithUrlAndData('schedule', JSON.stringify(OD_Schedule), function(res){
      callback(res);
    });
  }

  getScheduledProviders(date, callback){
    var self = this;
    var today =  date == null ? moment().format('MM/DD/YYYY') : moment(date).format('MM/DD/YYYY');
    var url = 'providers?date='+ today;
    self.http.get(self.helper.getApiUrl(url), function(json){
      if(json != null){
        callback(json);
      }
    });
  }

  getScheduleWithProviderAndDate(providerId, date, callback){
    let self = this;
    let url = `schedule?providerId=${providerId}&date=${date}`;
    self.getWithUrl(url, function(res){
        callback(res);
    });
  }

  getScheduleWithDate(date, callback){
    let self = this;
    let url = `schedule/withisnew?date=${date}`;
    self.getWithUrl(url, function(res){
        callback(res);
    });
  }

  getScheduleWithDateAndPatientId(date, patientId, callback){
    let self = this;
    // let url = `schedule/withisnew?date=${date}&patientId=${patientId}`;
    let url = `schedule/patients/${patientId}/date/${date}`;
    self.getWithUrl(url, function(res){
        callback(res);
    });
  }

  getSchedule(providerId, scheduleDate, visitTypeFilter, getAll, locationId, callback) {
    let self = this;
    let date = moment(scheduleDate).format("MM-DD-YYYY");
    let schedule = [];
    let types = [];
    if(visitTypeFilter && visitTypeFilter.length > 0){
      types.push(visitTypeFilter);
    }
    let qObject = {
      'ProviderId': providerId,
      'Date': date,
      'Types': types,
      'GetAll':getAll,
      'LocationID': locationId
    };

    let url = `schedule/withisnew`;
    self.http.post(self.helper.getApiUrl(url), JSON.stringify(qObject), function (json) {

      let final=json;

      for (let i = 0; i < final.length; i++) {
        let r = final[i];
        let row = new ScheduleRow(r.Schedule.ScheduleID, r.Schedule.Patient_Name,
          self.helper.utcDateToTimeString(r.Schedule.Time), r.Schedule.PatientID, r.IsNewPatient, r.LatestVisit, r.Schedule.Status,
          r.Schedule.Room , r.Schedule.Pod, r.Schedule.Type, r);
        //row color...
        if(r.Schedule.Status == 'Waiting'){
          row.bgColor = 'table-primary';
          row.txtColor = '#004085';
        }else if(r.Schedule.Status == 'Ready'){
          row.bgColor = 'table-success';
          row.txtColor = '#155724';
        }else if(r.Schedule.Status == 'Next'){
          row.bgColor = 'table-danger';
          row.txtColor = '#721c24';
        }
        schedule.push(row);
      }

      callback(schedule)
    }, { contentType: "application/json" });
  }


  getPatientVisits(patientId, callback){
    var self = this;
    var url = 'patients/'+patientId+'/visits?filter=none';
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getPatientVisitsAndDocuments(patientId, callback){
    var self = this;
    var url = 'patients/'+patientId+'/visitsanddocuments';
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getVisitTypes(){
    return ["New Patient", "Established Patient", "PT Visit", "OT Visit", "Work Comp Visit", "Telemed", "Other Visit"];
  }

  getPatientVisitData(patientId, date, callback){
    var self = this;
    var url = 'patients/'+ patientId +'/visit/'+ date + "/html?filter=none";
    self.http.get(self.helper.getApiUrl(url), function(res){
      callback(res);
    });
  }

  getPatientEmpty(admin){
    let patient ={'data':{}};
    //patient.imagepath = this.helper.imageRoot + '/images/Photos/blank.png';
    // patient.imagepath = `${admin.GoServerUrl}/go/${admin.TenantId}/images/Photos/blank.png`;
    patient.imagepath = `${helper.goFileurl}images/blank.png`;
    patient.data.PatientID="";
    return patient;
  }

  getPatient(patientId, callback) {
    var self = this;
    //var url = "patients/" + patientId;
    var url = `patients/withvisit?patientId=${patientId}`;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      let patient = new Patient(json, self.admin, self.helper.imageTenantRoot, self.helper.goFileUrl);
      console.log('PATIIENT:', patient);
      callback(patient);
    });
  }

  updatePatient(patient, callback){
    let self = this;
    var url = 'patients';
    let p={
      Patient: patient
    }
    self.http.put(self.helper.getApiUrl(url), p, (success) => {
      if(callback){
        callback(success);
      }
    }, (error) => {
      alert(error.responseText);
    });
  }

  createPatient(patient, callback){
    var self = this;
    var url = 'patients';
    let p={
      Patient: patient
    }
    self.http.post(self.helper.getApiUrl(url), p, function(res){
      if(callback){
        callback(res);
      }
      },
      null,
      function(err){
        var e = 'oops';
      });
  }


  getPtDaysheetPref(providerId, bodypart, callback){
    var self = this;
    var url = `ptdaysheet/prefs?providerId=${providerId}&bodypart=`;
    if(bodypart){
      url += `${bodypart}`
    }
    // var url = "ptdaysheet/prefs?providerId="+ providerId;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      // var list=[];
      // for(var i = 0; i < json.length; i++){
      //   var m = json[i];
      //   list.push(m);
      // }
      callback(json);
    });
  }

  saveFollowUpPref(preference, callback){
    const self = this;
    const url = 'examfollowup/preferences';
    const stringifiedData = JSON.stringify(preference);
    self.http.post(self.helper.getApiUrl(url), stringifiedData, (returnData) => {
      callback(returnData);
    }, {contentType: 'application/json'});
  }

  updateFollowUpPref(preference, callback){
    const self = this;
    const url = 'examfollowup/preferences';
    self.http.put(self.helper.getApiUrl(url), preference, (returnData) => {
      //examData.exam = returnData;
      if(callback) callback();
    }, (error) => {
      if(callback) callback(error.responseText);
      //alert(error.responseText);
    });
  }

  getFollowUpPref(providerId, part, type, callback){
    var self = this;
    var url = "examfollowup/preferences?providerId="+ providerId + "&part=" + part + "&type=" + type;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      let list=_.orderBy(json, 'ProviderID', 'desc');
      list = _.uniqBy(list,'PostOpProcedure');
      callback(list);
    });
  }

  getFollowUpPrefsAndMaps(providerId, part, type, callback){
    var self = this;
    var url = "examfollowup/preferences/maps?providerId="+ providerId + "&part=" + part + "&type=" + type;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      let prefs=_.orderBy(json.Prefs, 'ProviderID', 'desc');
      prefs = _.uniqBy(prefs,'PostOpProcedure');
      let final={
        'prefs': prefs,
        'maps': json.Maps,
        'suppressed': json.Suppressed
      }
      callback(final);
    });
  }



  getImpressionMaps(providerId, bodypart, type, callback){
    var self = this;
    let isFollowUp = type.toLowerCase() == "follow" ? true : false;
    var url = `impressionmap?providerId=${providerId}&bodypart=${bodypart}&followup=${isFollowUp}&maptype=${type}`;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      callback(json);
    });
  }

  getFollowUpPrefPopulated(prefId, patientId, providerId, date, callback){
    var self = this;
    var url = "examfollowup/preferences/populate?preferenceId=" + prefId + "&providerId="+ providerId + "&patientId=" + patientId + "&examDateTime=" + date;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      callback(json);
    });
  }

  getNewScheduleRow(){
    return new ScheduleRow();
  }

  getNewBlock(){
    return new BlockData();
  }

  getNewBoard(){
   return new Board("New Board");
  }

  getNewMedRow(id, description, lastRefill, status){
    return new MedRow(id, description, lastRefill, status);
  }

  getNewAllergyRow(id, description, date, reaction){
    return new AllergyRow(id, description, date, reaction);
  }

  getNewExam(callback){
    var self = this;
    var url = "examfollowup";
    self.http.get(self.helper.getApiUrl(url), function(json){
      if(json != null){
        callback(json);
      }
    });
  }

  getNewHpi(callback){
    var self = this;
    var url = "hpi";
    self.http.get(self.helper.getApiUrl(url), function(json){
      if(json != null){
        callback(json);
      }
    });
  }

  getNewPlan(callback){
    var self = this;
    var url = "plan";
    self.http.get(self.helper.getApiUrl(url), function(json){
      if(json != null){
        callback(json);
      }
    });
  }

  getNewTaskPopupObject(patientId, providerId, date, objectId, taskTypeId){
    return new TaskPopupObject(patientId, providerId, date, objectId, taskTypeId);
  }

  createDocumentUrl(docId){
    var self = this;
    let userId = self.helper._user.UserID;
    var url = self.helper._webDocsServer + `#document?docid=${docId}&locked=False&print=False&create=False&docType=&date=&patientId=&providerId=0&isAddendum=False&userId=&loggedInUserId=${userId}&filePath=&webDocId=&bodyparts=`;
    url = url + '&jwt='+self.helper.jwt();
    return url;
  }

  createPdfUrl(patientId, filepath){
    var self = this;

    // var splitArray = documentPath.split("\\");

    // var length = splitArray.length;
    // var patientId=null;
    // var filepath = null;
    // if(length > 0){
    //   //get last two items in array...
    //   patientId = splitArray[length - 2];
    //   filepath = splitArray[length - 1]
    // }
    // if(patientId == null || filepath == null){
    //   return;
    // }

    if(self.globals.selfHosted){
      var patientIdIndex = filepath.lastIndexOf(patientId);
      var patDocName = filepath.substring(patientIdIndex);
      return self.helper._server + `/documents/patientDocuments/${patDocName}`;
      // return self.helper._server + `/documents/patientDocuments/${patientId}/${documentName}`;
    }else{
      return filepath;
    }
  }

  createPttUrl(patientId, providerId, userId, bodypart, date){
    var self = this;
    var url = self.helper._server + `/phoenixnext/#ptdaysheet/datagrid?patientid=${patientId}&bodypart=${bodypart}&providerid=${providerId}&userid=${userId}&visitdate=${date}&type=PT`;
    url = url + '&jwt='+self.helper.jwt();

    //var url = `ptdaysheet/datagrid?patientid=${patientId}&bodypart=${bodypart}&providerid=${providerId}&userid=${userId}&visitdate=${date}&type=PT`;

    return url;
  }

  buildAdditionalSqlFromBodyparts(bodyparts){
    //build additionalSql object for bodyparts sweet!
    if(!bodyparts || bodyparts.length == 0){
      return null;
    }

    var adtlSqlList = [];
    var bpListNOTXray = [];
    var bpListXray = [];
    var whereCount = 0;
    for(var i = 0; i < bodyparts.length; i++)
    {
      if(bodyparts[i] != null && bodyparts[i].length > 0 && bodyparts[i] != ' '){
        var current = bodyparts[i];
        bpListNOTXray.push("BodyPart = '" + current + "'");
        bpListXray.push("Body_Part = '" + current + "'");
        var mappedBodyPart = null;
        switch (current) {
          case 'Thigh': //'Femur':
            mappedBodyPart = 'Femur'; //'Thigh';
            break;
          case 'Upperarm': //'Humerus':
            mappedBodyPart = 'Humerus'; //'Upperarm';
            break;
          case 'Forearm': //'Rad Ulna':
            mappedBodyPart = 'Rad Ulna'; //'Forearm';
            break;
          case 'Lowerleg': //'Tib Fib':
            mappedBodyPart = 'Tib Fib'; //'Lowerleg';
            break;
          case 'Thoracic': //'Rib':
            mappedBodyPart = 'Rib'; //'Thoracic';
            break;
        }
        if(mappedBodyPart != null){
          bpListNOTXray.push("BodyPart = '" + mappedBodyPart + "'");
          bpListXray.push("Body_Part = '" + mappedBodyPart + "'");
        }
        whereCount++;
      }
    }

    if(whereCount == 0){
      return null;
    }

    var hpiSql = {
      TableName: "OD_HPI",
      WhereConditions: bpListNOTXray
    };
    adtlSqlList.push(hpiSql);

    var poArthSql = {
      TableName: "OD_POSTOPARTH",
      WhereConditions: bpListNOTXray
    };
    adtlSqlList.push(poArthSql);

    var patPx = {
      TableName: "OD_PATIENT_PX",
      WhereConditions: bpListNOTXray
    };
    adtlSqlList.push(patPx);

    var patDx = {
      TableName: "OD_PATIENT_DX",
      WhereConditions: bpListNOTXray
    };
    adtlSqlList.push(patDx);

    var planSql = {
      TableName: "OD_PLAN_TX",
      WhereConditions: bpListNOTXray
    };
    adtlSqlList.push(planSql);

    var xraySql = {
      TableName: "OD_XRAY_RESULTS",
      WhereConditions: bpListXray
    };
    adtlSqlList.push(xraySql);

    return adtlSqlList;
  }

  createDocumentName(webdoc, patientId, providerId, userId, date, isAddendum, bodypartsides, callback){
    var self = this;
    var url = 'documents/createname';
    let doc = self.getNewDocument(patientId, providerId, userId, date, webdoc);

    //add bodyparts...
    if(bodypartsides != null){
      for(var i = 0; i < bodypartsides.bodyparts.length; i++){
        doc.DocumentName += "-" + bodypartsides.bodyparts[i].part;
      }
    }

    let obj={
      "isAddendum":isAddendum,
      "OD_Documents": doc
    }
    self.http.post(self.helper.getApiUrl(url), JSON.stringify(obj), function(res){
        if(res == undefined || res == null)return;
        if(callback){
          callback(res);
        }
      },
      { contentType: "application/json" },
      function(err){
        var e = 'oops';
      });
  }

  generateDocument(webdoc, patientId, providerId, userId, date, additionalSql, callback){
    var self = this;
    var url = 'documents';
    var addendum = false;

    var documentCreate={
      document: self.getNewDocument(patientId, providerId, userId, date, webdoc),
      isAddendum:addendum,
      absolutePath:"",
      additionalSql:additionalSql
    }

    self.http.post(self.helper.getApiUrl(url), JSON.stringify(documentCreate), function(res){
        if(res == undefined || res == null)return;
        if(callback){
          callback(res);
        }
      },
      { contentType: "application/json" },
      function(err){
        var e = 'oops';
      });
  }

  generateDocumentExtractName(webdoc, patientId, providerId, userId, date, additionalSql, filePath, callback){
    var self = this;
    var url = 'documents/createextractname';
    var addendum = false;

    var documentCreate={
      document: self.getNewDocument(patientId, providerId, userId, date, webdoc),
      isAddendum:addendum,
      absolutePath:"",
      additionalSql:additionalSql
    }
    documentCreate.document.DocumentLocation= filePath;

    self.http.post(self.helper.getApiUrl(url), JSON.stringify(documentCreate), function(res){
        if(res == undefined || res == null)return;
        if(callback){
          callback(res);
        }
      },
      { contentType: "application/json" },
      function(err){
        var e = 'oops';
      });
  }

  getNewDocument(patientId, providerId, userId, date, webdoc){
    var doc = {
      DocumentName:webdoc.Description,
      UserID:userId,
      ProviderID:providerId,
      PatientID:patientId,
      CreationDate:moment(date).format("MM-DD-YYYY"),
      DocumentType:webdoc.Description,
      WebDocId: webdoc.Id
    }
    return doc;
  }

  getHistoryResultObject(){
    return {
      TaskTypeID: null,
      TaskTypeDescription: null,
      TaskType: null,
      Locked: null,
      Description: null,
      Type: null,
      ExamDateTime: null,
      CreateDate: null,
      ProviderID: null,
      ObjectID: null,
      DocPath: null,
      Part: null,
      Details: null,
      DetailsMore: null,
      BoardId: null
    }
  }


  getBlockTypes(){
    return [{component:'caseManager', name: 'Case Manager'},
      {component:'diagnosis', name: 'Diagnosis'},
      {component:'exam', name: 'Exam'},
      {component:'goForm', name: 'Go Form'},
      {component:'hpi', name: 'HPI'},
      {component:'jointInjection', name: 'Joint Injection'},
      {component:'medAllergy', name: 'Medication Allergy'},
      // {component:'mips', name: 'MIPS'},
      {component:'order', name: 'Orders'},
      {component:'plan', name: 'Plan'},
      {component:'ptAuthorization', name: 'PT Authorization'},
      {component:'procedure', name: 'Procedures'},
      {component:'surgery', name: 'Surgery'}];
  }

  bodypartsToString(BodypartSideArray){
    let strBodyparts = "";
    for(let i = 0; i < BodypartSideArray.length; i++){
      let part = BodypartSideArray[i].part == null ? "" : BodypartSideArray[i].part;
      let side = BodypartSideArray[i].side == null ? "" : BodypartSideArray[i].side;
      let sidePart = "";

      if(side.length > 0){
        sidePart = side;
      }
      if(part.length > 0){
        if(side.length > 0){
          sidePart += " " + part;
        }else{
          sidePart += part;
        }
      }

      strBodyparts += sidePart + " Complaint,";
    }
    let lastComma = strBodyparts.lastIndexOf(",");
    strBodyparts = strBodyparts.substr(0, lastComma);
    return strBodyparts;
  }

  formatBodypart(bodypart){

    if(bodypart == null)return null;
    //remove any nonsense from bodypart description...
    var newBp = bodypart.replace(/complaint/gi, "");
    newBp = newBp.replace(/right/gi, "");
    newBp = newBp.replace(/left/gi, "");
    newBp = newBp.trim();
    return newBp;
  }

  parseVisitBodyparts(visitBodyParts){

    if(visitBodyParts == null)return null;

    let bodyparts=[];

    let splitComma = visitBodyParts.split(',');
    for(let i = 0; i < splitComma.length; i++){

      let bodypart = new BodypartSide(null, null);

      //trim...
      let bp = splitComma[i].trim();
      //remove complaint...
      bp = bp.replace(/complaint/gi, "");
      //trim again...
      bp = bp.trim();
      //split at space...
      bp = bp.split(' ');
      if(bp.length == 1){
        //just a bodypart...
        bodypart = this.getBodypartSide(bp[0], null);
      }else if (bp.length == 2){
        //body side and part
        bodypart = this.getBodypartSide(bp[1], bp[0]);
      }else{
        //3-> lower leg / upper arm...
        bodypart = this.getBodypartSide(bp[1] + " " + bp[2], bp[0]);
      }
      if(bodypart.part != null)
        bodyparts.push(bodypart);
    }

    return bodyparts;
  }

  getWebDocsWithProviderID(providerId, callback){
    var self = this;
    var url = "webdoc/provider/"+ providerId+"/default";
    self.http.get(self.helper.getApiUrl(url), function (res) {
      callback(res);
    });
  }

  // getWebDocsWithProviderID(providerId, callback){
  //   var self = this;
  //   var url = "webdoc/provider/"+ providerId+"/default";
  //   self.http.get(self.helper.getApiUrl(url), function (res) {
  //     callback(res);
  //   });
  // }

  getBlocksWithVisitData(visitData){
    var self = this;
    var blocks = [];

    //remove VISIT, DOCUMENTS, HISTORY...
    let tFilter = _.filter(visitData, function(d){return d.Type.toLowerCase() != 'visit' && d.Type.toLowerCase() != 'document' && d.Type.toLowerCase() != 'history'});

    let filtered = tFilter;

    //sort into columns...
    for(let i = 0; i < filtered.length; i++){

      let aType = filtered[i].Type.toLowerCase();
      let taskType = filtered[i].TaskType.toLowerCase();
      let desc = filtered[i].Description.toLowerCase();

      //only load POSTOP based exams...
      // if(taskType == 'exam' && aType == 'exam'){
      //   continue;
      // }

      //ignores...
      if((aType == 'order' && desc == 'surgery') || //SURGERY SCHEDULE
        (aType == 'procedure' && desc == 'cast application') || //CAST APPLICATION
        (aType == 'exam' && desc == 'physical exam') || //PHYSICAL EXAM
        (aType == 'comments') || // COMMENTS
        (aType == 'order' && (desc == 'ot order' || desc == 'pt order')) || //PT OT ORDER
        (aType == 'work release') || //WORK RELEASE
        (aType == 'note') ||//NOTES
        (taskType == 'exam' && aType == 'exam') ||
        (taskType == 'custompdf')){ //exams
        continue;
      }

      //check for joint injection...
      if(aType == 'procedure' && filtered[i].Description.toLowerCase() == 'injection'){
        aType = 'jointInjection';
      }
      //check for PT...
      if(taskType == 'exam'){
        aType = 'exam';
      }

      //prevent ORDERS, JOINT INJECTION, diagnosis duplicates...
      if(aType == 'order' || aType == 'jointInjection' || aType == 'diagnosis' || aType == 'plan' || aType == 'procedure'){
        let found = _.find(blocks, function (b){return b.blockType == aType});// && b.options == undefined});
        if(found)continue;
      }

      var aBlock = self.getNewBlock();
      aBlock.setBlockType(aType);
      aBlock.widthMult = 2;
      aBlock.heightMult = 2;
      aBlock.id = i;

      //add objectId
      aBlock.objectId= filtered[i].ObjectID == undefined ? 0 : filtered[i].ObjectID;

      //hpi, exam, plan goes to left of layout, everything else goes to right...
      if(aType == 'hpi' || aType == 'exam' || aType == 'plan'){
        aBlock.x = 0;
      }else{
        aBlock.x = 0.5;
      }

      //add HPI, EXAM, PLAN in right positions...
      if(aType == 'hpi'){
        blocks.splice(0, 0, aBlock);
        continue;
      }

      if(aType == 'exam'){
        blocks.splice(1, 0, aBlock);
        continue;
      }

      if(aType == 'plan'){
        blocks.splice(2, 0, aBlock);
        continue;
      }


      blocks.push(aBlock);
    }

    return blocks;
  }

  getDefaultFollowUpBlocks(){
    //hpi 2w, exam 2w, plan 2w
    //dx 2w, sx 2w alg 2w

    var self = this;
    var blocks = [];

    var hpi = self.getNewBlock();
    hpi.setBlockType('hpi');
    hpi.widthMult = 2;
    hpi.heightMult = 1;
    hpi.id = 0;
    blocks.push(hpi);

    var exam = self.getNewBlock();
    exam.setBlockType('exam');
    exam.widthMult = 2;
    exam.heightMult = 1;
    exam.id = 1;
    blocks.push(exam);

    var plan = self.getNewBlock();
    plan.setBlockType('plan');
    plan.widthMult = 2;
    plan.heightMult = 1;
    plan.id = 2;
    blocks.push(plan);

    var dx = self.getNewBlock();
    dx.blockType = 'diagnosis';
    dx.widthMult = 2;
    dx.heightMult = 1;
    dx.id = 3;
    dx.x = 0.5;
    blocks.push(dx);

    var surg = self.getNewBlock();
    surg.blockType =  'surgery';
    surg.widthMult = 2;
    surg.heightMult = 1;
    surg.id = 4;
    surg.x = 0.5;
    blocks.push(surg);

    var alg = self.getNewBlock();
    alg.blockType =  'medAllergy';
    alg.widthMult = 2;
    alg.heightMult = 1;
    alg.id = 5;
    alg.x = 0.5;
    blocks.push(alg);

    return blocks;
  }

  filterPatientVisitData(visitData, providerId){

    var results =[];

    //exam = EXAM, PT, Follow UP
    // var exam = _.find(visitData, function(d){return d.Type == 'PT' || d.Type == 'Follow Up'});
    // var plan = _.find(visitData, function(d){return d.Type == 'Plan'});
    // var hpi = _.find(visitData, function(d){return d.Type == 'HPI'});

    var obj ={
      "data":{
        "ObjectID":null,
        "Description":""
      }
    }

    //if(hpi != undefined)
      results.push(new filterData('hpi', obj));
    //if(exam != undefined)
      results.push(new filterData('exam', obj));
    //if(plan != undefined)
      results.push(new filterData('plan', obj));



    var docs = _.filter(visitData, function(d){return d.Type == 'Document' && d.ProviderID == providerId});
    if(docs.length > 0){
      for(var d = 0; d < docs.length; d++){
        //res.push(docs[d]);
        results.push(new filterData('document',docs[d]));
      }
    }
    var customPdfs = _.filter(visitData, function(d){return d.Type == 'KIOSK' && d.ProviderID == providerId});
    if(customPdfs.length > 0){
      for(var c = 0; c < customPdfs.length; c++){
        //res.push(customPdfs[c]);
        results.push(new filterData('document', customPdfs[c]));
      }
    }

    var xrays = _.filter(visitData, function(d){return d.TaskTypeDescription == 'XRAY'&& d.ProviderID == providerId});
    if(xrays.length > 0){
      for(var c = 0; c < xrays.length; c++){
        //res.push(xrays[c]);
        results.push(new filterData('document', xrays[c]));
      }
    }


    return results;
  }

  createVisitBoardWithData(description, data, patientId, providerId, userId, date, callback){
    var aBoard = new Board(description);

    aBoard.patientId = patientId;
    aBoard.providerId = providerId;
    aBoard.userId = userId;
    aBoard.date = moment(date).format("MM/DD/YYYY");//self.helper.getISODateToFormat(data.ExamDateTime, "MM/DD/YYYY");

    if(data == null){
      return aBoard;
    }

    aBoard.id = data.id;

    if(data.Blocks == null){
      return aBoard;
    }
    
    var blocks = data.Blocks;
    for(var b = 0; b < blocks.length; b++){
      var block = blocks[b];
      var aBlock = new BlockData(block.name);

      aBlock.setBlockType(block.name);
      aBlock.sortIndex = b;
      aBlock.blockType = block.name;
      aBlock.id = block.id;
      aBlock.x = block.x;
      aBlock.widthMult = block.widthMult;
      aBlock.heightMult = block.heightMult;
      aBlock.objectId = block.objectId;
      aBlock.pinned = block.pinned;
      aBlock.goFormId = block.goFormId;
      aBlock.goFormInstanceId = block.goFormInstanceId;
      aBoard.blocks.push(aBlock);

      //add position object...
      aBoard.addPosition(block.id, block.x);
    }

   return  aBoard;
  }

  getVisitBoardData(patientId, providerId, date, callback){
    var self = this;
    self.loadVisitBoard(patientId, providerId, date,function(res){
      var data = res;
      var aBoard = self.createVisitBoardWithData("", data, patientId, providerId, self.helper._user.UserID, moment(date).format("MM/DD/YYYY"));
      callback(aBoard);
    });
  }

  getVisitBoardDataWithBoardId(id, callback){
    var self = this;
    self.loadVisitBoardWithId(id,function(res){
      var data = res;
      var aBoard = self.createVisitBoardWithData("", data, res.PatientId, res.ProviderId, self.helper._user.UserID, moment(res.ExamDateTime).format("MM/DD/YYYY"));
      callback(aBoard);
    });
  }

  getUserBoardData(callback){

    var self = this;

    self.loadUserBoard(self.helper._user.UserID, function(res){

      var boards = [];

      if(res != null){
        for(var i = 0; i < res.length; i++){
          var OD_UserBoard = res[i];
          var aBoard = new Board(OD_UserBoard.Description);
          aBoard.id = OD_UserBoard.id;
          aBoard.userId = OD_UserBoard.UserID;
          aBoard.isDefault = OD_UserBoard.IsDefault == null ? false : OD_UserBoard.IsDefault;

          var blocks = OD_UserBoard.Blocks;
          for(var b = 0; b < blocks.length; b++){
            var block = blocks[b];
            var aBlock = new BlockData(block.name);
            aBlock.sortIndex = b;
            aBlock.blockType = block.name;
            aBlock.id = block.id;
            aBlock.x = block.x;
            aBlock.widthMult = block.widthMult;
            aBlock.heightMult = block.heightMult;
            aBoard.blocks.push(aBlock);

            //add position object...
            aBoard.addPosition(block.id, block.x);
          }
          boards.push(aBoard);
        }
      }

      callback(boards);

    });
  }

  loadVisitBoard(patientId, providerId, date, callback){
    var self = this;
    var url = `visit/boards?patientId=${patientId}&providerId=${providerId}&examDate=${date}`;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      callback(json);
    });
  }

  loadVisitBoardWithId(id, callback){
    var self = this;
    var url = `visit/board?id=${id}`;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      callback(json);
    });
  }


  saveVisitBoard(board, callback){
    var self = this;
    var url = "visit/boards";

    var newBoard={
      'id': board.id,
      'ProviderId': board.providerId,
      'PatientId': board.patientId,
      'ExamDateTime': board.date,
      'Blocks':null,
      'VisitCodeId': board.visitCodeId == undefined ? board.visitInfo.visitCodeId : board.visitCodeId
    }

    var blocks=[];
    if(board.positions.length == 0){
      //add positions...
      for(let b =0; b < board.blocks.length; b++){
        board.addPosition(board.blocks[b].id, board.blocks[b].x);
      }
    }

    //try getting fresh block positions here...
    let pos = board.getPositions();

    //update blocks via positions array...
    // for(let p = 0; p < board.positions.length; p++){
    for(let p = 0; p < pos.length; p++){  
      // let aPos = board.positions[p];
      let aPos = pos[p];
      //attr, x
      //find block w/ attr
      let tBlock = _.find(board.blocks, function(b){return b.id == aPos.attr});

      //create new block...
        var newBlock={
          'id':tBlock.id,
          'x': aPos.x,
          'widthMult': tBlock.widthMult,
          'heightMult': tBlock.heightMult,
          'name': tBlock.blockType,
          'objectId': tBlock.objectId,
          'pinned': tBlock.pinned,
          'goFormInstanceId': tBlock.goFormInstanceId,
          'goFormId': tBlock.goFormId
        }

        //check for goForm...
        if(tBlock.childModel && tBlock.childModel.viewModel){
          if(newBlock.goFormInstanceId == null &&
             tBlock.childModel.viewModel.instanceId != null){
            newBlock.goFormInstanceId = tBlock.childModel.viewModel.instanceId;
          }
          if(newBlock.goFormId == null &&
            tBlock.childModel.viewModel.formId != null){
            newBlock.goFormId = tBlock.childModel.viewModel.formId;
          }
        }

        blocks.push(newBlock);
    }


    newBoard.Blocks = blocks;

    if(board.id == 0){
      //create board...
      self.http.post(self.helper.getApiUrl(url), JSON.stringify(newBoard), function(res){

          board.id = res.id;

          if(board.visitInfo != null){
            board.visitInfo.visitCode.VisitBoardId = board.id;
            self.updateVisitCode(board.visitInfo.visitCode);
          }

          if(callback){
            callback(res);
          }
        },
        { contentType: "application/json" },
        function(err){
          var e = 'oops';
        });

    }else{
      //update board...
      self.http.put(self.helper.getApiUrl(url), newBoard, (success) => {
        if(callback && success){
          callback(newBoard);
        }
      }, (error) => {
        alert(error.responseText);
      });
    }
  }

  loadUserBoard(userId, callback){
    var self = this;
    var url = 'users/boards?userId='+userId;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      callback(json);
    });
  }

  saveUserBoard(board, callback){
    var self = this;
    var url = "users/board";

    var newBoard={
      'id': board.id,
      'Description': board.description,
      'UserID': self.helper._user.UserID,
      'Blocks':null,
      'IsDefault': board.isDefault
    }

    var blocks=[];
    for(var b = 0; b < board.blocks.length; b++){
      var aBlock = board.blocks[b];
      var newBlock={
        'id':aBlock.id,
        'x': aBlock.x,
        'widthMult': aBlock.widthMult,
        'heightMult': aBlock.heightMult,
        'name': aBlock.blockType,
        'pinned': aBlock.pinned
      }
      blocks.push(newBlock);
    }

    newBoard.Blocks = blocks;

    if(board.id == 0){
      //create board...
      self.http.post(self.helper.getApiUrl(url), JSON.stringify(newBoard), function(res){

          board.id = res.id;
          if(callback){
            callback(res);
          }
        },
        { contentType: "application/json" },
        function(err){
          var e = 'oops';
        });

    }else{
      //update board...
      self.http.put(self.helper.getApiUrl(url), newBoard, (success) => {
        if(callback){
          callback(success);
        }
      }, (error) => {
        alert(error.responseText);
      });
    }
  }

}
