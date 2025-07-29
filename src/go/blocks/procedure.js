import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import moment from "moment";
import {Home} from '../home';
import {Data} from '../../data/go/data';
import {PxSearch} from "../pxSearch";
import {DialogService} from 'aurelia-dialog';
import * as _ from 'lodash';
import {PopupHelper} from "../popupHelper";
import {BindingSignaler} from 'aurelia-templating-resources';
import {EventAggregator} from 'aurelia-event-aggregator';
import {Calculator} from '../../ptdaysheet/calculator';
import { Globals } from '../globals';

@inject(helper,http,Home, Data, DialogService, PopupHelper, BindingSignaler, EventAggregator, Globals)
export class Procedure {

  data=[];
  patientId;
  date;
  providerId;
  userId;
  bodypart;
  bodyside;
  board = null;
  displayDeleteHeader=false;

  block=null;

  modlist=[];

  searchResultTotal;
  searchResultCounter = 0
  @observable filterString=null;
  filterInputPercentWidth=15;
  cacheData=null;
  locked = false;

  filterStringChanged(newVal, oldVal){
    if(newVal.length > 0){
      this.filterInputPercentWidth = 50;
      this.filterProcedures();
    }else{
      this.filterInputPercentWidth = 15;
      this.data = JSON.parse(JSON.stringify(this.cacheData));
      this.cacheData = null;
    }
  }

  constructor(helper, http, Home, Data, DialogService, PopupHelper, BindingSignaler, EventAggregator, Globals){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
    this.signaler = BindingSignaler;
    this.eventAggregator = EventAggregator;
    this.globals = Globals;
  }

  activate(model){
    this.block = model;
    this.block.childModel = this;
  }

  filterProcedures(){
    let self = this;
    if(self.filterString != null && self.filterString.length > 1){

      if(self.cacheData == null){
        self.cacheData = JSON.parse(JSON.stringify(self.data));
      }

      //code or description??
      var letter = self.filterString.substring(0,1);
      var number = self.filterString.substring(1,2);
      var isNumber = parseInt(number);
      if(letter && !Object.is(isNumber, NaN)){
        //filter code...
        self.data = _.filter(self.cacheData, function(p){return p.code.startsWith(self.filterString)});
      }else{
        //filter description...
        self.data = _.filter(self.cacheData, function(p){return p.description.toLowerCase().startsWith(self.filterString.toLowerCase())});
      }
    }
  }

  addPreferenceWithId(pxId){
    let self = this;
    self.goData.getWithUrl(`procedures/${pxId}`, function(pxRes){
      if(pxRes){
        var aPx = self.goData.getNewPx(0, pxRes.CptKey, pxRes.Description,
                    null, pxRes);
        self.tryAddWithExistanceCheck(aPx);
        self.save();
      }
    });
  }

  attached(){

    var self = this;

    self.displayDeleteHeader = !self.globals.isTouchDevice ? true : false;

    if(self.home.currentBoard != null &&
      self.home.currentBoard.patientId != null){

      self.board = self.home.currentBoard;

      self.patientId = self.home.currentBoard.patientId;
      self.date = self.home.currentBoard.visitInfo.date;
      self.providerId= self.home.currentBoard.visitInfo.providerId;
      self.userId = self.home.currentBoard.userId;
      self.bodypart = self.home.currentBoard.visitInfo.bodypart;
      self.bodyside = self.home.currentBoard.visitInfo.bodyside;
      self.locked = self.home.currentBoard.visitInfo.locked == 0 ? false : true;

      self.loadModifierList();

      self.eventAggregator.subscribe("refreshProcedures", function(){
        self.load();
      });

      this.load();

      if(self.block.loadPreferenceCallback){
        self.block.loadPreferenceCallback(self.block);
      }
    }
  }

