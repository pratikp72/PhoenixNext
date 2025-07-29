import {helper} from '../helpers/helper';
import {inject, observable} from 'aurelia-framework';
import {Data} from '../data/go/data';
import $, { data } from 'jquery';
import {EventAggregator} from 'aurelia-event-aggregator';
import {formhelper} from './formhelper';
import * as _ from 'lodash';
import { PopupHelper } from '../go/popupHelper';
import moment from 'moment';
import html2canvas from 'html2canvas';
import {DialogService} from 'aurelia-dialog';
import * as XLSX from 'xlsx/xlsx.mjs';
// import { printHelper } from './printHelper';

// class ReportingColumn {
//   constructor(data){
//     this.data=data;
//     this.selected = false;
//   }
// }

@inject(helper, Data, EventAggregator, formhelper, PopupHelper, DialogService)
export class Viewer {

  form=null;
  providerId=null;
  patientId=null;
  date=null;
  @observable formId=null;
  formIdChanged(newVal, oldVal){
    var t = newVal;
  }
  instanceId=null;
  itemsToPopulate=[];
  prefId=null;

  pageWidth=816;
  pageHeight=1056;
  //isLandscape = false;
  isComplete = false;
  completionList=[];
  hasRequiredItems;

  //submitButtonHeader=false;
 // showToolbar=false;
  showSubmitAsToolbar=false;
  showSubmit=true;
  showPreferenceToolbar=false;
  showPreferenceToolbarSave=false;
  showReportToolbar=false;
  //showSettings=true;

  reportData=null;
  reportSettings=null;
  mappedDataRows=null;
  reportColumnFriendlyNames=[];

  preferences=[];
  @observable selectedPreference=null;
  selectedPreferenceChanged(newVal, oldVal){
    //load pref here!!
    this.getGoPrefData(newVal);
  }

  blockInstanceId;
  fullWidth=false;
  scrollHeight=0;
  fromPrevious=false;
  fromPreviousNewProviderId;

  constructor(helper, Data, EventAggregator, formhelper, PopupHelper, DialogService){
    this.helper = helper;
    this.data = Data;
    this.ea = EventAggregator;
    this.formhelper = formhelper;
    this.popupHelper = PopupHelper;
    this.dialogService =DialogService;
  }

  // bind(bindingContext, overrideContext){
  //   var test = bindingContext;
  // }

  silentSave(params, callback){
    let self = this;
    //fromPrevious, instanceId, date

    //grab incoming date for possible previous save...
    let incomingDate;
    if(params.hasOwnProperty('date')){
      incomingDate = params.date;
    }

    self.initProperties(params);
    self.loadViewer(self.formId, self.instanceId, self.reportData, function(res){
      //save here...
      //check for previous saving...
      if(self.fromPrevious && incomingDate){
        //update date to incoming visit date...
        self.date = incomingDate;
      }
      self.saveAsGoForm(function(res){
        callback(res);
      });
    });
  }

  initProperties(params){
    let self = this;
    if(params.hasOwnProperty('blockInstanceId') && !self.blockInstanceId){
      self.blockInstanceId = params.blockInstanceId;
    }

    if(params.hasOwnProperty('formId')){
      self.formId = params.formId;
    }
    if(params.hasOwnProperty('reportData')){
      self.reportData = params.reportData;
    }
    if(params.hasOwnProperty('reportSettings')){

      self.reportSettings = params.reportSettings;

      //self.isLandscape = report.PaperOrientation == 'Landscape' ? true : false;
      if(self.reportSettings.PaperOrientation == 'Landscape'){
        var tWidth = self.pageHeight;
        var tHeight = self.pageWidth;
        self.pageHeight = tHeight;
        self.pageWidth = tWidth;
      }
    }
    if(params.hasOwnProperty('instanceId')){
      self.instanceId = params.instanceId;
    }
    if(params.hasOwnProperty('patientId')){
      self.patientId = params.patientId;
    }
    if(params.hasOwnProperty('providerId')){
      self.providerId = params.providerId;
    }
    if(params.hasOwnProperty('date')){
      self.date = params.date;
    }
    // if(params.hasOwnProperty('showToolbar')){
    //   self.showToolbar = params.showToolbar;
    // }
    if(params.hasOwnProperty('showSubmitAsToolbar')){
      self.showSubmitAsToolbar = params.showSubmitAsToolbar;
    }
    if(params.hasOwnProperty('showReportToolbar')){
      self.showReportToolbar = params.showReportToolbar;
    }
    if(params.hasOwnProperty('showSubmit')){
      self.showSubmit = params.showSubmit;
    }
    if(params.hasOwnProperty('showPreferenceToolbar')){
      self.showPreferenceToolbar = params.showPreferenceToolbar;
    }
    if(params.hasOwnProperty('showPreferenceToolbarSave')){
      self.showPreferenceToolbarSave = params.showPreferenceToolbarSave;
    }
    if(params.hasOwnProperty('prefId')){
      self.prefId = params.prefId;
      self.showPreferenceToolbar = true;
      // self.loadProviderPreferences(self.providerId, self.formId);
    }
    if(params.hasOwnProperty('fromPrevious')){
      self.fromPrevious = true;
    }
    if(params.hasOwnProperty('fromPreviousNewProviderId')){
      self.fromPreviousNewProviderId = params.fromPreviousNewProviderId;
    }
  }

