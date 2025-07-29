import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import {EventAggregator} from 'aurelia-event-aggregator';
import {Globals} from '../globals';
import { observable } from 'aurelia-framework';
import {PreferenceHelper} from '../preferenceHelper';
import {PopupHelper} from "../popupHelper";
import * as _ from 'lodash';


class PlanRow{

  @observable text;

  constructor(data, bodypart, text, title, parent){
    this.data = data;
    this.parent = parent;
    this.bodypart=bodypart;
    this.text=text;
    this.title=title;
    this.selected=false;
    this.element;
    this.rowid=0;
    this.displayDelete=false;
    this.canDelete = false;
    this.specialty = null;
    this.reason = null;
    this.hasReason=false;
  }

  textChanged(newValue, oldValue){
    // if(this.element){
    //   this.auto_grow(this.element);
    // }

    if (this.parent.fromPrevious || this.parent.prefClicked) {
      if (newValue !== oldValue) {
        this.parent.trySave();
        this.parent.fromPrevious = false;
        this.parent.prefClicked = false;
      }
    }

  }

  auto_grow(element) {

    // element.style.height = "5px";

    // if(element.scrollHeight==0){
    //   setTimeout(function(){
    //     element.style.height = (element.scrollHeight)+"px";
    //   },500);
    // }else{
    //   element.style.height = (element.scrollHeight)+"px";
    // }
  }
}


@inject(helper,http, Home, Data, EventAggregator, Globals, PreferenceHelper,PopupHelper)
export class Plan {

  data = null;
  patientId;
  providerId;
  userId;
  @observable bodypart;
  date;
  boardType;
  prefClicked = false;
  locked = false;

  title = "";

  speechId = 'plan-speech';

  @observable planText = null;

  board = null;
  fromPrevious = false;
  //previousDate = null;
  fromPreviousDate=null;
  fromPreviousProviderId=null;
  fromPreviousBodyPart = null;
  loadData = true;

  block = null;

  rows=[];
  selectedRowIndex=0;
  selectedRow;

  parentChildItem;
  currentParentChildItem;

  parentChildItems=[];//try this for multiple options...

  bodyparts=[];

  textareaHeight=0;

  referringProviders=[];

  rowHeight = 100

  constructor(helper, http, Home, Data, EventAggregator, Globals, PreferenceHelper, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
    this.eventAggregator = EventAggregator;
    this.globals = Globals;
    this.prefHelper = PreferenceHelper;
    this.popupHelper = PopupHelper;
  }

  activate(model) {
    this.block = model;
    this.block.childModel = this;

    if (model.hasOwnProperty('fromPrevious')) {
      this.fromPrevious = true;
    }
    if(model.hasOwnProperty('fromPreviousProviderId')){
      this.fromPreviousProviderId = model.fromPreviousProviderId;
    }
    if(model.hasOwnProperty('fromPreviousDate')){
      this.fromPreviousDate = model.fromPreviousDate;
    }
    if(model.hasOwnProperty('fromPreviousBodyPart')){
      this.fromPreviousBodyPart = model.fromPreviousBodyPart;
    }
    this.loadData = model.loadData;
  }

  addPreferenceWithId(postOpId){
    let self = this;
    self.goData.getFollowUpPrefPopulated(postOpId, 
      self.patientId, 
      self.providerId, 
      self.date, 
      function(res){
        //self.addNewRow(self.board.visitInfo.bodypart, res.)
    });
  }

  hasValue(){
    let self = this;
    if(self.rows.length > 0 && self.rows[self.selectedRowIndex].text != null){
      return true;
    }
    return false;
  }

  loadPreferences(providerId, bodypart){
    let self = this;
    // let url = `plans/preferences?providerId=${providerId}&part=${bodypart}`;
    let url = `plans/preferences/sorted?providerId=${providerId}`;
    self.goData.getWithUrl(url, function(res){

      //filter for bodypart...
      //let filtered = _.filter(res, function(p){return p.Path == bodypart || p.Path.toLowerCase() == 'general'});

      // self.createPreferenceMenu(filtered, bodypart);

      self.createPreferenceMenu(res);
    });
  }