  selectModifiersWithModiferString(str){
    let self = this;

    if(str == null)return;

    let splitMods = str.split(',');
    //reset each selected item...
    _.forEach(self.modlist, function(m){ m.selected = false;});

    //select each modifier from split array...
    for(let i = 0; i < splitMods.length; i++){
      let found = _.find(self.modlist, function(m){ return m.description == splitMods[i]});
      if(found){
        found.selected = true;
      }
    }
  }

  loadModifierList(){
    let self = this;

      //load from DB...???
      self.goData.getListWithListTypeDescription2AndProviderId('Miscellaneous', 'Modifiers', self.providerId, function(res){
        if(res.length > 0){
          for(let i = 0; i < res.length; i++){
            let oItm = self.goData.getGenericPicklistItem(res[i].Description1, res[i]);
            oItm.selected = false;
            self.modlist.push(oItm);
          }
        }else{
          self.addDefaultPtModifiers(self.board.visitInfo.visitType);
        }

      });  
  }

  addDefaultPtModifiers(visitType){
    let self = this;
    if(visitType.toLowerCase() == 'pt visit'){
        let pList = ['GP','GA','GX','GY','KX','CQ','59'];
        for(let i = 0; i < pList.length; i++){
          let pItm = self.goData.getGenericPicklistItem(pList[i], null);
          pItm.selected = false;
          //does it exist???
          var exists =_.find(self.modlist, function(m){return m.description == pItm.description});
          if(!exists){
            self.modlist.push(pItm);
          }
        }
      }else if(visitType.toLowerCase() == 'ot visit'){
        let oList = ['GO','CO','KX','GA','59'];
        for(let i = 0; i < oList.length; i++){
          let oItm = self.goData.getGenericPicklistItem(oList[i], null);
          oItm.selected = false;
          //does it exist???
          var exists =_.find(self.modlist, function(m){return m.description == oItm.description});
          if(!exists){
            self.modlist.push(oItm);
          }
        }
    }
  }

  doesProcedureExist(code, date, providerId){
    return _.find(this.data, function(o){return o.code == code && o.date == date && o.data.ProviderID == providerId });
  }

  displayExistingPxAlert(px, callback){
    let self = this;
    let alertTemplate =`<span class="font-weight-bold pr-1">${px.code}</span><span class="text-uppercase">${px.description}</span><div class="text-muted">...already exists today!</div><div><bold>Add Anyways?</bold></div>`;
    self.displayAlert(null, 'Procedure Exists', ['OK'],  function(res){
      if(callback && res.result == 'OK'){
        callback(px)
      }
    }, alertTemplate, 'warning');
  }

  displayPxSearch(){
    let self = this;
    self.searchResultCounter = 0;
    self.searchResultTotal = 0;
    self.popupHelper.openProcedureSearchPop('All', false, function(pxs){

      self.searchResultTotal = pxs.length;

      for(var i = 0; i < pxs.length; i++){

        var px = pxs[i];
        //add modifier for PT / OT...
        let vt = self.board.visitInfo.visitType.toLowerCase();
        if(vt == 'ot visit' || vt == 'pt visit'){
          px.modifier = vt == 'pt visit' ? "GP" : "GO";
          //px.modifier = self.tryGettingDefaultPtOtModifierFromList(vt == 'pt visit' ? true : false);//self.modlist[0].description;
        }

        self.tryAddWithExistanceCheck(px, function(){
          self.searchResultCounter++;
          if(self.searchResultCounter == self.searchResultTotal){
            self.save();
          }
        });

      }
      //self.save();
    });
  }


  // tryGettingDefaultPtOtModifierFromList(isPt){
  //   var therapyDescription;
  //   if(isPt){
  //     var found = _.find(this.modlist, function(m){return m.description.toUpperCase() == 'GP'});
  //     therapyDescription = found ? found.description : null;
  //   }else{
  //     //OT...
  //     var found = _.find(this.modlist, function(m){return m.description.toUpperCase() == 'GO'});
  //     therapyDescription = found ? found.description : null;
  //   }
  //   return therapyDescription;
  // }