  activate(params) {
    let self = this;
    self.formhelper.setupFonts();

    // setInterval(function(){
    //   console.log(`FormId: "${ self.formId}`);
    // }, 20000)

    self.ea.subscribe("refresh-goform-viewer", function(vm){

      if(self.blockInstanceId && self.blockInstanceId != vm.blockInstanceId){
        return;
      }

      self.formId = vm.formId;
      self.patientId = vm.patientId;
      self.providerId = vm.providerId;
      self.date = vm.date;
      self.instanceId = vm.instanceId;
      //self.showSubmit = vm.showSubmit;

      self.loadViewer(self.formId, self.instanceId, self.reportData);

    });

    self.initProperties(params);

    if(self.showPreferenceToolbar && self.providerId && self.formId){
      self.loadProviderPreferences(self.providerId, self.formId);
    }

    if(self.helper.jwt() === 'undefined' ||
      self.helper.jwt() == null){
      //if we find an API key in the query string
      //we need to re-authenticate to make sure it is still valid
      if (params.hasOwnProperty("jwt")){
        this.helper.processToken(params.jwt);
      }
    }

    self.ea.subscribe('checkComplete', item=>{

      //have we already checked for required items???
      if(self.hasRequiredItems == false){
        //if we dont have any required items, return...
        self.isComplete =true;
        return;
      }

      //check for required items...
      if(self.hasRequiredItems == undefined && self.form){
        self.hasRequiredItems = self.checkForRequiredItems();
      }

      if(!self.hasRequiredItems){
        //if we dont have any, return...
        self.isComplete =true;
        return;
      }

      self.addItemToCompletionList(item);
      //loop through all items and check if required items are complete...
      var tComplete = false;
      var pages = self.form.pages;
      for(var p = 0; p < pages.length; p++){
        var page = pages[p];
        for(var i = 0; i < page.items.length; i++){
          var itm = page.items[i];
          if(itm.required){
            //is it in completion list???
            var found = _.find(self.completionList, function(item){return item.id === itm.id});
            tComplete = found ? true : false;
            if(!tComplete){
              break;
            }
          }
        }
      }

      self.isComplete = tComplete;

    });
  }

  checkForRequiredItems(){
    let self = this;
    var pages = self.form.pages;
    for(var p = 0; p < pages.length; p++){
      var page = pages[p];
      for(var i = 0; i < page.items.length; i++){
        var itm = page.items[i];
        if(itm.required){
          return true;
        }
      }
    }
    return false;
  }

  addItemToCompletionList(item){
    var itemExist = false;
    for(let i = 0; i < this.completionList.length; i++){
      if(this.completionList[i].id === item.id){
        itemExist = true;
        break;
      }
    }
    if(!itemExist){
      this.completionList.push(item);
    }
  }

  attached() {
    let self = this;
    self.loadViewer(self.formId, self.instanceId, self.reportData);

    //get scroll height
    self.scrollHeight= document.documentElement.clientHeight - 57;
  }

  loadViewer(formId, instanceId, reportData, callback){
    let self = this;
    if(reportData){
      self.createReportForm(reportData, self.reportSettings);
    }else if(instanceId){
      self.loadWithInstanceId(instanceId, function(frm){
        self.ea.publish('goform-viewer-loaded', {"form": frm, "blockInstanceId": self.blockInstanceId});
        if(callback){
          callback(frm);
        }
      });
    }else if(formId){
      self.loadWithFormId(formId, function(frm){
        self.ea.publish('goform-viewer-loaded', {"form": frm, "blockInstanceId": self.blockInstanceId});
        if(callback){
          callback(frm);
        }
      });
    }
  }

  setPageSize(viewerOrPdf){
    if(viewerOrPdf === 'pdf'){
      this.pageWidth ='100%';
      this.pageHeight ='100%';
    }else{
      //viewer
      this.pageWidth='816px';
      this.pageHeight='1056px';
    }
  }

  loadWithFormId(formId, callback){
    var formUrl = `goforms?id=${formId}`;
    this._load(formUrl, function(frm){
      if(callback){
        callback(frm);
      }
    });
  }

  loadWithInstanceId(instanceId, callback){
    let self = this;
    var instUrl = `goforms/instance?id=${instanceId}`;
    self._load(instUrl, function(frm){
      if(callback){
        callback(frm);
      }
    });
  }

  _load(url, callback){
    let self = this;
    self.data.getWithUrl(url, function(frm){

      //is this an instance or a form???
      var json = null;
      if(frm.hasOwnProperty('Json')){
        json = frm.Json;
      }else{
        json = frm.OD_GO_Forms.Json;
        self.patientId = frm.PatientID;
        self.providerId = frm.ProviderId;
        // self.date =  frm.Date;    
        //parse date from instance...
        var timestamp = Date.parse(frm.Date);
        var aDate = new Date(timestamp);
        self.date = self.helper.getMMDDYYYYDateWithDate(aDate);
      }

      var obj = JSON.parse(json);  


      var frmObj = self.formhelper.getNewForm();
      frmObj.id = self.formId;
      frmObj.name = frm.Description;
      frmObj.providerId = self.providerId;
      frmObj.type = frm.Type ? frm.Type : frm.OD_GO_Forms.Type;


      //check for fullWidth form...
      if(obj.hasOwnProperty("fullWidth")){
        self.fullWidth = obj.fullWidth;
      }

      //is this a preference??
      var prefTable = null;
      var ogPrefId = null;
      if(obj.hasOwnProperty('ogPreferenceId') &&
        obj.ogPreferenceId != null){
          ogPrefId = obj.ogPreferenceId;
          prefTable = obj.ogPreferenceTable;
      }

      var pages =  obj.constructor === Array ? obj : obj.pages;

      var totalFormTableCellCount=0;

      //deselect items...
      for(var p = 0; p < pages.length; p++){
        var page = pages[p];
        for(var i = 0; i < page.items.length; i++){
          var itm = page.items[i];

          //set fullWidth page here...
          if(self.fullWidth && self.viewerHeader && self.viewerHeader.parentElement){
            self.pageWidth = self.viewerHeader.parentElement.clientWidth + "px";
          }

          itm.selected = false;
          itm.editMode = false;

          if(itm.toolType == 'MYTABLE'){

            //check for repeater here???
            if(itm.table.isRepeater){

              self.formhelper.buildMyTableObjectDataWithItem(frmObj, itm, totalFormTableCellCount, function(res){
                itm.table = res.table;
                totalFormTableCellCount = res.totalCellCount;
              });

            }
            // else{
              //disable table items...
              for(var r = 0; r < itm.table.rows.length; r++){
                var aRow = itm.table.rows[r];
                for(var c = 0; c < aRow.cells.length; c++){
                  var aCell = aRow.cells[c];
                  aCell.selected = false;
                  if(aCell.item){
                    aCell.item.selected = false;
                    aCell.item.editMode = false;
                    aCell.item.disabled = false;
                    self.checkForSystemDateItem(aCell.item);
                  }
                }
              }
          }else{
            itm.addBoxClass= true;
            if(itm.dataColumn){
              itm.disabled = !itm.dataColumn.editable ? true : false;
            }else{
              itm.disabled = false;
            }
          }

          self.checkForSystemDateItem(itm);
        }
      }

      //populate elements if this is an instance...
      //if(self.instanceId != null || self.reportData != null){
        if(prefTable == null){
          self.getDataForElements(pages, frmObj, function(){
            frmObj.pages = pages;
            self.form = frmObj;
            if(callback){
              callback(frm);
            }
          });
        }else{
          self.getPrefDataForElements(pages, prefTable, ogPrefId);
          frmObj.pages = pages;
          self.form = frmObj;
          if(callback){
            callback(frm);
          }
        }
     // }


      //frmObj.pages = pages;


      // self.form = frmObj;
      // if(callback){
      //   callback(frm);
      // }
    });
  }