  openReasonCodePicker(reasonCode, callback){
    let self = this;
    let reasonUrl = `snomed/reasoncodes?snomedCode=${reasonCode}`;
    self.goData.getWithUrl(reasonUrl, function(codeRes){

      //build generic table data...
      let columnHeaders=['Code','Name'];
      let rowData = [];
      for(let i = 0; i < codeRes.length; i++){
        let code= codeRes[i];
        let genTableRow = self.goData.getGenericTableRow([code.Code, code.DisplayName], code);
        genTableRow.id = i;
        rowData.push(genTableRow);
      }
  
      //display generic table...
      self.popupHelper.openGenericTablePop('Select Reason', columnHeaders, rowData, false, {zIndex: 5001}, function(res){
        callback(res);
      });

    });
  }

  openSpecialityPicker(callback){
    let self = this;

    let specialtyUrl = 'referring/specialty/all';
    self.goData.getWithUrl(specialtyUrl, function(specRes){

      //build generic table data...
      let columnHeaders=['Name','Specialty'];
      let rowData = [];
      for(let i = 0; i < specRes.length; i++){
        let specialist= specRes[i];
        let genTableRow = self.goData.getGenericTableRow([specialist.ReferringName, specialist.SpecialtyCodeDescription], specialist);
        genTableRow.id = i;
        rowData.push(genTableRow);
      }
  
      //display generic table...
      self.popupHelper.openGenericTablePop('Select Specialist', columnHeaders, rowData, false, {zIndex: 5001}, function(res){
        callback(res);
      });

    });
  }

  rowHasSameBodypartType(row, bodypart, type){
    let rowTitle = row.title.toLowerCase();
    if(rowTitle.includes(bodypart.toLowerCase()) &&
      rowTitle.includes(type.toLowerCase())){
        return true;
      }
      return false;
  }

  addResultsFromPrefPicker(data, bodypart){
    let self = this;

    //hack for displaying proper bodypart...
    //let bodypart = data.hasOwnProperty("Children") ? self.board.visitInfo.bodypart : "General";
    let bType = self.boardType.toUpperCase();

    //add NEW row or UPDATE selected one...
    if(self.rows.length > 0){
      //get selected row...
      var updated = false;
      for(let r = 0; r < self.rows.length; r++){
        if(self.rows[r].selected == true &&
          self.rowHasSameBodypartType(self.rows[r], bodypart, bType)){
          //update existing...
          //append or overwrite??

          self.popupHelper.openGenericMessagePop("Would you like to create a new plan or append to the current?", 
            'New or Append?', ['NEW','APPEND'], false, function(popRes){
            if(popRes.result == 'APPEND'){
              let appended = self.rows[r].text + " " + data.Detail;
              self.updateRow(bodypart, appended, r, data);
            }else if(popRes.result == 'NEW'){
              //self.updateRow(bodypart, data.Detail, r, data);
              self.addNewRow(bodypart, data.Detail, data);
            }
          });


          // self.popupHelper.openAppendOverwitePop('Append or Overwrite', `Would you like to append or overwrite the selected plan?`, function(popRes){
          //   if(popRes.result == 'append'){
          //     let appended = self.rows[r].text + " " + data.Detail;
          //     self.updateRow(bodypart, appended, r, data);
          //   }else if(popRes.result == 'overwrite'){
          //     self.updateRow(bodypart, data.Detail, r, data);
          //   }
          // });

          updated = true;
          break;
        }
      }
      if(!updated){
        //add new row...
        self.addNewRow(bodypart, data.Detail, data);
      }
    }else{
      //add new row...
      self.addNewRow(bodypart, data.Detail, data);
    }
  }