  tryAddWithExistanceCheck(px, callback){
    let self = this;
      //check if px exists..
      if(!self.doesProcedureExist(px.code)){
        //add search result to list...
        self.addToGrid(px);
        if(callback){
          callback()
        }
      }else{
        //display alert...
        self.displayExistingPxAlert(px, function(res){
          self.addToGrid(px);
          if(callback){
            callback()
          }
        });
      }
  }

  addToGrid(px){
    let self = this;
    //add search result to list...
    let pxDate = moment(self.date).format('MM/DD/YYYY');
    // px.date = pxDate;
    // px.selected = true;

    var data={
      "Type": px.data.Type,
      "ProcedureID": px.data.ProcedureID
    }

    var aPx = self.goData.getNewPx(0, px.code, px.description, pxDate, data);
    aPx.selected = true;
    aPx.modifier = px.modifier;
    aPx.type = px.data.Type;
    
    if(self.data.length > 0){
      self.data.splice(0,0,aPx);
    }else{
      self.data.push(aPx);
    }
    self.updateRowIndexes();
  }

  unitClicked(px){
    let self = this;
    let act={
      "value": px.data.JCodeUnits
    }
    self.dialogService.open({viewModel: Calculator, model: {activity: act}}).whenClosed(response => {

      px.data.JCodeUnits = response.output.value;
      px.selected = true;
      // activitySelected.value = response.output.value;
      // activitySelected.actPass = response.output.actPass;
      // activitySelected.backgroundColor = response.output.backgroundColor;
      self.save();
    });
  }

  modifierClick(px){
    let self = this;
    self.selectModifiersWithModiferString(px.modifier);
    self.popupHelper.openGenericMultiTabPickerPopup("Select a modifier", "Modifier", self.modlist, false, function(res){
      let r = res;
      let modStr = "";
      for(let i = 0; i < res.items.length; i++){
        modStr += res.items[i].description + ",";
      }
      if(modStr.length > 0){
        modStr = modStr.substring(0, modStr.length - 1);
      }
      px.modifier = modStr;
      px.selected = true;

      self.save()
    });
  }

  detached(){
    this.trySave();
  }

  trySave(){
    var self = this;

    if(self.block.dontSave){
      return;
    }

    if(self.board != null) {
      self.home.saveQueue.addItem(self);
    }
  }