  reportStyleString(){
    return  `<style>.table {
         width: 100%;
         max-width: 100%;
         margin-bottom: 20px;
     }
     .table {
         background-color: transparent;
     }
     .table {
         border-collapse: collapse;
         border-spacing: 0;
     }
     .table {
         display: table;
         border-collapse: separate;
         box-sizing: border-box;
         text-indent: initial;
         border-spacing: 2px;
         border-color: grey;
     }</style>`
 }

  printReport(){
    var printwin = window.open("");
    let content = '<html><head>' + this.reportStyleString() + '</head><body>' + this.viewerHeader.innerHTML + '</body></html>';
    printwin.document.write(content);

    printwin.document.write('<script type="text/javascript">document.addEventListener("DOMContentLoaded", () => {window.print(); });</script>');
    printwin.document.close(); // necessary for IE >= 10
    printwin.focus(); // necessary for IE >= 10*/
  }

  exportReportToExcel(){
    //var x = XLSX;
    let self = this;
    var final=[];
    if(self.mappedDataRows){
      //scrub data for excel export...
      for(var i = 0; i < self.mappedDataRows.length; i++){
        var aRow = {};
        for(var t = 0; t < self.mappedDataRows[i].length; t++){
          // aRow[self.mappedDataRows[i][t].columnName]=self.mappedDataRows[i][t].value;
          aRow[self.reportColumnFriendlyNames[t]]=self.mappedDataRows[i][t].value;
        }
        final.push(aRow);
      }

      const worksheet = XLSX.utils.json_to_sheet(final);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Form");

      var kys = Object.keys(final[0]);
      //var vals = Object.values(final);

      /* create !cols array if it does not exist */
      if(!worksheet["!cols"]) worksheet["!cols"] = [];

      for(var c = 0; c < kys.length; c++){
        const max_width = final.reduce((w, r) => Math.max(w, r[kys[c]].length), 10);

      /* create column metadata object if it does not exist */
      //if(!worksheet["!cols"][c]) worksheet["!cols"][COL_INDEX] = {wch: 8};

        worksheet["!cols"][c] =  { wch: max_width } ;
      }



      // const max_width = final.reduce((w, r) => Math.max(w, r.name.length), 10);
      // worksheet["!cols"] = [ { wch: max_width } ];


      XLSX.writeFile(workbook, "Form.xlsx", { compression: true });
    }
  }

  buildChart(page, form, data, settings){


    var title = this.formhelper.getNewItem(this.formhelper.generateItemIdWithForm(form), 
    null, 0, 30, '100%', 50, 'STATICTEXT');
    title.html = `<div style="font-size:30pt; text-align: center;">${settings.ReportTitle}</div>`;
    title.textRows=1;
    title.inputType='text';
    title.editMode = false;
    page.items.push(title);


    var sub = this.formhelper.getNewItem(this.formhelper.generateItemIdWithForm(form), 
      null, 0, 80, '100%', 40, 'STATICTEXT');
    sub.html = `<div style="font-size:16pt; text-align: center;">${settings.ReportSubTitle}</div>`;
    sub.textRows=1;
    sub.inputType='text';
    sub.editMode = false;
    page.items.push(sub);


    var chart = this.formhelper.getNewItem(this.formhelper.generateItemIdWithForm(form), 
                                            null, 10, 130, 500, 500, settings.Json.toolType);//x, y, width, height from settings???
    
    chart.editMode = false;
    
    chart.data = this.formhelper.getNewChartData(settings.Json.chartJsConfig.type, settings.Json.chartJsConfig.data, settings.Json.chartJsConfig.options);
    page.items.push(chart);

  }

  createReportForm(data, settings){

    //var data = JSON.parse(strData);

    var kys = data.length > 0 ? Object.keys(data[0]) : null;

    //create new form...
    var newForm = this.formhelper.getNewForm();
    //newForm.id = data.Id;
    newForm.name =settings.ReportName;// "New Report";
    newForm.type = "REPORT";
    // newForm.maturityDays = data.MaturityDays;
    // newForm.ogPreferenceId = json.ogPreferenceId;
    // newForm.ogPreferenceTable = json.ogPreferenceTable;
    // newForm.tag = data.Tag;
    // newForm.fullWidth = json.hasOwnProperty("fullWidth") ? json.fullWidth : false;

    //create page...
    var newPage = this.formhelper.getNewPage();
    newPage.id = 0;
    newPage.index = 0;


    //check for chart here...
    if(settings.Json){
      //this is a chart...
      this.buildChart(newPage, newForm, data, settings);

      newForm.addPage(newPage, 0);
      //select first page...
      newForm.selectPage(0);
      this.form = newForm;

    }else{
        //OG report...
        //add title and sub-header...
        var title = this.formhelper.getNewItem(this.formhelper.generateItemIdWithForm(newForm), 
        null, 0, 30, '100%', 50, 'STATICTEXT');
        title.html = `<div style="font-size:30pt; text-align: center;">${settings.ReportTitle}</div>`;
        title.textRows=1;
        title.inputType='text';
        title.editMode = false;
        // title.centerHorizontalToPage=true;
        newPage.items.push(title);


        var sub = this.formhelper.getNewItem(this.formhelper.generateItemIdWithForm(newForm), 
          null, 0, 80, '100%', 40, 'STATICTEXT');
        sub.html = `<div style="font-size:16pt; text-align: center;">${settings.ReportSubTitle}</div>`;
        sub.textRows=1;
        sub.inputType='text';
        sub.editMode = false;
        newPage.items.push(sub);

        this.form = newForm;

        //add table...
        if(kys != null){
        var tbl = this.createReportTable(newForm, kys);
        newPage.items.push(tbl);
        }

        newForm.addPage(newPage, 0);

        //select first page...
        newForm.selectPage(0);
        this.form = newForm;

        if(kys != null){
          this.populateElementsWithReportData(data, newPage, this.form.pages);
        }
    }
  }