  openPrefPicker(){
    let self = this;


      let viewPath = './parentChildPicker';

      const windowHeight = window.innerHeight - 100;
      const windowWidth = window.innerWidth;

      let quarter = windowWidth / 4;
      let width = windowWidth / 2;
      let left = quarter;

      let height = windowHeight / 2;
      let qHeight = windowHeight / 4;
      let top = qHeight;

      this.popupHelper.openViewModelPop(viewPath, self, 'Plan Preferences', width, height, top, left, null, function(res){

        let prefBodypart = res.parent.description;


        //check for MIPS...
        if(res.data.Object.NeedsSpecialty){
          //NEEDS SPECIALTY...
          self.openSpecialityPicker(function(specialtyRes){
            let specRes = specialtyRes.row.data;
            // res.data.specialty = specRes;
            res.data.reason = specRes;
            res.data.reason.Detail = res.data.Detail;
            res.data.reason.Lcode = res.data.Object.Lcode;
            res.data.reason.PlanPreferenceId = res.data.Object.PlanID;
            self.addResultsFromPrefPicker(res.data.reason, prefBodypart);
          });
        }else if(res.data.Object.NeedsReason){
          //NEEDS REASON...
          self.openReasonCodePicker(res.data.Object.Snomed, function(reasonRes){
            let rRes = reasonRes.row.data;
            res.data.reason = rRes;
            //add snomed value to reason object...
            res.data.reason.Snomed = res.data.Object.Snomed;
            res.data.reason.SnomedType = res.data.Object.SnomedType;
            res.data.reason.Detail = res.data.Detail;
            res.data.reason.Lcode = res.data.Object.Lcode;
            res.data.reason.PlanPreferenceId = res.data.Object.PlanID;

            self.addResultsFromPrefPicker(res.data.reason, prefBodypart);
          });
        }else{
          self.addResultsFromPrefPicker(res.data, prefBodypart);
        }

      });
    
  }

  currentItemHasItem(currentItem, id){
    return _.find(currentItem.items, function(i){return i.id == id});
  }

  createPreferenceMenu(prefs){
    let self = this;
    if(prefs.length == 0 || prefs[0].Children.length == 0)return;

    let bps=self.goData.bodyparts;// ["Ankle","Cervical","Elbow", "Foot","Hand", "Hip","Knee","Lumbar","Shoulder", "Thoracic", "Wrist", "General"];


    //get current row bodypart...
    var row_bodypart=null;
    if(self.rows.length > 0){
      row_bodypart = self.rows[self.selectedRowIndex].bodypart.toUpperCase()
    }else{
      row_bodypart = self.bodypart;
    }

    //create parent child items for each bodypart...
    for(var b = 0; b < bps.length; b++){
      let pci = self.goData.getParentChildItem(bps[b], null);
      let aPrefs = _.find(prefs, function(p){return p.Path == pci.description});
      if(aPrefs){
        aPrefs = aPrefs.Children;
      }

      //if this preference == current row bodybart, make it current...
      if(bps[b].toUpperCase() == row_bodypart){
        self.currentParentChildItem = pci;
      }

      self.parentChildItems.push(pci);

      let rootItem =  pci;

      if(!aPrefs)continue;

      for(let p = 0; p < aPrefs.length; p++){
        let currentItem=rootItem;
        let parentItem=null;
        let currentPref = aPrefs[p];
        let parentPref=null;

        let topItem = self.goData.getParentChildItem(currentPref.Path, currentPref, currentItem);
        currentItem.items.push(topItem);
        currentItem = currentItem.items[currentItem.items.length - 1];

        while (currentPref != null && currentPref.Children.length > 0){
          parentItem = currentItem;
          parentPref = currentPref;
          let childPref = currentPref.Children.shift();
          let childItem = self.goData.getParentChildItem(childPref.Path, childPref, parentItem);
          currentItem.items.push(childItem);

          if(childPref.Children.length > 0){
            currentItem = childItem;
            currentPref = childPref;
          }else{
            if(parentPref.Children.length > 0){
              currentItem = parentItem;
              currentPref = parentPref;
            }else{
              //find next parent with children...
              let foundParentWithChildren=parentItem;
              let foundParent = false;
              while(!foundParent){

                if(foundParentWithChildren.parent.data == null){
                  currentPref = null;
                  foundParent = true;
                  break;
                }

                if(foundParentWithChildren.parent.data.Children.length == 0){
                  let tParent = foundParentWithChildren.parent;
                  foundParentWithChildren =tParent;
                }else{
                  currentItem = foundParentWithChildren.parent;
                  currentPref = foundParentWithChildren.parent.data;
                  foundParent = true;
                }
              }
            }
          }
        }
      }
    }
  }

