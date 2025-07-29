import {helper} from '../helpers/helper';
import {inject, observable, computedFrom} from 'aurelia-framework';
import {Data} from '../data/go/data';
import $ from 'jquery';
import {EventAggregator} from 'aurelia-event-aggregator';
import {formhelper} from './formhelper';
import * as _ from 'lodash';
import { NewFormDialog } from './dialogs/newFormDialog';
//import { DatasetPickerDialog } from './dialogs/datasetPickerDialog';
import {DialogService} from 'aurelia-dialog';
import {PopupHelper} from '../go/popupHelper';
import { NewCustomValueDialog } from './dialogs/newCustomValueDialog';
//import { SqlSelector } from './dialogs/sqlSelector';
import { CustomSearchDialog } from './dialogs/customSearchDialog';



// class ReportingColumn {
//   constructor(data){
//     this.data=data;
//     this.name = null;
//     this.editable = false;
//     this.displayType=null;
//     this.listId=0;
//     this.selected = false;
//     this.id=null;
//   }
// }

class OGPref {
  constructor(name, data){
    this.data=data;
    this.name = name;
  }
}

class Category{
  constructor(data, name, id){
    this.items = [];
    this.data = data;
    this.name = name;
    this.collapseId = 'collapse' + id;
    this.dataTarget = '#collapse' + id;
    this.expanded = false;
    this.isCustom=false;
  }
}



@inject(helper, Data, EventAggregator, formhelper, DialogService, PopupHelper)
export class Editor {


  categories=[];
  categoriesReportingColumnInfo=[];
  categoriesCustomValues=[];

  selectedReportingColumnInfoData=null;
  selectedCategory=null;
  //displayTextToolbar=false;
  // toolbarTop = 0;
  // toolbarLeft = 0;
  sidebarExpanded=false;
  @observable form=null;
  forms=[];
  providers=[];
  @observable selectedProvider=null;

  barForms=true;
  barDatabase=false;
  barSelect=false;
  barFormsDisabled=false;
  barDatabaseDisabled=true;
  barSelectDisabled=true;

  marqueeSelected=false;

  isGoForm=false;

  showFormSettings=false;
  displayInNoteMenu="Display in Note Menu";
  displayInDocumentDropdown="Display in Document Tray";
  displayInPortalKiosk="Use in Portal / Kiosk preferences";

  @observable selectedItem=null;
  selectedItemChanged(newVal, oldVal){
    //check for table...
    if(oldVal && oldVal.toolType == 'MYTABLE'){
      //make sure table editMode=false;
      //disabled table edit mode....
      oldVal.table.editMode = false;
    }
  }
  // marqueeSelectedItems=[];

  @observable pageTop=null;

  bodyparts=[{part:'Ankle', table: 'OD_ANKLE_EXAM', prefTable: 'OD_ANKLE_PREF', idColumn:'AnkleID'},
            {part:'Knee', table: 'OD_KNEE_EXAM', prefTable: 'OD_KNEE_PREF', idColumn:'KneeID'},  
            {part:'Hip', table: 'OD_HIP_EXAM', prefTable: 'OD_HIP_PREF', idColumn:'HipID'}, 
            {part:'Wrist', table: 'OD_HAND_EXAM', prefTable: 'OD_HAND_PREF', idColumn:'HandID'}, 
            {part:'Elbow', table: 'OD_ELBOW_EXAM', prefTable: 'OD_ELBOW_PREF', idColumn:'ElbowID'}, 
            {part:'Shoulder', table: 'OD_SHOULDER_EXAM', prefTable: 'OD_SHOULDER_PREF', idColumn:'ShoulderID'}, 
            {part:'Lumbar', table: 'OD_LUMBAR_EXAM', prefTable: 'OD_LUMBAR_PREF', idColumn:'LumbarID'}];

  @observable selectedBodypart=null;
  selectedPrefSide="Right";
  ogPrefs=[];

  selectedDataTypeBase=true;


  // showTableCellOptions=false;
  tableCellOptionsData = null;

  constructor(helper, Data, EventAggregator, formhelper, DialogService, PopupHelper){
    this.helper = helper;
    this.data = Data;
    this.ea = EventAggregator;
    this.formhelper = formhelper;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
  }


  activate(params) {
    let self = this;
    self.loadReportingColumnInfoCategories();
    self.formhelper.setupFonts();
  }

  toggleFormSettings(){
    this.showFormSettings = this.showFormSettings ? false : true;
  }

  displayInNoteMenuClicked(){
    let self = this;
    if(self.form){
      self.form.displayInNoteMenu = self.form.displayInNoteMenu ? false : true;
    }
  }

  displayInExamDropdownClicked(){
    let self = this;
    if(self.form){
      self.form.displayInExamDropdown = self.form.displayInExamDropdown ? false : true;
    }
  }

  displayInPortalKioskClicked(){
    let self = this;
    if(self.form){
      self.form.displayInPortalKioskPreferences = self.form.displayInPortalKioskPreferences ? false : true;
    }
  }

  toggleSelectedDataType(){
    this.selectedDataTypeBase = this.selectedDataTypeBase ? false : true;
    if(!this.selectedDataTypeBase && this.categoriesCustomValues.length == 0){
      this.loadCustomValuesCategories();
    }else{
      this.categories = this.selectedDataTypeBase ? this.categoriesReportingColumnInfo : this.categoriesCustomValues;
    }
    this.tabClicked("database");
  }

  pageTopChanged(newVal, oldVal){
    var pageHeight = 1056;
    //calculate page index to select...
    //scrollHeight / pageHeight round down to get index
    var index = Math.floor(newVal / pageHeight);
    var currentPage = this.form.getCurrentPage();
    if(currentPage.index != index){
      console.log("PAGE INDEX: " + index);
      this.form.selectPage(index);
    }
  }

  formChanged(newVal, oldVal){
    if(newVal != null){
      this.barFormsDisabled=false;
      this.barDatabaseDisabled=false;
      this.barSelectDisabled=false;
      this.isGoForm = newVal.type == "GO" ? true : false;
    }
  }

  prefSideClicked(side){
    this.selectedPrefSide = side;
    this.loadOGPreferences(this.selectedBodypart, side);
  }

  selectedBodypartChanged(newVal, oldVal){
    this.loadOGPreferences(newVal, this.selectedPrefSide);
  }

  loadOGPreferences(bodypart, side){
    let self = this;

    self.ogPrefs=[];

    var url = `exam${bodypart.part}/preferences?providerId=${self.selectedProvider.ProviderID}&side=${side}`;
    self.data.getWithUrl(url, function(res){
      for(let i = 0; i < res.length; i++){
        var nameColumn = `${bodypart.part}ExamType`;
        var aPref = new OGPref(res[i][nameColumn], res[i]);
        self.ogPrefs.push(aPref);
      }
    });
  }

  selectedProviderChanged(newVal, oldVal){
    this.loadProviderForms(newVal.ProviderID);
  }