  createReportTable(form, colHeaders){
    let self = this;
    //var page = form.getCurrentPage();

    var name = "table";
    //bold headers hack...
    //get header names from extra datatable columns...
    var headersObj=[];
    var startHeaderIndex = colHeaders.length / 2;
    for(var h = startHeaderIndex; h < colHeaders.length; h++){
      headersObj.push({
        value: "<b>" +  colHeaders[h] + "</b>"
      })
      self.reportColumnFriendlyNames.push(colHeaders[h]);//add to array for possible excel export...
    }

    var dataItm = new self.formhelper.getNewItem(self.formhelper.generateItemIdWithForm(form),
                    name, 10, 130, self.pageWidth - 20, 150, self.formhelper.getTooltype("mytable"));
    dataItm.editMode = false;

    //build default table data...
    var newTable = this.formhelper.getNewTable();
    newTable.isRepeater = true;
    newTable.editMode = false;
    newTable.style = 'border: 1px solid grey; border-collapse: collapse; width: 100%';

    //add a header row...
    for(var i = 0; i < 1; i++){
      var aRow = this.formhelper.getNewTableRow();// MyTableRow();
      aRow.parent = newTable;

      //add column header cells...
      for(var c = 0; c < headersObj.length; c++){
        var cId = self.form.getUniqueTableCellId();
        var aCell = this.formhelper.getNewTableCell(cId);
        aCell.addStyle('border-top', '1px solid grey');
        aCell.addStyle('border-right', '1px solid grey');
        aCell.addStyle('border-bottom', '1px solid grey');
        aCell.addStyle('border-left', '1px solid grey');
        aCell.addStyle('border-collapse', 'collapse');
        aCell.addStyle('height', '20px');
        aCell.addStyle('overflow', 'hidden');

        aRow.addCell(aCell);
      }
      newTable.addRow(aRow);
    }



    self.addRepeatableRowWithTableAndReportDataRowNew(newTable, headersObj);

    //delete initial blank template row...
    newTable.deleteRow(0);

    dataItm.table = newTable;
    dataItm.dataColumn = {};

    return dataItm;
  }

  // getReportCenter(){
  //   var containerEl = document.getElementById("mainContainer");
  //   var distanceToTop = containerEl.getBoundingClientRect().top;
  //   var diff = distanceToTop < 0 ? 0 : distanceToTop;
  //   var windowHeight = document.documentElement.clientHeight;
  //   var x = containerEl.clientWidth / 2;
  //   // var y = windowHeight / 2;//distanceToTop;
  //   var y = (windowHeight / 2) - diff;
  //   return {X: x, Y:y};
  // }

  checkForSystemDateItem(item){
    if(item.dataColumn && item.dataColumn.isSystemDate){
      //populate with system date...
      item.value = moment().format('YYYY-MM-DD');
    }
  }

  getPrefDataForElements(pages, prefTable, prefId){
    let self = this;
    var els = [];
    self.itemsToPopulate=[];

    //extract ColumnInfo list from object...
    for(let p = 0; p < pages.length; p++){
      var aPage = pages[p];
      for(var i = 0; i < aPage.items.length; i++){
        var aItm = aPage.items[i];
        if(aItm.dataColumn && aItm.dataColumn.columnName){
          els.push(aItm.dataColumn);
          self.itemsToPopulate.push(aItm);
        }
      }
    }

    var url = `reportingcolumninfo/ogpref/elements?tablename=${prefTable}&id=${prefId}`;

    this.data.getWithUrl(url, function(res){
      self.populateElementsWithPreferenceData(res);
    });
  }

  loadProviderPreferences(providerId, formId){
    let self = this;
    self.data.getWithUrl(`goforms/pref?providerId=${providerId}&formId=${formId}`, function(res){
      self.preferences = res;
    });
  }

  // loadPreferenceWithId(id){
  //   let self = this;
  //   self.data.getWithUrl(`goforms/pref?id=${id}`, function(res){
  //     self.selectedPreference = res;
  //   });
  // }

  savePreference(){
    let self = this;
    if(self.selectedPreference){

      var saveObj = self.getGoPrefFormSaveObject();

      let saveDescription = `Saving ${self.selectedPreference.Description}...`;
      let saveDialog = self.helper.createNoty(saveDescription, 3000);
      saveDialog.show();

      self.data.putWithUrlAndData('goforms/pref', saveObj, function(res){

        //update pref in list...
        var prefIndex = _.findIndex(self.preferences, function(p){return p.Id == res.Id});
        //self.preferences[prefIndex]=res;
        self.preferences.splice(prefIndex, 1, res);

        saveDialog.close();
      });
    }
  }