  planTextChanged(newValue, oldValue) {
    if (this.fromPrevious || this.prefClicked) {
      if (newValue !== oldValue) {
        this.trySave();
        this.fromPrevious = false;
        this.prefClicked = false;
      }
    }
  }

  bodypartChanged(newValue, oldValue){
    let self = this;
    if(oldValue == undefined){// || oldValue != newValue){
      //load preferences here...
      self.loadPreferences(self.providerId, newValue);
    }
  }

  resizeTextarea(){
    let self = this;
    if(self.scrollbody){
      if(self.rows.length == 1){
        self.rowHeight = self.scrollbody.clientHeight;
      }else{
        self.rowHeight = Math.round(self.scrollbody.clientHeight * 0.75)
      }
    }
  }

  attached() {
    let self = this;

    // self.goData.getWithUrl('referring/all', function(refs){
    //   self.referringProviders = refs;
    // });

    //self.textareaHeight = self.scrollbody.clientHeight - 48// - self.titleHeader.clientHeight;
    self.resizeTextarea();

    if (self.home.currentBoard != null &&
      self.home.currentBoard.visitInfo != null) {

      self.board = self.home.currentBoard;

      for(let i = 0; i < self.board.visitInfo.bodyparts.length; i++){
        let found = _.find(self.bodyparts, function(f){return f.part == self.board.visitInfo.bodyparts[i].part});
        if(!found){
          self.bodyparts.push(self.board.visitInfo.bodyparts[i]);
        }
      }
      //add general bodypart for MIPS...
      self.bodyparts.push({part:'General',side:''});

      self.patientId = self.home.currentBoard.visitInfo.patientId;
      self.date = self.home.currentBoard.visitInfo.date;
      self.providerId = self.home.currentBoard.visitInfo.providerId;// == undefined //? self.home.currentProvider.ProviderID : self.home.currentBoard.providerId;
      self.userId = self.home.currentBoard.userId;
      self.bodypart = self.home.currentBoard.visitInfo.bodypart;
      self.boardType = self.home.currentBoard.visitInfo.typeForSave;
      if (self.home.currentBoard.visitInfo.locked != null)
        self.locked = self.home.currentBoard.visitInfo.locked == 0 ? false : true;


      //self.loadPreferences(self.providerId, self.bodypart ? self.bodypart : self.home.currentBoard.visitInfo.bodyparts[0].part);


      self.eventAggregator.publish("planNewBlockAttached", self);

      // self.goData.getWithUrl('referring/all', function(refs){
      //   self.referringProviders = refs;

        if (self.loadData) {
          if (!self.fromPrevious) {
            self.load();
          } else {
            self.loadPrevious();
          }
        }


      //});


      // if (self.loadData) {
      //   if (!self.fromPrevious) {
      //     self.load();
      //   } else {
      //     self.loadPrevious();
      //   }
      // }

      self.eventAggregator.publish("modelAttached", self);

      if(self.block.loadPreferenceCallback){
        self.block.loadPreferenceCallback(self.block);
      }

      self.eventAggregator.subscribe('blockresized', function(){
        self.resizeTextarea();
      });

    }
  }

  detached() {
    this.trySave();
  }

  trySave() {
    var self = this;

    if(self.block.dontSave){
      return;
    }


    if (self.board != null && !self.locked) {
      self.home.saveQueue.addItem(self);
    }
  }

  getNewRowId(){
    let self = this;
    let id = 0;
    for(let i = 0; i < self.rows.length; i++){
      let aRow = self.rows[i];
      if(aRow.rowid > id){
        id = aRow.rowid;
      }
    }

    return id + 1;
  }

  setSelectedRowWithIndex(index){
    let self = this;
    self.selectedRow = self.rows[index];
    self.selectedRowIndex = index;
    self.planRowClicked(self.selectedRow);
  }