  load(){
    var self = this;

    self.data = [];

    var frmtDate = self.helper.getDateWithFormat(self.date, "MM-DD-YYYY");
    var url = `patientprocedures/patients/${self.patientId}/todate/${frmtDate}`;
    //var url = `patientprocedures/patients/${self.patientId}`;
    self.http.get(self.helper.getApiUrl(url), function (res) {

      if(res == undefined || res == null)return;

      let todayDate = moment(self.date).format('MM/DD/YY');

      var list=[];
      var todaysPxs=[];

      //find todays procedures...
      var tPxs = _.filter(res, function(t){return self.helper.getISODateToFormat(t.ExamDateTime, "MM/DD/YY") == todayDate});
      for(let p = 0; p < tPxs.length; p++){
        var m = tPxs[p];
        var aPx = self.goData.getNewPx(m.PatientCPTID, m.CptCode, m.CodeDescr,self.helper.getISODateToFormat(m.ExamDateTime, "MM/DD/YYYY"), m);
        aPx.displayPlus = false;
        aPx.historical = false;
        aPx.type = m.Type;
        aPx.index = list.length;

        if(m.ProviderID != self.providerId){
          aPx.historical = true;
        }

        list.push(aPx);
      }

      //get uniques...
      var uniqs = _.uniqBy(res, 'CptCode');
      for(var u = 0; u < uniqs.length; u++){
        //does it exist already in list??
        var found = _.find(list, function(f){return f.code == uniqs[u].CptCode});
        if(!found){
          //add to list...
          var aPx = self.goData.getNewPx(uniqs[u].PatientCPTID, uniqs[u].CptCode, uniqs[u].CodeDescr,self.helper.getISODateToFormat(uniqs[u].ExamDateTime, "MM/DD/YYYY"), uniqs[u]);
          aPx.displayPlus = true;
          aPx.historical = true;
          aPx.type = uniqs[u].Type;
          aPx.index = list.length;

          // if(uniqs[u].ProviderID != self.providerId){
          //   aPx.isHistorical = true;
          // }

          list.push(aPx);
        }
      }

      // for(var i = 0; i < res.length; i++){
      //   var m = res[i];

      //   let dxDate = self.helper.getISODateToFormat(m.ExamDateTime, "MM/DD/YY");
      //   let isHistorical = todayDate != dxDate ? true : false;
      //   //disable px's from other providers...
      //   if(m.ProviderID != self.providerId){
      //     isHistorical = true;
      //   }

      //   var aPx = self.goData.getNewPx(m.PatientCPTID, m.CptCode, m.CodeDescr,self.helper.getISODateToFormat(m.ExamDateTime, "MM/DD/YYYY"), m);
      //   aPx.type = m.Type;
      //   aPx.historical = isHistorical;
      //   aPx.displayPlus = isHistorical;
      //   aPx.index=i;
      //   list.push(aPx);

      //   if(!isHistorical){
      //     //add to todaysDxs...
      //     todaysPxs.push(aPx);
      //   }
      // }

      self.data = list;

      //disable PLUS on all codes that have already been selected for today...
      // for(let i = 0; i < todaysPxs.length; i++){
      //   self.hidePlusInGridForCode(todaysPxs[i].code);
      // }

    });
  }

  pxChecked(dx){
    let self = this;
    let todayDate = moment(self.date).format('MM/DD/YY');
    if(self.doesProcedureExist(dx.code, todayDate, self.providerId)){
      self.displayExistingPxAlert(dx);
      return;
    }

    var aDx = self.createPxObject(dx);
    aDx.selected = true;
    aDx.historical = false;
    aDx.displayPlus = false;
    aDx.data.PatientCPTID = 0;
    aDx.type = dx.type;
    self.data.splice(0,0,aDx);

    self.hidePlusInGridForCode(aDx.code);

    self.savePxToDb(aDx, self.patientId, self.providerId, self.date, function(res){

      self.updateRowIdWithCodeAndDescription(res.PatientCPTID, res.CptCode, res.CodeDescr);

    });
  }

  updateRowIdWithCodeAndDescription(id, code, description){
    let self = this;
    for(let i = 0; i < self.data.length; i++){
      //update id in rows...
      var row = self.data[i];
      if(row.code == code && row.description == description){
        row.id = id;
        row.data.PatientCPTID = id;
        // row.data.PatientCPTID = id;
        // row.data.PatientCPTID = id;
        break
      }
    }
  }

  createPxObject(dx){
    var self = this;
    var aDx = {
      "id": 0,
      "code": dx.code,
      "description": dx.description,
      "date": self.helper.getDateWithFormat(self.date, "MM/DD/YY"),
      "data": dx.data,
      "selected": true
    };
    if(dx.modifier){
      aDx.modifier = dx.modifier;
    }else if(dx.data.Modifier){
      aDx.modifier = dx.data.Modifier;
    }
    return aDx;
  }

  hidePlusInGridForCode(pxCode){
    let self = this;
    for(let i = 0; i < self.data.length; i++){
      if(self.data[i].code == pxCode){
        self.data[i].displayPlus = false;
      }
    }
  }
  