  saveAsPreference(){
    let self = this;
    if(self.selectedPreference){

      self.popupHelper.openGenericInputPop("Create New Preference", ['Description'], null, false, function(res) {

        let prefName = res.inputs[0].value;

        var saveObj = self.getGoPrefFormSaveObject();
        saveObj.Description  = prefName;
        saveObj.Id = 0;

        let saveDescription = `Saving ${self.selectedPreference.Description}...`;
        let saveDialog = self.helper.createNoty(saveDescription, 3000);
        saveDialog.show();

        self.data.postWithUrlAndData('goforms/pref', JSON.stringify(saveObj), function(res){

          saveDialog.close();
        });

      });

    }
  }

  newPreference(){
    let self = this;
    self.popupHelper.openGenericInputPop("Create New Preference", ['Description'], null, false, function(res) {

      let prefName = res.inputs[0].value;

      var saveObj = self.getGoPrefFormSaveObject();
      saveObj.Description  = prefName;

      let saveDescription = `Saving ${prefName}...`;
      let saveDialog = self.helper.createNoty(saveDescription, 3000);
      saveDialog.show();

      self.data.postWithUrlAndData('goforms/pref', JSON.stringify(saveObj), function(res){

        //update currently selected preference object...
        self.selectedPreference = res;

        saveDialog.close();
      });

    });

  }

  getGoPrefData(pref){
    let self = this;

    var itemsToPopulate=[];

    for(let p = 0; p < self.form.pages.length; p++){
      var aPage = self.form.pages[p];
      for(var i = 0; i < aPage.items.length; i++){
        var aItm = aPage.items[i];

        //check for table...
        if(aItm.table){
          for(var r = 0; r < aItm.table.rows.length; r++){
            var aRow = aItm.table.rows[r];
            for(var c = 0; c < aRow.cells.length; c++){
              var aCell= aRow.cells[c];
              if(aCell.item){
                itemsToPopulate.push(aCell.item);
              }
            }
          }
        }else{
          itemsToPopulate.push(aItm);
        }
      }
    }

    self.populateElementsWithGoFormPreference(itemsToPopulate, pref);
  }

  getGoPrefFormSaveObject(){
    let self = this;

    if(!self.form || !self.providerId)return;

    let obj={
      "Id": self.selectedPreference ? self.selectedPreference.Id : 0,
      "Description": self.selectedPreference ? self.selectedPreference.Description : null,
      "ProviderId": self.providerId,
      "Json": null,
      "FormId": self.formId
    }

    let items=[];

    for(let p = 0; p < self.form.pages.length; p++){
      var aPage = self.form.pages[p];
      for(var i = 0; i < aPage.items.length; i++){
        var aItm = aPage.items[i];

        //check for table...
        if(aItm.table){
          for(var r = 0; r < aItm.table.rows.length; r++){
            var aRow = aItm.table.rows[r];
            for(var c = 0; c < aRow.cells.length; c++){
              var aCell= aRow.cells[c];
              if(aCell.item){
                items.push({itemId: aCell.item.id, value: aCell.item.value});
              }
            }
          }
        }else{
          items.push({itemId: aItm.id, value: aItm.value});
        }
      }
    }

    obj.Json = JSON.stringify(items);

    return obj;
  }

  getDataForElements(pages, formObj, callback){
    let self = this;
    var els = [];
    self.itemsToPopulate=[];

    //extract ColumnInfo list from object...convert to OD_ReportingColumnInfo...
    for(let p = 0; p < pages.length; p++){
      var aPage = pages[p];
      for(var i = 0; i < aPage.items.length; i++){
        var aItm = aPage.items[i];

        //check for table...
        if(aItm.table){
          for(var r = 0; r < aItm.table.rows.length; r++){
            var aRow = aItm.table.rows[r];
            for(var c = 0; c < aRow.cells.length; c++){
              var aCell= aRow.cells[c];
              if(aCell.item && aCell.item.dataColumn && aCell.item.dataColumn.columnName){

                var rci = self.GoFormDataColumnToReportingColumnInfo(aCell.item.dataColumn);

                // els.push(self.GoFormDataColumnToReportingColumnInfo(aCell.item.dataColumn));

                //check for repeater...
                if(aItm.table.isRepeater){
                  //add parentTable property to item...
                  aCell.item.parentTable = aItm.table;

                  //add repeater index to reportingColumnInfo...
                  //rci.RepeaterIndex = r;
                }

                self.itemsToPopulate.push(aCell.item);

                els.push(rci);
              }
            }
          }
        }else{
          if(aItm.dataColumn && aItm.dataColumn.columnName){
            els.push(self.GoFormDataColumnToReportingColumnInfo(aItm.dataColumn));
            self.itemsToPopulate.push(aItm);
          }
        }
      }
    }


    if(self.reportData){
      self.populateElementsWithReportData(self.reportData, aPage, pages);
      if(callback){
        callback();
      }
    }else{

      if(this.date == null){
        callback();
      }

      var simpleDate = self.helper.parseSimpleDate(this.date, 'MM-DD-YYYY');
      var strDate = self.helper.getMMDDYYYYDateWithDate(simpleDate);
  
      //var strDate = moment(this.date).format('MM-DD-YYYY');
      var url = 'reportingcolumninfo/elements/patient/static/and/customvalues';
      var elObj={
        'Elements': els,
        'Date': strDate,
        'TemplateType': '',
        'ProviderID': this.providerId,
        'PatientID': this.patientId,
        'FormInstanceId': this.instanceId
      }
  
      this.data.postWithUrlAndData(url, JSON.stringify(elObj), function(res){
        self.populateElementsWithData(res);
        if(callback){
          callback();
        }
      });
    }
  }

  GoFormDataColumnToReportingColumnInfo(dataColumn){
    return {
      ColumnID: dataColumn.id,
      Editable: dataColumn.editable,
      TableName: dataColumn.tableName,
      TableAlias: dataColumn.tableName,
      ColumnName: dataColumn.columnName,
      ColumnAlias: dataColumn.columnAlias,
      ColumnFriendlyName: dataColumn.columnName,
      DisplayType: dataColumn.displayType
    }
  }