  addNewRow(bodypart, text, data){
    let self = this;
    let tTitle = self.boardType.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : self.boardType.toUpperCase();
    let titleAndBp = tTitle + ": "+ bodypart;
    // let newRow = new PlanRow(null, bodypart, text, titleAndBp, self);

    let newRow = new PlanRow();
    newRow.data = null;
    newRow.parent = self;
    newRow.bodypart=bodypart;
    newRow.title=titleAndBp;
    newRow.text=text;
    //Code, DisplayName, Snomed

    newRow.referringId = data ? data.ReferringId : null; 
    newRow.snomed = data ? data.Snomed : null;
    newRow.snomedType = data ? data.SnomedType : null;
    newRow.lcode = data ? data.Lcode : null;
    newRow.planPreferenceId = data ? data.PlanPreferenceId : null;
    newRow.reasonCode= null;
    if(data && (data.SpecialtyCode || data.Code)){
      newRow.reasonCode = data.SpecialtyCode ? data.SpecialtyCode : data.Code;
    }

    //create MIPS card here...
    if(newRow.reasonCode){
      self.saveNewPlanObjectForMips(newRow, function(res){
        newRow.data = res;
        let options={
          loadData: false,
          dataObject: res,
          objectId: res.PlanID
        }
        let exists = self.board.getBlockWithType("mips");
        if(exists){
          //add row to mips card...
          self.eventAggregator.publish("addMipsRow", res);
        }else{
          //add new mips card w/ data...
          self.home.addNewBlockComponentToBoard('mips', options);
        }

      });
    }



    //let rowid = self.rows.length + 1;
    newRow.rowid = self.getNewRowId();

    self.rows.unshift(newRow);
    self.selectedRow = newRow;
    self.selectedRowIndex = 0;

    self.planRowClicked(newRow);

    //scroll to top...
    let sb = self.scrollbody;
    setTimeout(function(){
      sb.scrollTop = 0;
    },500);

    return newRow;
  }

  updateRow(bodypart, text, index, data){
    let self = this;
    let tTitle = self.boardType.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : self.boardType.toUpperCase();
    let newRow = new PlanRow(null, bodypart, text, tTitle + ": "+ bodypart, self);
    newRow.specialty = data.specialty;
    newRow.reason = data.reason;

    let rowToUpdate =  self.rows[index];
    newRow.rowid = rowToUpdate.rowid;

    self.rows.splice(index, 1);
    self.rows.splice(index, 0, newRow);

    self.selectedRow = rowToUpdate;
    self.selectedRowIndex = index;

    self.planRowClicked(rowToUpdate);

    return rowToUpdate;
  }

  addRowClick(bodypart){
    this.addNewRow(bodypart.part, null);
  }

  planRowClicked(r){
    let self = this;
    for(let i = 0; i < this.rows.length; i++){
      if(this.rows[i].rowid == r.rowid){
        this.rows[i].selected = true;
        self.selectedRowIndex = i;
      }else{
        this.rows[i].selected = false;
      }
    }
  }

  getPlanRowWithBodypart(bodypart){
    for(let i = 0; i < this.rows.length; i++){
      if(this.rows[i].bodypart == bodypart){
        return this.rows[i];
      }
    }
    return null;
  }

  displayDeleteAlert(description, callback) {
    let self = this;
    self.popupHelper.openGenericMessagePop(`Do you wish to delete plan: ${description}?`, 'Delete Plan?', ['YES','NO'], false, function(res){
      callback(res);
    });
  }

  deletePlanClick(index){
    let self = this;
    self.displayDeleteAlert(self.rows[index].title, function(res){
      if(res.result== 'YES'){
        let id = self.rows[index].data ? self.rows[index].data.PlanID : 0;
        if(id==0){
          self.rows.splice(index, 1);
        }else{
          self.deletePlan(id, function(res){
            if(res == true){
              self.rows.splice(index, 1);
            }
          })
        }
      }else{
        //reset row delete...
        self.rows[index].displayDelete = false;
      }
    });
  }

  deletePlan(id, callback){
    let self = this;
    let url = `plans/${id}`;
    self.goData.deleteWithUrl(url, function(res){
      callback(res);
    });
  }