  blankForm(name, providerId, type){
    let self = this;
    var aForm = self.formhelper.getNewForm();
    aForm.name = name;
    aForm.type = type;
    aForm.id = 0;
    aForm.providerId = providerId;
    var aPage = self.formhelper.getNewPage();
    aPage.selected = true;
    aForm.addPage(aPage);
    self.form = aForm;
    self.forms.push(aForm);
    return aForm;
  }

  newForm(){
    let self = this;
    if(!self.selectedProvider){
      return;
    }

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: NewFormDialog, model: {popupWidth: windowWidth, popupHeight: windowHeight}})
      .then(openDialogResult => {
        //self.activeController = openDialogResult.controller;
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){
        var frm = self.blankForm(res.name, self.selectedProvider.ProviderID, res.type);
        self.selectForm(frm);
      }
    });
  }



  tryGetCustomValuesCategories(callback){
    let self =this;
    if(self.categoriesCustomValues.length == 0){
      self.loadCustomValuesCategories(function(res){
        callback(res);
      });
    }else{
      callback(self.categoriesCustomValues);
    }
  }

  openNewCustomValueDialog(options, callback){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    var listId = null;
    if(options && options.isList){
      listId = 0;
    }

    //check for options...
    var dialogOptions={};
    if(options){
      if(options.isCheckbox){
        dialogOptions.isCheckbox = options.isCheckbox;
      }
      if(options.isTextbox){
        dialogOptions.isTextbox = options.isTextbox;
      }
    }


    //get category list of names...
    self.tryGetCustomValuesCategories(function(customValueCategories){

      // var cats = _.filter(self.categories, function(r){return r.isCustom});
      var catNames =[];
      for(var i = 0 ; i < customValueCategories.length; i++){
        catNames.push(customValueCategories[i].name);
      }
  
      var datasetName = self.selectedCategory ? self.selectedCategory.name : null;
  
      self.dialogService.open({viewModel: NewCustomValueDialog, model: {popupWidth: windowWidth, popupHeight: windowHeight, datasetList: catNames, "datasetName": datasetName, options: dialogOptions}})
        .then(openDialogResult => {
          return openDialogResult.closeResult;
        }).then((response) => {
  
        let res = response.output;
  
        if(res != null){
          //save new custom value here...
          var customValue={
            Id:0,
            Dataset: res.dataset,
            Name: res.name,
            ListId:  listId,
            Bodypart: null,
            Datatype: res.datatype
          }
  
          self.data.postWithUrlAndData('customvalues', JSON.stringify(customValue), function(res){
  
            let rc = self.formhelper.getNewDataColumn(res);
            rc.name = res.Name;
            rc.editable = true;//set custom values editable...
            rc.listId = res.ListId;
            rc.id = res.Id;
            rc.displayType = res.Datatype;//'varchar';
            rc.tableName= 'OD_GO_Forms_Custom_Values_Instance';
            rc.columnName = 'Value';
            //category.items.push(rc);
  
            //does this exist in categories???
            var foundCat = _.find(self.categories, function(c){return c.name == res.Dataset});
            if(!foundCat){
              //add category...
              foundCat = new Category(res, res.Dataset, res.Id);
              foundCat.isCustom=true;
              self.categoriesCustomValues.push(foundCat);
              self.categories = self.categoriesCustomValues;
            }
  
            //add custom value to category...
            foundCat.items.push(rc);
  
            callback(rc);
  
          });
        }
      });


    });

  }

  // openDatasetPicker(callback){
  //   let self = this;

  //   const windowHeight = window.innerHeight;
  //   const windowWidth = window.innerWidth;

  //   self.dialogService.open({viewModel: DatasetPickerDialog, model: {popupWidth: windowWidth, popupHeight: windowHeight, editor: self}})
  //     .then(openDialogResult => {
  //       //self.activeController = openDialogResult.controller;
  //       return openDialogResult.closeResult;
  //     }).then((response) => {
  //     let res = response.output;
  //     if(res != null){
  //       // var frm = self.blankForm(res.name, self.selectedProvider.ProviderID, res.type);
  //       // self.selectForm(frm);
  //       callback(res);
  //     }
  //   });
  // }



  selectForm(form){
    for(let i = 0; i < this.forms.length; i++){
      if(this.forms[i].id === form.id){
        this.forms[i].selected = true;
        this.form = this.forms[i];
      }else{
        this.forms[i].selected = false;
      }
    }

    //reset maintoolbar here...???
    this.maintoolbar.au.controller.viewModel.reset();
  }

  getItem(){
    if(this.selectedItem){
      if(this.selectedItem.toolType == 'MYTABLE'){
        var aCell = this.selectedItem.table.getSelectedCell();
        if(aCell == undefined || aCell.item == null){
          return this.selectedItem;
        }else{
          return aCell.item;
        }
        //return aCell == undefined ? this.selectedItem : aCell.item;
      }else{
        return this.selectedItem;
      }
    }else{
      return null;
    }
  }

  updateItem(item){
    let self = this;

    var selectedItem = self.getItem();
    if(selectedItem.id == item.id){
      selectedItem.style = item.style;//start w/ style update...
      selectedItem.html = item.html;
      selectedItem.data = item.data;
      selectedItem.data = item.dataColumn;
    }

    var page = self.form.getCurrentPage();
    for(let i = 0; i < page.items.length; i++){
      var itm = page.items[i];
      if(itm.id == item.id){
       itm.style = item.style;//start w/ style update...
       itm.html = item.html;
       itm.data = item.data;
       itm.data = item.dataColumn;
        break;
      }
    }
  }


  updateRange(e){
    var self = this;

    if(!self.maintoolbar)return;

    var range = null;
    const selection = window.getSelection();

    if(selection.baseOffset == 0 && selection.rangeCount == 0 && selection.extentOffset == 0){
      self.maintoolbar.au.controller.viewModel.setTextToolbarRange(range);
      return;
    };

    range = selection.getRangeAt(0);
    self.maintoolbar.au.controller.viewModel.setTextToolbarRange(range);
  }

  toggleGrid(){
    this.ea.publish('toggleGrid');
  }

  deleteForm(){
    let self = this;
    if(self.form){
      var url = `goforms?id=${self.form.id}`;
      self.data.deleteWithUrl(url, function(deleted){
        if(deleted){
          var index = _.findIndex(self.forms, function(f){return f.id == self.form.id});
          if(index > -1){
            self.forms.splice(index, 1);
          }
        }
      });
    }
  }

  openCustomSearchDialog(mytable){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: CustomSearchDialog, model: {popupWidth: windowWidth, popupHeight: windowHeight, myTable: mytable}})
      .then(openDialogResult => {
        return openDialogResult.closeResult;
      }).then((response) => {
      let res = response.output;
      if(res != null){

      }
    });
  }


  attached() {
    let self = this;

    // self.popupHelper.openSqlSelector(function(sql){
    //   var s = sql;
    // }, null);

    //self.openCustomSearchDialog();

    self.loadProviders();

    self.ea.subscribe("showTableCellOptions", function(cellOptions){
      self.tableCellOptionsData = cellOptions;
    });

    self.ea.subscribe('selectionFinished', function(items){
      self.marqueeSelected = false;
      // self.marqueeSelectedItems = items;
    });

    self.ea.subscribe('deselectAll', function(){
      self.deselectAll();
      //hide tableCell toolbar...
      if(self.tableCellOptionsData){
        self.tableCellOptionsData.show=false;
      }

    });

    self.ea.subscribe("itemClicked", function(item){

      if(item.selected)return;

      //test cell parent...
      var isSelectedItemTable = false;
      if(self.selectedItem && self.selectedItem.table){
        isSelectedItemTable = true;
      }

      //check if we need to hide tableCell toolbar...
      if(item.table == null && !isSelectedItemTable){
        if(self.tableCellOptionsData){
          self.tableCellOptionsData.show=false;
        }
      }else if(item.table && self.tableCellOptionsData &&
                self.tableCellOptionsData.table != item.table){
        //we are selecting a different table, hide current tableCellOptions...
        self.tableCellOptionsData.show=false;
      }

      self.ea.publish('clearSelections');//clears the container...

      self.selectItem(item);
    });

    var imgPicker = document.getElementById('image-filepicker');
    imgPicker.onchange = () => {
      const imgFile = imgPicker.files[0];  
      // FileReader support
      if (FileReader && imgFile) {

        let saveDescription = `Loading ${imgFile.name}...`;
        let saveDialog = self.helper.createNoty(saveDescription, 3000);
        saveDialog.show();

        var fr = new FileReader();
        fr.onload = function () {
          self.addImage(function(img){
            var timeout = setTimeout(function(){
              //img.data.image = fr.result;
              img.dataColumn.image = fr.result;
              //get parent element of padding, to help with resizing of image...
              //var parentPadding = imgEl.parentElement.style.padding;
              //create new image (for size)
              var image = new Image();
              image.src = fr.result;
              image.onload=function(){

                saveDialog.close();

                img.width = this.width + 16;
                img.height = this.height + 16;
              }
            }, 1000);
          });
        }
        fr.readAsDataURL(imgFile);
      }   
      // Not supported
      else {
          // fallback -- perhaps submit the input to an iframe and temporarily store
          // them on the server until the user's session ends.
      }
    }
  }

  addTag(){
    let self = this;

    if(self.form.tag != null)return;

    self.popupHelper.openGenericInputPop("Add Tag", ['Description'], null, false, function(res) {

      let tagDesc = res.inputs[0].value;
      self.form.tag = tagDesc;

    });
  }

  deleteTag(){
    let self = this;

    if(self.form){
      self.form.tag = null;
    }
  }

  createPrefClick(pref){
    let self = this;
    self.createFormFromOGPref(pref, function(newForm){
      self.forms.push(newForm);
      self.selectForm(newForm);
    });
  }

  createFormFromOGPref(pref, callback){

    let self = this;

    if(!self.selectedBodypart){
      return;
    }

    const arbitraryItemsPerPage =10;
    var itemCount = 0;
    const itemWidth = 150;
    const itemHeight = 50;
    const positionIncrement = 10;
    var x = 10;
    var y = 0;
    var pageIndex = 0;


    var itemsToUse=[];
    var fullNames=[];
    var keys = Object.keys(pref.data);
    for(let i = 0; i < keys.length; i++){
      var val = pref.data[keys[i]];
      if(val != null){
        //use this item...
        itemsToUse.push({'column': keys[i], 'value': val});
        fullNames.push(`${self.selectedBodypart.table}.${keys[i]}`)
      }
    }

    var reportingData={
      'Fullnames': fullNames
    }
    //get reporting column info...
    var reportingurl = `reportingcolumninfo/OD_ReportingColumnInfo/fullnames`;
    self.data.postWithUrlAndData(reportingurl, JSON.stringify(reportingData), function(reportingColumnInfo){

      //create new form...
      var newForm = self.formhelper.getNewForm();
      newForm.id = 0;
      newForm.name = pref.name;
      newForm.providerId = self.selectedProvider.ProviderID;
      newForm.type = "GO";
      newForm.ogPreferenceId =  pref.data[self.selectedBodypart.idColumn];
      newForm.ogPreferenceTable = self.selectedBodypart.prefTable;
      //newForm.maturityDays = data.MaturityDays;

      var currentPage = self.formhelper.getNewPage();
      currentPage.id = "p"+ pageIndex + 1;
      currentPage.index = pageIndex;
      newForm.addPage(currentPage, pageIndex);
      pageIndex++;

      for(var i = 0; i < reportingColumnInfo.length; i++){


        if(itemCount == arbitraryItemsPerPage){
          //create new page here...
          currentPage = self.formhelper.getNewPage();
          currentPage.id = "p"+ pageIndex + 1;
          currentPage.index = pageIndex;
          newForm.addPage(currentPage, pageIndex);
          pageIndex++;
          itemCount = 0;
          x = positionIncrement;
          y = positionIncrement;
        }else{
          // //add to y...
          // y += itemHeight + positionIncrement;
        }


        var col = reportingColumnInfo[i];
        var tooltype = col.DisplayType == 'bit' ? self.formhelper.getTooltype('checkbox') : self.formhelper.getTooltype('textbox');
        var newItem = self.formhelper.getNewItem(i + 1, col.ColumnFriendlyName, x, y, itemWidth, itemHeight, tooltype);
        newItem.data = col;
        //newItem.html = aItm.html;
        //newItem.style = aItm.style ? aItm.style : null;
        //newItem.required = aItm.required;
        //newItem.inputType = aItm.inputType;

        currentPage.addItem(newItem);
        itemCount++;

        //add to y...
        y += itemHeight + positionIncrement;

      }

      //select first page...
      newForm.selectPage(0);
      //return newForm;
      callback(newForm);
    });
  }

  // tryAddDataIdToForm(item, form){
  //   if(item.dataColumn &&
  //     item.dataColumn.data){
  //       if(item.dataColumn.data.hasOwnProperty('ColumnID')){
  //         //add reportingColumnInfoId...
  //         form.addDataId(item.dataColumn.id, this.formhelper.FORMDATATYPES.REPORTINGCOLUMNINFO);
  //       }else{
  //         //add customFormId...
  //         form.addDataId(item.dataColumn.id, this.formhelper.FORMDATATYPES.GOFORMCUSTOMVALUE);
  //       }
  //   }
  // }

  createFormFromData(data){
    var json = JSON.parse(data.Json);

    // var pages = JSON.parse(data.Json);
    var pages =  json.constructor === Array ? json : json.pages;
    //create new form...
    var newForm = this.formhelper.getNewForm();
    newForm.id = data.Id;
    newForm.name = data.Description;
    newForm.providerId = data.ProviderId;
    newForm.type = data.Type;
    newForm.maturityDays = data.MaturityDays;
    newForm.ogPreferenceId = json.ogPreferenceId;
    newForm.ogPreferenceTable = json.ogPreferenceTable;
    newForm.tag = data.Tag;
    newForm.displayInNoteMenu = data.DisplayInNoteMenu ? data.DisplayInNoteMenu : false;
    newForm.displayInExamDropdown = data.DisplayInExamDropdown ? data.DisplayInExamDropdown : false;
    newForm.displayInPortalKioskPreferences = data.DisplayInPortalKioskPreferences ? data.DisplayInPortalKioskPreferences : false;
    newForm.primaryExam = data.PrimaryExam ? data.PrimaryExam : null;
    //newForm
    newForm.fullWidth = json.hasOwnProperty("fullWidth") ? json.fullWidth : false;

    var totalTableCellCountForForm=0;

    //create pages...
    for(let p = 0; p < pages.length; p++){
      var aPage = pages[p];
      var newPage = this.formhelper.getNewPage();
      newPage.id = aPage.id;
      newPage.index = p;

      //add items...
      for(let i = 0; i < aPage.items.length; i++){
        var aItm = aPage.items[i];

        //this.tryAddDataIdToForm(aItm, newForm);
        newForm.tryAddDataIdToFormWithItem(aItm);

        var newItem = this.formhelper.getNewItem(aItm.id, aItm.name, aItm.x, aItm.y, aItm.width, aItm.height, aItm.toolType);
        if(aItm.toolType == 'MYTABLE'){
          // newItem.table = this.formhelper.buildMyTableObjectDataWithItem(newForm, aItm);
          this.formhelper.buildMyTableObjectDataWithItem(newForm, aItm, totalTableCellCountForForm, function(res){
            newItem.table = res.table;
            totalTableCellCountForForm = res.totalCellCount;
          });
        }else{
          newItem.dataColumn = aItm.dataColumn;
        }
        newItem.html = aItm.html;
        newItem.style = aItm.style ? aItm.style : null;
        newItem.required = aItm.required;
        newItem.inputType = aItm.inputType;
        newItem.anchorLeft = aItm.anchorLeft;
        newItem.anchorRight = aItm.anchorRight;
        newItem.right = aItm.right;
        newItem.textRows = aItm.textRows;
        newPage.addItem(newItem);
        //add ids to form...
        newForm.ids.push(aItm.id);
      }
      newForm.addPage(newPage, p);
    }
    //select first page...
    newForm.selectPage(0);

    return newForm;
  }

  tabClicked(tab){
    switch(tab){
      case 'forms':
        this.barForms = true;
        this.barDatabase = false;
        this.barSelect = false;
        break;
      case 'database':
        this.barForms = false;
        this.barDatabase = true;
        this.barSelect = false;
        break;
      case 'select':
        this.barForms = false;
        this.barDatabase = false;
        this.barSelect = true;
        break;
    }
  }

  providerSelected(provider){
    this.selectedProvider = provider;
    //load forms here...
  }

  loadProviders(){
    let self = this;
    self.data.getProviders(false, function(pros){
      self.providers = pros;
      //add ALL provider...
      var all = {ProviderID: 0, ProviderEntity: 'All'}
      self.providers.splice(0, 0,all);
    });
  }

  loadProviderForms(providerId){
    let self = this;

    self.form = null;
    self.forms=[];
    self.selectedItem = null;

    var url = `goforms/provider?providerId=${providerId}`;
    self.data.getWithUrl(url, function(res){

      for(let f = 0; f < res.length; f++){
        var aForm = res[f];
        var newForm = self.createFormFromData(aForm);
        self.forms.push(newForm);
      }

      if(self.forms.length > 0){
        self.selectForm(self.forms[0]);
      }
    });
  }

  _cleanFormItemForSave(item){
    if(item.hasOwnProperty('selected')){
      delete item.selected;
    }
    // if(item.hasOwnProperty('elementId')){
    //   delete item.elementId;
    // }
    if(item.hasOwnProperty('disabled')){
      delete item.disabled;
    }

    if(item.hasOwnProperty('value')){
      delete item.value;
    }
    if(item.hasOwnProperty('showToolbar')){
      delete item.showToolbar;
    }
    if(item.hasOwnProperty('addBoxClass')){
      delete item.addBoxClass;
    }
    //check for dataColumn vs old data property...
    if((item.hasOwnProperty('dataColumn') && item.dataColumn != null)
      && item.hasOwnProperty('data')){
      delete item.data;
    }
  }

  getJsonSaveObject(){
    var self = this;

    if(self.form){

      var cForm = _.cloneDeep(self.form);

      if(cForm.hasOwnProperty('id')){
        delete cForm.id;
      }
      if(cForm.hasOwnProperty('dataIds')){
        delete cForm.dataIds;
      }
      if(cForm.hasOwnProperty('name')){
        delete cForm.name;
      }
      if(cForm.hasOwnProperty('providerId')){
        delete cForm.providerId;
      }

      if(cForm.hasOwnProperty('ids')){
        delete cForm.ids;
      }

      if(cForm.hasOwnProperty('selected')){
        delete cForm.selected;
      }

      for(var p = 0; p < cForm.pages.length; p++){
        var aPage = cForm.pages[p];
        if(aPage.hasOwnProperty('selected')){
          delete aPage.selected;
        }
        if(aPage.hasOwnProperty('index')){
          delete aPage.index;
        }


        for(var i = 0; i < aPage.items.length; i++){
          var aItm = aPage.items[i];

          // if(aItm.hasOwnProperty('selected')){
          //   delete aItm.selected;
          // }

          self._cleanFormItemForSave(aItm);

          if(aItm.toolType == 'MYTABLE'){
            var myTblObjClone = aItm.table.cloneForSave();

            if(myTblObjClone.hasOwnProperty('selected')){
              delete myTblObjClone.selected;
            }

            //remove table references...
            for(var r = 0; r < myTblObjClone.rows.length; r++){
              var aRow = myTblObjClone.rows[r];

              if(aRow.hasOwnProperty('selected')){
                delete aRow.selected;
              }

              for(var c = 0; c < aRow.cells.length; c++){
                var aCell= aRow.cells[c];

                if(aCell.hasOwnProperty('selected')){
                  delete aCell.selected;
                }

                //aCell.styleAsString=null;
                aCell.styles=null;
                if(aCell.item){

                  // if(aCell.item.hasOwnProperty('selected')){
                  //   delete aCell.item.selected;
                  // }
                  self._cleanFormItemForSave(aCell.item);

                  aCell.item.table = null;
                }
              }
            }
            aItm.table = myTblObjClone;
            aItm.html=null;
          }
        }
      }
      return JSON.stringify(cForm);
    }
    return null;

  }

  saveAs(){
    let self = this;
    if(self.form){

      self.popupHelper.openGenericInputPop("Save Form As...", ['Description'], null, false, function(res) {

        let saveDescription = `Saving As ${self.form.name}...`;
        let saveDialog = self.helper.createNoty(saveDescription, 3000);
        saveDialog.show();


        let saveAsName = res.inputs[0].value;
        var json = self.getJsonSaveObject();
        var url = 'goforms';
        self.data.getWithUrl(url, function(newForm){

          //save as new...
          newForm.ProviderId = self.form.providerId;
          newForm.Description = saveAsName;
          newForm.Type = self.form.type;
          newForm.Json = json;
          newForm.MaturityDays = self.form.maturityDays;
          newForm.DisplayInNoteMenu = self.form.displayInNoteMenu;
          newForm.DisplayInExamDropdown = self.form.displayInExamDropdown;
          newForm.DisplayInPortalKioskPreferences = self.form.displayInPortalKioskPreferences;
          newForm.PrimaryExam = self.form.primaryExam;
          
          self.data.postWithUrlAndData(url, JSON.stringify(newForm), function(save){
            //add new form to list and select...

            var final = self.createFormFromData(save);
            self.forms.push(final);
            self.form = final;
            self.selectForm(final);

            self.helper.notySuccess(saveDialog, `${saveAsName} saved!`);
          });
        });

      });
    }
  }






  save(){
    let self = this;
    if(self.form){

      let saveDescription = `Saving ${self.form.name}...`;
      let saveDialog = self.helper.createNoty(saveDescription, 3000);
      saveDialog.show();

      var json = self.getJsonSaveObject();

      var url = 'goforms';
      if(self.form.id === 0){
        //get new OD_GO_Forms object...
        self.data.getWithUrl(url, function(newForm){
          //save new...
          newForm.ProviderId = self.form.providerId;
          newForm.Description = self.form.name;
          newForm.Type = self.form.type;
          newForm.Json = json;
          newForm.MaturityDays = self.form.maturityDays;
          newForm.Tag = self.form.tag;
          newForm.DisplayInNoteMenu = self.form.displayInNoteMenu;
          newForm.DisplayInExamDropdown = self.form.displayInExamDropdown;
          newForm.DisplayInPortalKioskPreferences = self.form.displayInPortalKioskPreferences;
          newForm.PrimaryExam = self.form.primaryExam;
          
          self.data.postWithUrlAndData(url, JSON.stringify(newForm), function(s){
            self.form.id = s.Id;
            self.helper.notySuccess(saveDialog, `${self.form.name} saved!`);
          });
        });
      }else{
        //create update object ....
        var toUpdate={
          'Id': self.form.id,
          'Description': self.form.name,
          'ProviderId': self.form.providerId,
          'Json': json,
          'Type': self.form.type,
          'MaturityDays': self.form.maturityDays,
          'Tag': self.form.tag,
          'DisplayInNoteMenu': self.form.displayInNoteMenu,
          'DisplayInExamDropdown': self.form.displayInExamDropdown,
          'DisplayInPortalKioskPreferences': self.form.displayInPortalKioskPreferences,
          'PrimaryExam': self.form.primaryExam
        }

        //update...
        self.data.putWithUrlAndData(url, toUpdate, function(s){
          self.helper.notySuccess(saveDialog, `${self.form.name} saved!`);
        });
      }
    }
  }

  toggleSidebar(){
    this.sidebarExpanded = this.sidebarExpanded ? false : true;
  }

  getHash(columnId){
    return '#' + columnId;
  }

  loadReportingColumnInfoCategories(){
    let self = this;
    self.categories = [];
    self.categoriesReportingColumnInfo=[];
    self.data.getWithUrl('reportingcolumninfo/categories', function(res){
      for(let c = 0; c < res.length; c++){
        let cat = new Category(res[c], res[c].TableFriendlyName, res[c].ColumnID);//data.ColumnID
        self.categoriesReportingColumnInfo.push(cat);
      }
      self.categories = self.categoriesReportingColumnInfo;
    })
  }

  loadCustomValuesCategories(callback){
    let self = this;
    self.categories = [];
    self.categoriesCustomValues=[];
    self.data.getWithUrl('customvalues/datasets', function(res){
      for(let c = 0; c < res.length; c++){
        let cat = new Category(res[c], res[c].Dataset, res[c].Id);
        cat.isCustom=true;
        self.categoriesCustomValues.push(cat);
      }
      self.categories = self.categoriesCustomValues;
      if(callback){
        callback(self.categoriesCustomValues);
      }
    })
  }

  getReportingColumnsWithCategory(category, callback){
    let self = this;
    var url = `reportingcolumninfo/elements/lists?category=${category.data.TableFriendlyName}`;
    self.data.getWithUrl(url, function(res){
      for(let c = 0; c < res.length; c++){
        let rc = self.formhelper.getNewDataColumn(res[c]);
        rc.name = res[c].ColumnFriendlyName;
        rc.editable = res[c].Editable;
        rc.listId = res[c].ListId;
        rc.id = res[c].ColumnID;
        rc.displayType = res[c].DisplayType;
        rc.tableName= res[c].TableName;
        rc.columnName = res[c].ColumnName;
        rc.columnAlias = res[c].ColumnAlias;
        category.items.push(rc);
      }
      if(callback){
        callback();
      }
    })
  }

  getCustomValuesWithCategory(category, callback){
    let self = this;
    var url = `customvalues?dataset=${category.name}`;
    self.data.getWithUrl(url, function(res){
      for(let c = 0; c < res.length; c++){
        let rc = self.formhelper.getNewDataColumn(res[c]);
        rc.name = res[c].Name;
        rc.editable = true;//set custom values editable...
        rc.listId = res[c].ListId;
        rc.id = res[c].Id;
        rc.displayType = res[c].Datatype;//'varchar';
        rc.tableName= 'OD_GO_Forms_Custom_Values_Instance';
        rc.columnName = 'Value';
        category.items.push(rc);
      }
      if(callback){
        callback();
      }
    })
  }

  categoryClicked(category){
    let self = this;
    if(category.items.length > 0){
      self.selectCategory(category);
    }else{
      if(category.isCustom){
        self.getCustomValuesWithCategory(category, function(res){
          self.selectCategory(category);
        });
      }else{
        self.getReportingColumnsWithCategory(category, function(res){
          self.selectCategory(category);
        });
      }
    }
  }

  selectCategory(category){
    let self = this;
    for(let g = 0; g < self.categories.length; g++){
      if(self.categories[g].name == category.name){
        self.selectedCategory = self.categories[g];
        self.categories[g].expanded = true;
      }else{
        self.categories[g].expanded = false;
      }
    }
  }

  deselectAll(){
    let self = this;
    var container = self.form.getCurrentPage();
    self.selectedItem=null;
    for(let i = 0; i < container.items.length; i++){
      var aItm = container.items[i];
      aItm.selected = false;
      aItm.showToolbar = false;   
      if(aItm.toolType=='MYTABLE' && aItm.table){
        aItm.table.deselectAll();
      }
    }
    if(self.maintoolbar){
      self.maintoolbar.au.controller.viewModel.reset();
    }
  }


  selectItem(item, callback){
    let self = this;
    var container = self.form.getCurrentPage();
    for(let i = 0; i < container.items.length; i++){
      var aItm = container.items[i];

      //check for TABLE...
      if(aItm.toolType == 'MYTABLE'){
        //select table...???
        aItm.selected = item.id == aItm.id ? true : false;
        if(aItm.selected){
          //set table as selectedItem...
          self.selectedItem = aItm;
          continue;
        }

        //select table item...
        var foundCell = self.searchTableForItemCellWithId(aItm.table, item.id);
        if(foundCell){
          //don't select item if table is in edit mode...
          if(aItm.table.editMode){
            //select table...
            aItm.selected = true;
            //select cell...
            foundCell.parent.selectCell(foundCell.index);
            return;
          }

          //deselect everything in table...
          aItm.table.deselectAll();

          foundCell.selected = true;//select table cell...
          foundCell.item.selected = true;//select item in cell...
          foundCell.item.showToolbar = true;//show toolbar...
          self.selectedItem = foundCell.item;//set cell item as selected object...
          self.selectedItem.table = aItm.table;//set item table object...
        }
      }else{
        if(item && item.id == aItm.id){
          aItm.selected = true;
          aItm.showToolbar = true;
  
          self.selectedItem = aItm;
          //self.showToolbar(item);
        }else{
          aItm.selected = false;
          aItm.showToolbar = false;
        }
      }
    }

    if(callback){
      callback();
    }
  }


  // generateItemIdWithForm(form){
  //   var sorted = _.orderBy(form.ids, function(i){return i;}, "desc");
  //   var id = sorted.length == 0 ? 1 : sorted[0] + 1;
  //   form.ids.push(id);
  //   return id;
  // }

  dataColumnClicked(dataColumn){
    let self = this;

    var dataIdType=null;
    if(dataColumn.data.hasOwnProperty('ColumnID')){
      dataIdType = self.formhelper.FORMDATATYPES.REPORTINGCOLUMNINFO;
    }else{
      dataIdType = self.formhelper.FORMDATATYPES.GOFORMCUSTOMVALUE;
    }

    var foundId = self.form.findDataId(dataColumn.id, dataIdType);
    if(foundId){
      //ID EXISTS!!!!
      //DONT ADD...

      var txt = `${dataColumn.name} already exists on the form.`;
      self.popupHelper.openGenericMessagePop(txt, "Item Exists", [], false, function(res){

      });

      return;
    }else{
      //add id to form...
      self.form.addDataId(dataColumn.id, dataIdType);
    }

    self.selectedReportingColumnInfoData = dataColumn;
    var disabled = dataColumn.editable ? false : true;

    //check here if we are LINKING an incomplete element...
    // if(self.selectedItem && self.selectedItem.incomplete){
    //   self.linkDataColumnToItem(dataColumn, self.selectedItem)
    //   return;
    // }

    //what type is it???
    if(dataColumn.displayType === 'bit'){
      self.addCheckbox(dataColumn);
    }else if(dataColumn.listId != null){
      self.addListbox(dataColumn);
    }else{
      self.addTextbox(disabled, dataColumn);
    }

  }

  addTable(){
    let self = this;
    var container = self.form.getCurrentPage();

    var name = "table";
    var xy = self.getNewElementXY();
    //divide x again...
    xy.X = xy.X / 2;
    var dataItm = new self.formhelper.getNewItem(self.formhelper.generateItemIdWithForm(self.form),
                              name, xy.X, xy.Y, 500, 150, self.formhelper.getTooltype("mytable"));


    //build default table data...
    var newTable = this.formhelper.getNewTable();
    newTable.editMode = true;
    newTable.style = 'border: 1px solid grey; border-collapse: collapse; width: 100%';
    //add 3 rows...
    for(var i = 0; i < 3; i++){
      var aRow = this.formhelper.getNewTableRow();// MyTableRow();
      aRow.parent = newTable;

      //add 3 cells...
      for(var c = 0; c < 3; c++){
        var cId = self.form.getUniqueTableCellId()
        var aCell = this.formhelper.getNewTableCell(cId);
        aCell.addStyle('border-top', '1px solid grey');
        aCell.addStyle('border-right', '1px solid grey');
        aCell.addStyle('border-bottom', '1px solid grey');
        aCell.addStyle('border-left', '1px solid grey');
        aCell.addStyle('border-collapse', 'collapse');
        aCell.addStyle('height', '20px');

        aRow.addCell(aCell);
      }
      newTable.addRow(aRow);
    }

    dataItm.table = newTable;
    dataItm.dataColumn = {};

    container.items.push(dataItm);
  }

  addListboxClicked(){
    let self = this;
    if(self.isGoForm){
      self.openNewCustomValueDialog({isList: true},function(dataColumn){
        self.dataColumnClicked(dataColumn);
      });
    }else{
      this.addListbox();
    }
  }

  addListbox(data){
    let self = this;
    //var container = self.form.getCurrentPage();
    var tName = data ? data.name : "Listbox";
    var xy = self.getNewElementXY();
    var dataItm = new self.formhelper.getNewItem(self.formhelper.generateItemIdWithForm(self.form),
                      tName, xy.X, xy.Y, 150, 50, self.formhelper.getTooltype("listbox"));
    dataItm.data = {listOptions: [], other: data};
    dataItm.dataColumn = data ? data : self.formhelper.getNewDataColumn();

    self.addItemToForm(dataItm);
    //container.items.push(dataItm);
  }

  addTextboxClicked(){
    let self = this;
    if(self.isGoForm){
      self.openNewCustomValueDialog({isTextbox: true}, function(dataColumn){
        self.dataColumnClicked(dataColumn);
      });
    }else{
      this.addTextbox(false);
    }
  }

  addTextbox(disabled, data){
    let self = this;
    //var container = self.form.getCurrentPage();
    var xy = self.getNewElementXY();
    var name = data == undefined ? 'New Textbox' : data.name;

    var dataItm = new self.formhelper.getNewItem(self.formhelper.generateItemIdWithForm(self.form),
                              name, xy.X, xy.Y, 150, 50, self.formhelper.getTooltype("textbox"));
    dataItm.disabled = disabled;
    dataItm.data = data == undefined ? {} : data;
    dataItm.dataColumn = data == undefined ? {} : data;

    //if this is a goForm, but NO data, set item as incomplete...
    if(self.isGoForm && data == undefined){
      dataItm.incomplete = true;
    }

    self.addItemToForm(dataItm);
    //container.items.push(dataItm);
  }

  addItemToForm(item){
    let self = this;
    //check selectedItem form table...
    if(self.selectedItem && self.selectedItem.toolType == 'MYTABLE'){
      //get selected cell...
      var selectedCell = self.selectedItem.table.getSelectedCell();
      //remove the box class for table...
      item.addBoxClass = false;
      //update x, y, width, height...
      item.x=0;
      item.y=0;
      item.width='100%';
      item.height='100%';
      selectedCell.item = item;

      //set column description...
      var col = self.selectedItem.table.getColumn(selectedCell.index);
      col.description = item.name;
    }else{
      var container = self.form.getCurrentPage();
      container.items.push(item);
    }
    self.selectItem(item);
  }

  addCheckboxClicked(){
    let self = this;
    if(self.isGoForm){
      self.openNewCustomValueDialog({isCheckbox: true}, function(dataColumn){
        self.dataColumnClicked(dataColumn);
      });
    }else{
      self.addCheckbox();
    }
  }

  linkDataColumnToItem(dataColumn, item){
    item.name = dataColumn.name;

    if(item.toolType == 'LISTBOX'){
      item.data.other = dataColumn;
    }else{
      item.data = dataColumn;
    }

    item.dataColumn = dataColumn;
    item.incomplete = false;
  }

  addCheckbox(data){
    let self = this;
    var xy = self.getNewElementXY();
    var name = data == undefined ? 'New Checkbox' : data.name;
    var chkItm = new self.formhelper.getNewItem(self.formhelper.generateItemIdWithForm(self.form),
                          name, xy.X, xy.Y, 150, 50, self.formhelper.getTooltype("checkbox"));
    chkItm.data = data == undefined ? {} : data;
    chkItm.dataColumn = data == undefined ? {} : data;
    chkItm.disabled = true;
    chkItm.value = false;
    chkItm.html = data == undefined ? "Label" : data.name;

    self.addItemToForm(chkItm);
  }

  getNewElementXY(){
    var containerEl = document.getElementById("mainContainer");
    var distanceToTop = containerEl.getBoundingClientRect().top;
    var diff = distanceToTop < 0 ? 0 : distanceToTop;
    var windowHeight = document.documentElement.clientHeight;
    var x = containerEl.clientWidth / 2;
    // var y = windowHeight / 2;//distanceToTop;
    var y = (windowHeight / 2) - diff;
    return {X: x, Y:y};
  }

  addTextElement(tooltype, callback){
    let self = this;
    var xy = self.getNewElementXY();
    var txtItm = new self.formhelper.getNewItem(self.formhelper.generateItemIdWithForm(self.form),
                          null, xy.X, xy.Y, 150, 50, self.formhelper.getTooltype(tooltype));
    txtItm.data = {};
    txtItm.html = tooltype == 'hr' ? "" : "Text";

    self.addItemToForm(txtItm);

    if(callback){
      self.selectItem(txtItm, function(){
        setTimeout(function(){
          callback(txtItm);
        }, 250);
      });
    }else{
      //self.selectItem(txtItm);
    }
  }

  fullWidthClicked(){
    this.form.fullWidth = this.form.fullWidth ? false : true;
  }


  horizontalLineClicked(){
    let self = this;

    var mainToolbar = self.maintoolbar.au.controller.viewModel;

    var lineColor = "#000000";

    if(mainToolbar.showTextToolbar){
      //get colors...
      var ttb = mainToolbar.texttoolbar;
      var ttbModel = ttb.au.controller.viewModel;
      if(ttbModel){
        //disable text tools...
        ttbModel.disableTextSpecificTools=true;
        lineColor = ttbModel.textColor;
      }
    }

    self.addTextElement('hr',function(newTextItem){
      var el = document.getElementById(newTextItem.elementId);
      el.innerHTML="";
      var newHr = document.createElement("hr");
      newHr.style.setProperty('border', `1px solid ${lineColor}`);
      //rng.commonAncestorContainer.parentNode.appendChild(newHr);
      newTextItem.html="";
      el.appendChild(newHr);
      newTextItem.html = el.innerHTML;
      //newTextItem.style = newHr.style.cssText;
      self.updateItem(newTextItem);
    });
  }

  addImage(callback){
    let self = this;
    //var container = self.form.getCurrentPage();
    var xy = self.getNewElementXY();
    var sigItm = new self.formhelper.getNewItem(self.formhelper.generateItemIdWithForm(self.form),
                          null, xy.X, xy.Y, 150, 50, self.formhelper.getTooltype("imagebox"));
    // sigItm.data = {text: "Text"}
    sigItm.dataColumn = {text: "Text"}

    self.addItemToForm(sigItm);

    if(callback){
      callback(sigItm);
    }
  }

  addSignature(){
    let self = this;
    //var container = self.form.getCurrentPage();
    var xy = self.getNewElementXY();
    var sigItm = new self.formhelper.getNewItem(self.formhelper.generateItemIdWithForm(self.form),
                          null, xy.X, xy.Y, 150, 50, self.formhelper.getTooltype("signature"));
    sigItm.data = {text: "Text"}
    sigItm.disabled = true;

    self.addItemToForm(sigItm);
    //container.items.push(sigItm);
    //self.selectItem(sigItm);
  }

  prependPage(index){
    var aPage = this.formhelper.getNewPage();
    this.form.addPage(aPage, index);
    this.form.selectPage(index);
  }

  appendPage(index){
    var i = index + 1;
    var aPage = this.formhelper.getNewPage();
    this.form.addPage(aPage, i);
    this.form.selectPage(i);
  }

  deletePage(index){
    this.form.deletePage(index);
  }

  clonePage(index){
    let self = this;
    var page = self.form.pages[index];

    var clonedPage = _.cloneDeep(page);
    //var startId = page.items.length + 1;

    for(let i = 0; i < clonedPage.items.length; i++){
      var itm = clonedPage.items[i];
      //increment id...
      // var itemId = startId++;
      // self.updateItemId(itm, itemId);

      var itemId = this.formhelper.generateItemIdWithForm(self.form);
      self.updateItemId(itm, itemId);
      //add new id...
      //if table...
      if(itm.toolType=='MYTABLE'){
        //update each item id...
        for(var r=0; r < itm.table.rows.length; r++){
          var aRow = itm.table.rows[r];
          for(var c = 0; c < aRow.cells.length; c++){
            var aCell = aRow.cells[c];
            //update cellId...
            let newCellId = this.formhelper.generateItemIdWithForm(self.form);
            aCell.cId = "c"+newCellId;
            if(aCell.item){
              //update items id...
              var newId = this.formhelper.generateItemIdWithForm(self.form);
              self.updateItemId(aCell.item, newId);
            }
          }
        }
      }





    }

    self.form.pages.push(clonedPage);
  }

  getContainerViewModel(){
    var conatinerEl = document.getElementById('mainContainer');
    return conatinerEl.au.container.viewModel;
  }

  marqee(){
    let self = this;
    let containerVm = self.getContainerViewModel();
    //var conatinerEl = document.getElementById('mainContainer');
    self.ea.publish('clearSelections');
    containerVm.drawMarquee = true;
    //conatinerEl.au.container.viewModel.drawMarquee = true;
    self.marqueeSelected = true;
  }

  undo(){
    let self = this;
    if(self.previousSelection){
      var rng = self.previousSelection.getRangeAt(0);
    }
  }

  // anchorItem(id, leftOrRight, callback){
  //   let self = this;
  //   var itm = self.findItem(id);
  //   if(itm){
  //     if(leftOrRight == 'right'){
  //       itm.anchorRight = itm.anchorRight ? false : true;
  //       itm.right = itm.anchorRight ? self.formhelper.getItemRightWithElementId(itm.elementId) : null;
  //     }
  //     if(leftOrRight == 'left'){
  //       itm.anchorLeft = itm.anchorLeft ? false : true;
  //     }
  //     if(callback){
  //       callback(itm);
  //     }
  //   }
  // }

  itemRequired(id){
    let self = this;
    var itm = self.findItem(id);
    if(itm){
      itm.required = itm.required ? false : true;
    }
    // var page = self.form.getCurrentPage();
    // for(let i = 0; i < page.items.length; i++){
    //   var itm = page.items[i];
    //   if(itm.id == id){
    //     itm.required = itm.required ? false : true;
    //     break;
    //   }
    // }
  }

  findItem(id){
    let self = this;
    var page = self.form.getCurrentPage();
    for(let i = 0; i < page.items.length; i++){
      var itm = page.items[i];
      if(itm.toolType == 'MYTABLE'){

        //is the table the item???
        if(itm.id == id){
          return itm;
        }

        var aCell = self.searchTableForItemCellWithId(itm.table, id);
        if(aCell && aCell.item && aCell.item.id == id){
          return aCell.item;
        }
      }else{
        if(itm.id == id){
          return itm;
        }
      }
    }
  }

  isItemParentTable(id){
    let self = this;
    var page = self.form.getCurrentPage();
    for(let i = 0; i < page.items.length; i++){
      var itm = page.items[i];
      if(itm.toolType == 'MYTABLE'){
        var aCell = self.searchTableForItemCellWithId(itm.table, id);
        if(aCell && aCell.item && aCell.item.id == id){
          return true;
        }
      }
    }
    return false;
  }


  deleteItem(itemToDelete){
    let self = this;
    let id = itemToDelete.id;
    var page = self.form.getCurrentPage();
    for(let i = 0; i < page.items.length; i++){
      var itm = page.items[i];
      if(itm.toolType == 'MYTABLE'){

        //is the table the item???
        if(itm.id == id){
          page.items.splice(i, 1);
          self.form.deleteId(id);
          break;
        }

        var aCell = self.searchTableForItemCellWithId(itm.table, id);
        if(aCell && aCell.item && aCell.item.id == id){

          self.deleteDataIdWithItem(aCell.item);
  
          aCell.item = null;
          self.form.deleteId(id);
          break;
        }
      }else{
        if(itm.id == id){
          page.items.splice(i, 1);
          // //remove id from ids...
          self.form.deleteId(id);
          self.deleteDataIdWithItem(itm);
          break;
        }
      }
    }
  }

  deleteDataIdWithItem(item){
    if(this.form){
      var dataIdType = this.formhelper.getDataTypeForDataColumn(item.dataColumn);
      // var dataIdType= item.dataColumn ? item.dataColumn.getDataType() : null;  
      if(dataIdType != null){
        var foundId = this.form.findDataId(item.dataColumn.id, dataIdType);
        if(foundId){
          this.form.deleteDataId(foundId, dataIdType);
        }
      } 
    }
  }

  

  deleteItemFromTable(id, table){
    //loop through rows, cells to find id...
    for(var r = 0; r < table.rows.length; r++){
      var aRow = table.rows[r];
      for(var c = 0; c < aRow.cells.length; c++){
        var aCell = aRow.cells[c];
        if(aCell.item && aCell.item.id == id){
          aCell.item = null;
        }
      }
    }
  }

  searchTableForItemCellWithId(table, id){
    for(var r = 0; r < table.rows.length; r++){
      var aRow = table.rows[r];
      for(var c = 0; c < aRow.cells.length; c++){
        var aCell = aRow.cells[c];
        if(aCell.item && aCell.item.id == id){
          return aCell;
        }
      }
    }
    return null;
  }


  cloneItem(id){
    let self = this;
    var page = self.form.getCurrentPage();
    for(let i = 0; i < page.items.length; i++){
      var itm = page.items[i];
      if(itm.id == id){
        var clonedItm = _.cloneDeep(itm);
        //offset item 50x50...
        clonedItm.x += 50;
        clonedItm.y += 50;
        //increment id...
        var itemId = this.formhelper.generateItemIdWithForm(self.form);
        self.updateItemId(clonedItm, itemId);
        //add new id...
        //if table...
        if(clonedItm.toolType=='MYTABLE'){
          //update each item id...
          for(var r=0; r < clonedItm.table.rows.length; r++){
            var aRow = clonedItm.table.rows[r];
            for(var c = 0; c < aRow.cells.length; c++){
              var aCell = aRow.cells[c];
              if(aCell.item){
                //update items id...
                var newId = this.formhelper.generateItemIdWithForm(self.form);
                self.updateItemId(aCell.item, newId);
              }
            }
          }
        }

        page.items.push(clonedItm);
        self.selectItem(clonedItm);
        break;
      }
    }
  }

  align(id, mode){
    let self = this;
    let containerVm = self.getContainerViewModel();
    //get target item...
    let target = _.find(containerVm.selections, function(i){return i.id === id});

    switch(mode){
      case 'left':
        for(var i = 0; i < containerVm.selections.length; i++){
          let updated = containerVm.selections[i];
          updated.x = target.x;
        }
        break;
      case 'top':
        for(var i = 0; i < containerVm.selections.length; i++){
          let updated = containerVm.selections[i];
          updated.y = target.y;
        }
        break;
    }
  }

  updateItemId(item , id){
    item.id = id;
    item.elementId = 'e'+ id;
  }

  buildFormObject(){
    let self = this;

    if(!this.form){
      return;
    }
  }

  maturityDaysClicked(){
    let self = this;

    var options=[{
      name: "Maturity Days",
      placeholder: "Days to maturity...",
      inputType: 'number',
      value: self.form.maturityDays
      }];
    
    self.popupHelper.openGenericInputPop('Add Document Maturity Days', options,"ADD",false,function (res) {
      var days = res.inputs[0].value;
      self.form.maturityDays = days;
    });
  }


  openCustomValues(){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    var popupWidth = windowWidth;// / 4;
    var popupHeight = windowHeight;// / 4;
    var popupTop = 0;//(windowHeight - popupHeight) / 2;
    var popupLeft = 0;// (windowWidth - popupWidth) / 2;

    var options={
      closeActiveDialog:false
    }

    self.popupHelper.openViewModelPop('../formbuilder/listbuilder', self,'Custom Values',popupWidth,popupHeight,popupTop,popupLeft,options,function(res){
        // if(res.cancelled && res.cancelled){
        //   return;
        // }

    });
  }

  openPreferenceEditor(){
    let self = this;

    if(self.form == null)return;

    let path = '../formbuilder/viewer';
    // const windowHeight = window.innerHeight;
    // const windowWidth = window.innerWidth;
    const windowHeight = '100%';
    const windowWidth = '100%';

    let options={
      //displayHeader: false,
      bodyPadding: 0,
      icon: 'fa-user'
    }

    //var formId = form ? form.Id : null;
    var description = 'Go Form Preference Editor';

    self.popupHelper.openViewModelPop(path, 
      {
        // jwt: self.helper._jwt, 
        formId: self.form.id, 
        // patientId: self.patient.data.PatientID, 
        providerId: self.selectedProvider.ProviderID, 
        // date: date, 
        // instanceId: instanceId, 
        //showToolbar: true,
        showPreferenceToolbar: true,
        showPreferenceToolbarSave: true,
        prefId: 0
      }, description, windowWidth, windowHeight, 0, 0, options, function(res){

    });
  }


  addChart(chartType){
    let self = this;
    var xy = self.getNewElementXY();
    var barItm = new self.formhelper.getNewItem(self.formhelper.generateItemIdWithForm(self.form),
                          null, xy.X, xy.Y, 400, 400, self.formhelper.getTooltype(chartType));
                          barItm.data = {};
    // txtItm.html = tooltype == 'hr' ? "" : "Text";

    self.addItemToForm(barItm);

    // if(callback){
    //   self.selectItem(barItm, function(){
    //     setTimeout(function(){
    //       callback(barItm);
    //     }, 250);
    //   });
    // }else{
    //   //self.selectItem(txtItm);
    // }
  }
}