  ReportingColumnInfoToGoFormDataColumn(rci){
    return {
      id: rci.ColumnID,
      name:rci.ColumnName,
      editable: rci.Editable,
      displayType: rci.DisplayType,
      listId:null,
      tableName: rci.TableName,
      columnName: rci.ColumnName,
      dataIdColumn:null,
      dataId:null,
      value:null,
      repeaterIndex: null,
      listOptions:[]
    }
    // return {
    //   ColumnID: dataColumn.id,
    //   Editable: dataColumn.editable,
    //   TableName: dataColumn.tableName,
    //   TableAlias: dataColumn.tableName,
    //   ColumnName: dataColumn.columnName,
    //   ColumnAlias: dataColumn.columnAlias,
    //   ColumnFriendlyName: dataColumn.columnName,
    //   DisplayType: dataColumn.displayType
    // }
  }

  populateElementsWithGoFormPreference(itemsToPopulate, pref){
    let self = this;

    var jsonItems = JSON.parse(pref.Json);

    for(let d = 0; d < jsonItems.length; d++){
      var dObj = jsonItems[d];
      //find items to populate...
      var itmToPopulate = _.find(itemsToPopulate, function(i){ return i.id == dObj.itemId});
      if(itmToPopulate){
        itmToPopulate.value =dObj.value;
      }
    }
  }

  populateElementsWithPreferenceData(pref){
    let self = this;
    for(let d = 0; d < pref.length; d++){
      var dObj = pref[d];
      //find items to populate...
      var itmToPopulate = _.find(self.itemsToPopulate, function(i){ return i.id == dObj.itemId});
      if(itmToPopulate){
        itmToPopulate.value =dObj.value;
      }
    }
  }

  populateElementsWithReportData(data, page, dataPages){
    let self = this;

    var tMyTableObject = null;

    self.mappedDataRows = [];

    var totalRowHeight = 0;
   // var tPageHeight = self.getPageHeight();
    var currentTableY = _.find(page.items, function(t){return t.name == 'table'});
    currentTableY = currentTableY.y;

    for(let d = 0; d < data.length; d++){
      var dObj = data[d];

      //find items to populate...
      var itmToPopulate;

      //map row object to array...
      var rowArray = Object
                    .entries(dObj)
                    .map(pair => Object.fromEntries([pair]));

      var mapRows = _.map(rowArray, function rob(i){
        return{
          tableName: Object.keys(i)[0].split('@')[0],
          columnName: Object.keys(i)[0].split('@')[1],
          value: Object.values(i)[0]
        }
      });

      mapRows = _.filter(mapRows, function(m){return m.columnName != null});
      self.mappedDataRows.push(mapRows);

      //get table...
      if(tMyTableObject == null){
        var tableData = _.find(page.items, function(i){
          return i.toolType == 'MYTABLE';
        });
        tMyTableObject = tableData.table;
      }

      //checlk if we need to add new page...
      if(totalRowHeight + currentTableY + (51*2) > self.pageHeight){
        //new page...
        var newPage = self.clonePageData(page);
        //add new page to dataPages...
        dataPages.push(newPage);
        //get newTable from newPage...
        var tTableData = _.find(newPage.items, function(t){return t.toolType == 'MYTABLE'});

        tMyTableObject = tTableData.table;
        //reset totalRowHeight
        totalRowHeight = 0;

        self.addRepeatableRowWithTableAndReportDataRowNew(tMyTableObject, mapRows);
        totalRowHeight += 51;
        
      }else{
        self.addRepeatableRowWithTableAndReportDataRowNew(tMyTableObject, mapRows);
        totalRowHeight += 51;
      }

    }
  }

  clonePageData(pageData){

    //get new page id...
    var newPageId = pageData.id.replace("p", "");
    newPageId = parseInt(newPageId);
    newPageId += 1;

    //get largest item id...
    var orderedItems = _.orderBy(pageData.items, "id", "desc");
    var newItmId = orderedItems[0].id;
    newItmId += 1;

    var newPage ={
      id:"p"+newPageId,
      items:[]
    }

    for(var i = 0; i < pageData.items.length; i++){
      var aItm = pageData.items[i];

      var newItm = this.formhelper.getNewItem(newItmId, 
        aItm.name, aItm.x, aItm.y, 
        aItm.width, aItm.height, 
        aItm.toolType);
        newItm.disabled = aItm.disabled;
        newItm.editMode = aItm.editMode;
        newItm.selected = aItm.selected;
        newItm.showToolbar = aItm.showToolbar;
        newItm.addBoxClass = aItm.addBoxClass;
        newItm.html = aItm.html;

        if(aItm.toolType == 'MYTABLE'){
          //clone MyTableObject...

          var myTable = this.copyMyTableObject(aItm.table);// this.copyMyTableObjectFirstTwoRows(aItm.table);
          newItm.table = myTable;
        }

        newPage.items.push(newItm);
        //increase item id...
        newItmId += 1;
    }

    return newPage;
  }

  copyMyTableObjectFirstTwoRows(table){

    var newTable = this.formhelper.getNewTable();

    newTable.data = table.data;
    newTable.displayHeaders = table.displayHeaders;
    newTable.editMode = table.editMode;
    newTable.isRepeater = table.isRepeater;
    newTable.style = table.style;

    //copy only first two rows (header and first data row)...
    for(var r = 0; r < 2; r++){
      var rCopy = this.copyTableRow(table.rows[r]);
      newTable.rows.push(rCopy);
    }
    return newTable;
  }

  copyMyTableObject(table){

    var newTable = this.formhelper.getNewTable();

    newTable.data = table.data;
    newTable.displayHeaders = table.displayHeaders;
    newTable.editMode = table.editMode;
    newTable.isRepeater = table.isRepeater;
    newTable.style = table.style;

    for(var r = 0; r < 1; r++){
      var rCopy = this.copyTableRow(table.rows[r]);
      newTable.rows.push(rCopy);
    }
    return newTable;
  }


  // getPageHeight(){
  //   return parseInt(this.pageHeight.replace("px", ""));
  // }
  