  save(callback){
    var self = this;
    let selectedPxs =  _.filter(self.data, function(p){return p.selected === true});
    if(selectedPxs.length == 0){
      callback(true);
    }

    for(var i = 0; i < selectedPxs.length; i++){
      let aPx = selectedPxs[i];
      aPx.bodypart = self.bodypart;
      aPx.bodyside = self.bodyside;
      aPx.selected = false;

      self.savePxToDb(aPx, self.patientId, self.providerId, self.date, function(res){

        aPx.data = res;
        aPx.id = res.PatientCPTID;

        if(aPx.type != null && aPx.type.toUpperCase() == 'VISIT'){
          //SAVE VISIT CODE HERE...
          self.board.visitInfo.visitCode.Visit_Code_Selected = res.CptCode;
          self.goData.updateVisitCode(self.board.visitInfo.visitCode, function(vcRes){
            self.board.visitInfo.visitCode = vcRes;
          });
        }

        if(callback)
          callback(true);
      });
    };
  }

  savePxToDb(px, patientId, providerId, date, callback){
    let self = this;
    self.goData.saveProcedure(px, patientId, providerId, date, function(res){
      if(callback)
        callback(res);
    });
  }

  displayAlert(text, header, buttonDescriptionArray, callback, template, alertType) {
    let self = this;
    self.popupHelper.openGenericMessagePop(text, header, buttonDescriptionArray, false, function(res){
      if(callback){
        callback(res);
      }
    }, {htmlTemplate: template, alertType: alertType});
  }

  isPxDeletable(row){
    //check and see if row date == today...
    let today = moment().format('MM/DD/YYYY');
    let pxDate = moment(row.date).format('MM/DD/YYYY');
    return today == pxDate ? true : false;
  }

  rowSwipe(event, row) {
    if (event.direction === 'left') {
      //display delete option...
      if(!row.displayDelete && this.isPxDeletable(row)){
        row.displayDelete = true;
        this.displayDeleteHeader = true;
      }else{
        this.displayAlert("You cannot delete a historical procedure.", 'Deletion Not Allowed!', ['OK']);
      }
    }else if(event.direction === 'right') {
      //display delete option...
      if(row.displayDelete){
        row.displayDelete = false;
        this.displayDeleteHeader = false;
      }
    }
  }

  displayDeleteAlert(text, header, callback) {
    let self = this;
    self.popupHelper.openGenericMessagePop(text, header, ['YES','NO'], false, function(res){
      callback(res);
    });
  }

  deletePxClick(index){
    let self = this;
    self.displayDeleteAlert("Do you wish to delete this procedure?", 'Delete Procedure?', function(res){
      if(res.result== 'YES'){
        let id = self.data[index].id;
        if(id==0){
          self.data.splice(index, 1);
          self.updateRowIndexes();
        }else{
          self.deleteProcedure(self.data[index], function(res){
            if(res == true){
              self.data.splice(index, 1);
              self.updateRowIndexes();
            }
          })
        }
      }else{
        //reset row delete...
        self.data[index].displayDelete = false;
      }
    });
  }

  deleteProcedure(px, callback){
    let self = this;
    let url = `patientprocedures/${px.id}`;
    self.goData.deleteWithUrl(url, function(res){

      let strDate = moment(px.date).format('MM-DD-YYYY');

      self.deleteOrderWithPatientIdCodeAndDate(self.patientId, px.code, strDate, function(pxRes){

        callback(res);
      })
    });
  }

  deleteOrderWithPatientIdCodeAndDate(patientId, code, date, callback){
    let self = this;
    let geturl = `laborder?patientId=${patientId}&code=${code}&date=${date}`;
    self.goData.getWithUrl(geturl, function(getRes){
      if(getRes){
        let delUrl = `laborders?id=${getRes.LabReqID}`;
        self.goData.deleteWithUrl(delUrl, function(delRes){

          self.refreshOrders();
          callback(delRes);      
        });
      }else{
        callback(false);
      }
    });
  }

  refreshOrders(){
    let self = this;
    self.eventAggregator.publish("refreshOrders");
  }

  updateRowIndexes(){
    let self= this;
    for(let i = 0; i< self.data.length; i++){
      let r = self.data[i];
      r.index = i;
    }
    self.signaler.signal('refresh-row');
  }

}