  rowSwipe(event, row) {

    if(!row.canDelete){
      return;
    }

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

  saveNewPlanObjectForMips(row, callback){
    let self = this;
    self.goData.getNewPlan(function (newPlan) {
      newPlan.PatientID = self.patientId;
      newPlan.ExamDateTime = self.date;
      newPlan.ProviderID = self.providerId;
      newPlan.UserID = self.userId;
      newPlan.BodyPart = row.bodypart;
      newPlan.IsOrigin = true;
      newPlan.PlanType = self.boardType;
      newPlan.SpecialtyReferringID = row.referringId;
      newPlan.Snomed = row.snomed;
      newPlan.ReasonCode = row.reasonCode;
      //SnomedType
      newPlan.SnomedType = row.snomedType;
      //Lcode
      newPlan.Lcode = row.lcode;
      //PlanPreferenceID
      newPlan.PlanPreferenceID = row.planPreferenceId;
      newPlan.IsComplete=true;

      self.http.post(self.helper.getApiUrl('plans'), newPlan, (res) => {
        row.data = res;
        if (callback) callback(res);
      }, null, (error) => {
        if (callback) callback(null);
      });
    });
  }

  save(callback) {
    var self = this;
    var url = 'plans';

    if(self.rows.length == 0){
      callback(false);
      return;
    }


    for(let i = 0; i < self.rows.length; i++){

      let planRow = self.rows[i];

      if (planRow.data == null || planRow.data.PlanID == 0) {
        //create new...
        self.goData.getNewPlan(function (newPlan) {
          newPlan.PatientID = self.patientId;
          newPlan.ExamDateTime = self.date;
          newPlan.ProviderID = self.providerId;
          newPlan.UserID = self.userId;
          newPlan.BodyPart = planRow.bodypart;
          newPlan.IsOrigin = true;
          newPlan.PlanType = self.boardType;
          newPlan.PlanText = planRow.text;
          newPlan.IsComplete=true;

          // if(planRow.specialty){
          //   newPlan.ReasonCode = planRow.specialty.SpecialtyCode;
          //   newPlan.SpecialtyReferringID = planRow.specialty.ReferringId;
          // }

          // if(planRow.reason){
          //   newPlan.ReasonCode = planRow.reason.Code;
          //   newPlan.Snomed = planRow.reason.Snomed;
          // }


          self.http.post(self.helper.getApiUrl(url), newPlan, (res) => {

            planRow.data = res;

            //update the block...
            //self.block.objectId = res.PlanID;
            self.goData.saveVisitBoard(self.board);

            if (callback) callback(true);
          }, null, (error) => {
            //alert(error.responseText);
            if (callback) callback(false);
          });

        });
      } else {
        //update...

        planRow.data.PlanText = planRow.text;
        planRow.data.PlanType = self.boardType;

        //update the block if needed...
        // if (self.block.objectId == 0) {
        //   self.block.objectId = self.data.PlanID;
        //   self.goData.saveVisitBoard(self.board);
        // }

        self.http.put(self.helper.getApiUrl(url), planRow.data, (returnData) => {
          //examData.plan = returnData;
          if (callback) callback(true);
        }, (error) => {
          //alert(error.responseText);
          if (callback) callback(false);
        });
      }
    }
  }


  populateWithPreference(text, bodypart, title) {
    let self = this;
    self.prefClicked = true;

    self.selectedRow.bodypart = bodypart;
    self.selectedRow.text = text;
    self.selectedRow.title = title + ": " + bodypart;

    self.resizeTextarea();
  }

  previousClick(){
    this.loadPrevious();
  }

  loadPrevious() {
    var self = this;
    var formattedDate = self.helper.getDateWithFormat(self.date, "MM-DD-YYYY");
    let formattedBp = self.board.visitInfo.getFirstAvailBodypartForExam('plan').part;
    let proId = self.providerId;

    if(self.fromPreviousDate){
      formattedDate = self.fromPreviousDate;
      formattedBp = self.fromPreviousBodyPart;
      proId = self.fromPreviousProviderId;
    }

    var url = `plan/previous?patientId=${self.patientId}&bodypart=${formattedBp}&priorToDate=${formattedDate}&providerId=${proId}`;
    self.http.get(self.helper.getApiUrl(url), function (json) {
      if (json != null) {

        //self.bodypart = formattedBp;

        json.UserID = self.userId;
        json.ProviderID = self.providerId;
        json.ExamDateTime = self.date;
        json.DateCreated = null;
        json.DateModified = null;
        json.PlanID = self.data == null ? 0 : self.data.PlanID;

        self.data = json;
        // self.planText = json.PlanText;

        let tTitle = json.PlanType.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : json.PlanType.toUpperCase();
        tTitle = tTitle + ": "+ formattedBp;

        let row = new PlanRow(json, formattedBp, json.PlanText, tTitle, self);
        self.rows.push(row);

        self.trySave();
        self.fromPrevious = false;
        self.prefClicked = false;

        self.resizeTextarea();
      }
    });
  }

  load() {
    var self = this;
    var formattedDate = self.helper.getDateWithFormat(self.date, "MM-DD-YYYY");
    var url = `plans/patients/${self.patientId}/providers/${self.providerId}/date/${formattedDate}`;

    self.http.get(self.helper.getApiUrl(url), function (json) {
      if (json != null) {
        if (Array.isArray(json)) {
          if(json.length > 0){

            self.data = json;

            for (let i = 0; i < json.length; i++) {
              self.populateGrid(json[i]);
            }

            //get first row bodypart...
            // if(self.rows.length > 0){
            //   self.bodypart = self.rows[0].bodypart;
            // }

            //update row height if SINGLE row...
            self.resizeTextarea();
          }
        }
      }
    });
  }

  // getNewSpecialtyObject(){
  //   return {
  //     ReferringId:0,
  //     ReferringName:'',
  //     SpecialtyCode:'',
  //     SpecialtyCodeDescription:''
  //   }
  // }

  // getNewReasonObject(){
  //   // return {
  //   //   Code:0,
  //   //   DisplayName:'',
  //   //   Snomed:''
  //   // }
  //   return {
  //     Code:0,
  //     CodeDescription:'',
  //     Snomed:'',
  //     ReferringId: 0,
  //     ReferringName:''
  //   }
  // }


  populateGrid(plan){
    let self = this;
    let row = new PlanRow();
    row.parent = self;

    if (plan != null) {
      //new row
      row.data = plan;

      var oDate = self.helper.getISODateToFormat(plan.ExamDateTime, "MM/DD/YYYY");

      //can delete???
      row.canDelete = (oDate == self.date && !self.locked) ? true : false;

      // //specialty...
      // if(plan.SpecialtyReferringID){
      //   row.specialty =self.getNewSpecialtyObject();
      //   row.specialty.ReferringId = plan.SpecialtyReferringID;
      //   //get referring provider name...
      //   let refPro = _.find(self.referringProviders, function(r){return r.ReferringID == plan.SpecialtyReferringID});
      //   row.specialty.ReferringName = `${refPro.NameLast},${refPro.NameFirst}`;   
      //   row.specialty.SpecialtyCode = plan.ReasonCode;
      //   row.hasReason = true;
      // }

      // //snomed reason...
      // if(plan.Snomed){
      //   row.reason = self.getNewReasonObject();
      //   row.reason.Code = plan.ReasonCode;
      //   self.goData.getWithUrl(`snomed/valueset?snomedCode=${plan.Snomed}`, function(value){
      //     row.reason.DisplayName = value.DisplayName;
      //   });
      //   row.reason.Snomed = plan.Snomed;
      //   row.hasReason = true;
      // }


      //check for bodypart...
      if(plan.BodyPart != null){
        self.board.visitInfo.removeBodypartToLoad('plan', plan.BodyPart);
        row.bodypart = plan.BodyPart;
      }else{
        row.bodypart = self.board.visitInfo.getFirstAvailBodypartForExam('plan').part;
      }

      row.text = plan.PlanText;

      let tTitle = plan.PlanType.toUpperCase() == 'FOLLOW' ? 'FOLLOW UP' : plan.PlanType.toUpperCase();

      row.title = tTitle + ": " + row.bodypart;

    } else {
      //new exam...
      row.bodypart = self.board.visitInfo.getFirstAvailBodypartForExam('plan').part;
      row.title = ": "+ row.bodypart;
    }

    let rowid = self.rows.length + 1;
    row.rowid = rowid;

     self.rows.push(row);

  }

  loadComplete(){
    let self = this;
    // self.loadPreferences(self.providerId, self.board.visitInfo.bodypart);
  }

}