  populateElementsWithData(data){
    let self = this;
    for(let d = 0; d < data.length; d++){
      var dObj = data[d];

      //find items to populate...
      var itmToPopulate;

      if(!dObj.IsCustomValue){
        itmToPopulate = _.filter(self.itemsToPopulate, function(i){ 
          return i.dataColumn && 
          i.dataColumn.id === dObj.ColumnID &&
          i.dataColumn.tableName != "OD_GO_Forms_Custom_Values_Instance"
        });
      }else{
        itmToPopulate = _.filter(self.itemsToPopulate, function(i){ 
          return i.dataColumn && 
            i.dataColumn.id === dObj.ColumnID &&
            i.dataColumn.tableName == "OD_GO_Forms_Custom_Values_Instance"
        });
      }

      for(var i = 0; i < itmToPopulate.length; i++){
        var noData = dObj.Value.indexOf('NODATA');
        //if we have data...
        if(noData == -1){

          //check for parentTable and repeatable row...
          if(itmToPopulate[i].parentTable && dObj.RepeaterIndex != null){
            //do repeater here...
            self.addRepeatableRowWithItemAndDataObject(itmToPopulate[i], dObj);
          }else{
            //normal...
            itmToPopulate[i].value =dObj.Value;
            itmToPopulate[i].dataColumn.value = dObj.Value;
            itmToPopulate[i].dataColumn.dataId = dObj.DataID;
            itmToPopulate[i].dataColumn.dataIdColumn = dObj.DataIdColumn;
          }
        }
      }
    }
  }

  addRepeatableRowWithItemAndDataObject(item, dataObject){

    //check if row index exists...
    var rowToUpdate = item.parentTable.getRow(dataObject.RepeaterIndex);
    if(rowToUpdate){
      //row exists...
      var existingItem = this.findCellItemWithRowAndDataId(rowToUpdate, dataObject.ColumnID);
      existingItem.value =dataObject.Value;
      existingItem.dataColumn.value = dataObject.Value;
      existingItem.dataColumn.dataId = dataObject.DataID;
      existingItem.dataColumn.dataIdColumn = dataObject.DataIdColumn;

    }else{
      //row DOESNT exist, add new row...
      var rClone = item.parentTable.getRow(dataObject.RepeaterIndex - 1);
      rClone = rClone.cloneRow();
      //add row...
      item.parentTable.addRow(rClone);
      //find item in row to update...
      var itemToUpdate = this.findCellItemWithRowAndDataId(rClone, dataObject.ColumnID);
      itemToUpdate.value =dataObject.Value;
      itemToUpdate.dataColumn.value = dataObject.Value;
      itemToUpdate.dataColumn.dataId = dataObject.DataID;
      itemToUpdate.dataColumn.dataIdColumn = dataObject.DataIdColumn;
    }
  }


  addRepeatableRowWithTableAndReportDataRow(table, rowArray){

    // var rClone = item.parentTable.getRow(dataObject.RepeaterIndex - 1);
    var rClone = table.getRow(1);
    //rClone = rClone.cloneRow();

    //rClone = JSON.parse(JSON.stringify(rClone));
    rClone = this.copyTableRow(rClone);

    for(var i = 0; i < rowArray.length; i++){
      //find item in row to update...
      var itemToUpdate = this.findCellItemWithRowTableNameAndColumnName(rClone, rowArray[i].tableName, rowArray[i].columnName);
      itemToUpdate.value =rowArray[i].value;
      itemToUpdate.dataColumn.value = rowArray[i].value;

      itemToUpdate.style = 'Border: none;'
      // itemToUpdate.dataColumn.dataId = dataObject.DataID;
      // itemToUpdate.dataColumn.dataIdColumn = dataObject.DataIdColumn;
    }

    //add row...
    table.addRow(rClone);
  }

  addRepeatableRowWithTableAndReportDataRowNew(table, rowArray){

    var rClone = table.getRow(0);

    rClone = this.copyTableRow(rClone);

    for(var i = 0; i < rowArray.length; i++){
      //find item in row to update...
      var itemToUpdate = rClone.cells[i].item;
      //itemToUpdate.value =rowArray[i].value;
      itemToUpdate.html = rowArray[i].value;

      itemToUpdate.style = 'Border: none;'
    }

    //add row...
    table.addRow(rClone);
  }

  copyTableRow(row){
    var nRow = this.formhelper.getNewTableRow();
    nRow.display = true;
    nRow.selected = false;
    for(var c = 0; c < row.cells.length; c++){
      var cId = self.form.getUniqueTableCellId();
      var aCell = this.formhelper.getNewTableCell(cId);
      aCell.colspan = row.cells[c].colspan;
      aCell.index = row.cells[c].index;
      aCell.isHeader = row.cells[c].isHeader;
      aCell.selected = false;
      aCell.styleAsString = row.cells[c].styleAsString;
      var aItem = this.formhelper.getNewItem(this.formhelper.generateItemIdWithForm(this.form), 
        null, 0, 0, 
        'auto', 'auto', 
        'STATICTEXT');
        aItem.disabled = true;
        aItem.editMode = false;
        aItem.selected = false;
        aItem.showToolbar = false;
        aItem.addBoxClass = false;
        if(row.cells[c].item){
          aItem.html = row.cells[c].item.html;
        }

      aCell.item = aItem;
      nRow.cells.push(aCell);
    }
    return nRow;
  }



  findCellItemWithRowAndDataId(row, dataId){
    for(var c = 0; c < row.cells.length; c++){
      var aCell = row.cells[c];
      if(aCell.item && aCell.item.dataColumn && aCell.item.dataColumn.id == dataId){
        return aCell.item;
      }
    }
    return null;
  }

  findCellItemWithRowTableNameAndColumnName(row, tableName, columnName){
    for(var c = 0; c < row.cells.length; c++){
      var aCell = row.cells[c];
      if(aCell.item && 
        aCell.item.dataColumn && 
        aCell.item.dataColumn.tableName == tableName &&
        aCell.item.dataColumn.columnAlias == columnName){
        return aCell.item;
      }
    }
    return null;
  }


  doesPdfExist(patientId, date, docType, filename, callback){
    let self = this;
    var url = `document?patientId=${patientId}&date=${date}&docType=${docType}&filename=${filename}`;
    self.data.getWithUrl(url, function(res){
      callback(res);
    });
  }

  exportPdfToPatientHistory(){
    let self = this;

    var todaysDate = moment().format('MM-DD-YYYY');

      //save popup...
      let saveDescription = `Saving ${self.form.name}...`;
      let saveDialog = self.helper.createNoty(saveDescription, 3000, 'topLeft');
      saveDialog.show();

      var imageBytes=[];
      var pages = document.getElementsByClassName("page-container");
      var pagesToConvert = pages.length;
      for(let p = 0; p < pages.length; p++){

        //don't get style...
        var pageContent = pages[p].children[1];//this is a change

        html2canvas(pageContent).then(function(canvas) {//pages[p].firstChild
          var base64image = canvas.toDataURL("image/png");
          var split = base64image.split(',');
          imageBytes.push(split[1]);
          if(imageBytes.length == pagesToConvert){

            //save pdf...
            var imagesToPdf={
              'PatientId': self.patientId,
              'ProviderId': self.providerId,
              'Date': todaysDate,
              'UserId': self.helper._user.UserID,
              'DocumentName': self.form.name,
              'ImageBytes': imageBytes,
              'GoFormId': self.form.id//changed
            }
            var url = 'pdf/from/images';
      
            self.data.postWithUrlAndData(url, JSON.stringify(imagesToPdf), function(doc, err){
                
              if(err){
                self.helper.notyError(saveDialog, `${self.form.name} failed to save!`);
              }else{
                self.helper.notySuccess(saveDialog, `${self.form.name} saved!`);

                //try calling back to kiosk...
                window.top.postMessage('goFormSubmitted', '*');

                //try updating document tray...
                self.ea.publish('goFormPdfSaved', doc);
              }
            });
          }
        });
      }

  }

  saveAsGoForm(callback){
    let self = this;

    //save popup...
    let saveDescription = `Saving ${self.form.name}...`;
    let saveDialog = self.helper.createNoty(saveDescription, 3000);
    saveDialog.show();

    var itemsToSave=[];
    for(let p =0; p < self.form.pages.length; p++){
      var aPage = self.form.pages[p];
      for(let i = 0; i < aPage.items.length; i++){
        let aItm = aPage.items[i];

        if(aItm.table){
          //loop over table...
          for(var r = 0; r < aItm.table.rows.length; r++){
            var aRow = aItm.table.rows[r];
            for(var c = 0; c < aRow.cells.length; c++){
              var aCell= aRow.cells[c];
              if(aCell.item && 
                aCell.item.dataColumn && 
                aCell.item.dataColumn.columnName &&
                aCell.item.dataColumn.editable){
                  var cellItmToSave = aCell.item;
                  cellItmToSave.dataColumn.value=aCell.item.value;

                  //add repeater property???
                  // if(aItm.table.isRepeater){
                  //   cellItmToSave.dataColumn.repeaterIndex = r;
                  // }
                  if(aItm.table.isRepeater){
                    //are we displaying headers???
                    if(aItm.table.displayHeaders){
                      if(r != 0){//don't add header row index...
                        cellItmToSave.dataColumn.repeaterIndex = r;
                      }
                    }else{
                      cellItmToSave.dataColumn.repeaterIndex = r;
                    }
                  }

                  //try clearing out listOptions...
                  cellItmToSave.dataColumn.listOptions=[];

                  //previous??
                  if(self.fromPrevious){
                    cellItmToSave.dataColumn.dataId = null;
                  }

                  itemsToSave.push(cellItmToSave.dataColumn);
              }
            }
          }
        }else if(aItm.dataColumn && 
            aItm.dataColumn.columnName &&
            aItm.dataColumn.editable){

              let dataCol=null;
              //convert reportingcolumnINfo to goFormsDataCol...
              if(aItm.dataColumn.data && aItm.dataColumn.data.hasOwnProperty("ColumnID")){
                dataCol =self.ReportingColumnInfoToGoFormDataColumn(aItm.dataColumn.data);
              }else{
                dataCol =aItm.dataColumn;
              }

              dataCol.value = aItm.value;

              //previous??
              if(self.fromPrevious){
                cellItmToSave.dataColumn.dataId = null;
              }else{
                dataCol.dataId = aItm.dataColumn.dataId;
              }

              dataCol.dataIdColumn = aItm.dataColumn.dataIdColumn;
              dataCol.listId = aItm.dataColumn.listId;

              itemsToSave.push(dataCol);
            // var itmToSave = aItm;//.dataColumn;
            // //add value...
            // itmToSave.dataColumn.value=aItm.value;
            // itemsToSave.push(itmToSave.dataColumn);
          }
      }
    }

    var save={
      'PatientId': self.patientId,
      'ProviderId': self.fromPreviousNewProviderId ? self.fromPreviousNewProviderId : self.providerId,
      'Date': self.date,
      'Items':itemsToSave,
      'InstanceId': self.fromPrevious ? null : self.instanceId,
      'FormId': self.formId,
      'UserId': self.helper._user.UserID
    }
    var url = 'goforms/instance';

    self.data.putWithUrlAndData(url, save, function(res){
      if(!res){
        self.helper.notyError(saveDialog, `${self.form.name} failed to save!`);
      }else{
        self.helper.notySuccess(saveDialog, `${self.form.name} saved!`);
        self.instanceId = res.Id;

        self.ea.publish('goFormSaved', res);
      }
      if(callback){
        callback(res);
      }

    });
  }

  save(){
    let self = this;
    if(self.form && self.form.type != 'GO'){
      self.exportPdfToPatientHistory();
    }else{
      //go form...
      self.saveAsGoForm();
    }
  }

  showMigrateAssistant(){
    let self = this;
    // if(!self.selectedProvider){
    //   return;
    // }

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: PreferenceMigrationDialog, 
      model: {popupWidth: windowWidth, popupHeight: windowHeight, providerId: self.providerId}})
      .then(openDialogResult => {
        //self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){

      }
    });
  }
}
