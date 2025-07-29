import {helper} from '../helpers/helper';
import {inject, observable, computedFrom, BindingEngine} from 'aurelia-framework';
import {Data} from '../data/go/data';
import {EventAggregator} from 'aurelia-event-aggregator';
import {formhelper} from './formhelper';
import * as _ from 'lodash';
import {DialogService} from 'aurelia-dialog';
import {PopupHelper} from '../go/popupHelper';
import { NewCustomValueDialog } from './dialogs/newCustomValueDialog';


class List{
  constructor(name, id){
    this.name = name;
    this.id = id;
    this.options= [];
    this.showSaveButton=false;
    this.showNormal = true;
    this.showName=true;
    this.canAdd=true;
  }
}

class DataObject{
  constructor(data, parent, name, listName, listId, datatype){
    this.data = data;
    this.checked = false;
    this.parent = parent;
    this.name = name;
    this.listName = listName;
    this.listId = listId;
    this.dataType = datatype;
  }

  @computedFrom('dataType')
  get readableType(){
    return this.convertDatatypeToReadable(this.dataType);
  } 

  checkItem(){
    this.checked = this.checked ? false : true;
    this.parent.itemCheckedChanged = this.checked;
  }

  convertDatatypeToReadable(datatype){
    switch(datatype){
      case "int":
        return "number";
      case "datetime":
        return "date";
      case "bit":
        return "boolean";
      default:
        return "text";
    }
  }

}

class Category{

  itemCheckedChanged=false;

  constructor(name){
    this.items = [];
    this.name = name;
    this.isCustom=false;
  }
}


@inject(helper, Data, EventAggregator, formhelper, DialogService, PopupHelper, BindingEngine)
export class Listbuilder {

  @observable selectedList=null;
  selectedListChanged(newVal, oldVal){
    //add listHeight to list for dialog list height...
    if(newVal!=null){
      newVal.listHeight = this.listOptionsDialogListHeight;
    }
  }

  listOptionsDialogListHeight=200;

  lists=[];
  reportingColumnInfos=[];
  categoryNames=['Ankle Exam', 'Knee Exam', 'Hip Exam', 'Hand Exam', 'Elbow Exam', 'Shoulder Exam', 'Cervical Exam', 'Lumbo Thoracic', 'Pre Op Exam', 'Lab Order', 'Range of Motion', 'Neurologic', 'Vascular', 'Procedure', 'Diagnosis', 'Surg Schedule'];
  categories=[];
  @observable selectedCategoryName=null;

  addDataElementDisabled = false;

  selectedCategory=null;
  selectedCategoryNameChanged(newval, oldVal){
    if(newval.items.length == 0){
      if(!newval.isCustom){
        this.addDataElementDisabled = true;
        this.loadCategory(newval);
      }else{
        this.addDataElementDisabled = false;
        this.loadDataset(newval);
      }
    }
    this.selectedCategory = newval;
  }

  @computedFrom('selectedCategory', 'selectedCategory.itemCheckedChanged', 'selectedList')
  get canUpdate(){
    if(this.selectedCategory == null || this.selectedList == null || 
      this.selectedList.id == undefined || this.selectedList.id == 0){
      return false;
    }
    var checked = _.filter(this.selectedCategory.items, function(c){return c.checked});
    return checked.length > 0 ? true : false;
  }

  optionDataset=null;
  optionListId = null;
  optionCustomValueId = null;
  optionReportingColumnId = null;

  constructor(helper, Data, EventAggregator, formhelper, DialogService, PopupHelper, BindingEngine){
    this.helper = helper;
    this.data = Data;
    this.ea = EventAggregator;
    this.formhelper = formhelper;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
    this.bindingEngine = BindingEngine;
  }

  activate(params) {
    let self = this;

    //hack for hiding save button in list builder...
    self.selectedList={ showSaveButton: false, showNormal: true, showName: true, canAdd: false}

    if(params.hasOwnProperty("Dataset")){
      self.optionDataset = params.Dataset;
    }

    if(params.hasOwnProperty("ListId")){
      self.optionListId = params.ListId;
    }

    if(params.hasOwnProperty("CustomValueId")){
      self.optionCustomValueId = params.CustomValueId;
    }

    if(params.hasOwnProperty("ReportingColumnId")){
      self.optionReportingColumnId = params.ReportingColumnId;
    }

    self.loadLists();

    for(var i = 0; i < self.categoryNames.length; i++){
      var aCategory = new Category(self.categoryNames[i]);
      self.categories.push(aCategory);

      //check optionDataset...
      if(self.optionDataset == aCategory.name){
        self.selectedCategoryName = aCategory;
        self.optionDataset = null;
      }
    }

    self.loadCustomValueCategories();

    this.ea.subscribe("listboxOptionChanged", function(options){
      self.selectedList.options = options;
    });
  }

  attached(){

    let self = this;

    //var listboxOptionsDiv = this.listoptionsdiv.clientHeight;
    var listboxOptionsHeaderHeight = 86 + 20 + 20;//padding padding;
    self.listOptionsDialogListHeight = self.listoptionsdiv.clientHeight - listboxOptionsHeaderHeight;
    self.selectedList={ showSaveButton: false, showNormal: true, showName: true, canAdd: false, listHeight: self.listOptionsDialogListHeight}

  }

  listSelected(l){
    this.selectedList = l;
  }

  loadCustomValueCategories(){
    let self = this;
   // self.selectedCategory = null;;
    var url = `customvalues/datasets`;
    self.data.getWithUrl(url, function(res){

      for(var i = 0; i < res.length; i++){
        var aCat = new Category(res[i].Dataset);
        aCat.isCustom = true;
        self.categories.push(aCat);

        //check optionDataset...
        if(self.optionDataset == aCat.name){
          self.selectedCategoryName = aCat;
          self.optionDataset = null;
        }

      }
    });
  }

  loadDataset(category){
    let self = this;
    //self.selectedCategory = null;;
    var url = `customvalues?dataset=${category.name}`;
    self.data.getWithUrl(url, function(res){
      var items = [];
      for(var i = 0; i < res.length; i++){
        var list = res[i].OD_GO_Form_List;

        var dObj = new DataObject(res[i], category, 
          res[i].Name, 
          list ? list.Name : null, 
          list ? list.Id : null, 
          res[i].Datatype);
    
        //check optionsCustomValue...
        if(self.optionCustomValueId == dObj.data.Id){
          dObj.checkItem();
          self.optionCustomValueId = null;
        }

        items.push(dObj);
      }

      category.items = items;
    });
  }

  loadCategory(category){
    let self = this;
    self.selectedCategory = null;;
    var url = `reportingcolumninfo/elements/lists?category=${category.name}`;
    self.data.getWithUrl(url, function(res){
      var items = [];
      for(var i = 0; i < res.length; i++){

        var dObj = new DataObject(res[i], 
          category, 
          res[i].ColumnFriendlyName, 
          res[i].ListName, 
          res[i].ListId, 
          res[i].Datatype);

        //check optionReportingColumnId...
        if(self.optionReportingColumnId == dObj.data.ColumnID){
          dObj.checkItem();
          self.optionReportingColumnId = null;
        }

        items.push(dObj);
      }


      category.items = items;
      
    });
  }

  loadLists(){
    let self = this;
    self.lists = [];
    self.data.getWithUrl('goformslist/all', function(res){
      for(let i = 0; i < res.length; i++){

        //no list ZERO...
        if(res[i].Id == 0){
          continue;
        }

        var aList = new List(res[i].Name, res[i].Id);
        var json = res[i].Json ? JSON.parse(res[i].Json) : null;
        if(json != null){
          for(var x = 0; x < json.length; x++){
            var itm = json[x];
            var aItm = self.formhelper.getNewListItem(itm.text, itm.normal);
            aItm.sql = itm.sql;
            aList.options.push(aItm);
          }
        }
        self.lists.push(aList);

        //check for optionListId...
        if(self.optionListId == aList.id){
          self.selectedList = aList;
          self.optionListId =  null;
        }
      }
    });
  }

  newList(){
    let self = this;
    self.popupHelper.openGenericInputPop("Create New List", ['Name'], null, false, function(res) {
      let imageName = res.inputs[0].value;
      var newList = new List(imageName, 0);
      self.lists.push(newList);
      self.selectedList = newList;
    });
  }

  deleteList(){
    let self = this;

    if(self.selectedList == null)return;

    let msg = `This will delete all associations to ${self.selectedList.name} and database elements! Are you sure?`;
    self.popupHelper.openGenericMessagePop(msg, 'Delete Picklist', ['YES','NO'], false, function(res){
      let r = res.result;
      if(r == 'YES'){

        let saveDescription = `Deleting ${self.selectedList.name}...`;
        let saveDialog = self.helper.createNoty(saveDescription, 3000);
        saveDialog.show();
    
        if(self.selectedList && self.selectedList.id > 0){
          var url = `goformslist?id=${self.selectedList.id}`;
          self.data.deleteWithUrl(url, function(res){
    
            //get db xref table...
            var getUrl = `reportingcolumninfo/list/xref?listId=${self.selectedList.id}`;
            self.data.getWithUrl(getUrl, function(getRes){

              var reportingData={
                ReportingColumnInfos: []
              }
              for(let x = 0; x < getRes.length; x++){
                var d = getRes[x];
                d.ListId = null;
                reportingData.ReportingColumnInfos.push(d);
              }

              //update dx xref table w/ res...
              var putUrl = 'reportingcolumninfo/list/xref';
              self.data.putWithUrlAndData(putUrl, reportingData, function(res){
          
                var checked = _.filter(self.selectedCategory.items, function(c){return c.checked});
                //update items...
                for(let i = 0; i < checked.length; i++){
                  checked[i].data.ListId = null;
                  checked[i].data.ListName = null;
                }

              });
            });

            //update list...
            var index = _.findIndex(self.lists, function(l){return l.id == self.selectedList.id});
            self.lists.splice(index, 1);
            self.selectedList = null;
            self.helper.updateNoty(saveDialog, "Deleted list!", "success", 1000);
          });
    
        }else{
            //update list...
            var index = _.findIndex(self.lists, function(l){return l.id == self.selectedList.id});
            self.lists.splice(index, 1);
            self.selectedList = null;
            self.helper.updateNoty(saveDialog, "Deleted list!", "success", 1000);
        }
      }
    });
  }

  saveList(){
    let self = this;

    let saveDescription = `Saving ${self.selectedList.name}...`;
    let saveDialog = self.helper.createNoty(saveDescription, 3000);
    saveDialog.show();


    if(self.selectedList && self.selectedList.id > 0){
      var list={
        Id: self.selectedList.id,
        Name: self.selectedList.name,
        Json: JSON.stringify(self.selectedList.options)
      }
      self.data.putWithUrlAndData('goformslist', list, function(res){
        self.helper.updateNoty(saveDialog, "Saved list!", "success", 1000);
      });
    }else{
      var list={
        Id: 0,
        Name: self.selectedList.name,
        Json: JSON.stringify(self.selectedList.options)
      }
      self.data.postWithUrlAndData('goformslist', JSON.stringify(list), function(res){
        self.helper.updateNoty(saveDialog, "Saved list!", "success", 1000);
        self.selectedList.id = res.Id;
      });
    }

  }

  removeListFromItem(item){
    let self = this;

    let saveDescription = `Disassociating list from ${item.name}...`;
    let saveDialog = self.helper.createNoty(saveDescription, 3000);
    saveDialog.show();

    if(!item.parent.isCustom){
      var data={
        ReportingColumnInfos:[]
      }
      var itm={
        ReportingColumnInfoId: item.data.ColumnID,
        ListId: null
      }
      data.ReportingColumnInfos.push(itm);
  
      var url = 'reportingcolumninfo/list/xref';
      self.data.putWithUrlAndData(url, data, function(res){
        //update item...
        item.listId = null;
        item.listName = null;
        self.helper.updateNoty(saveDialog, "Disassociated list!", "success", 1000);
      });
    }else{
      var url = 'customvalues';
      //remove listId from data...
      var clonedData = _.cloneDeep(item.data);
      clonedData.ListId = null;

      self.data.putWithUrlAndData(url, clonedData, function(res){
        //remove listId from data...
        item.listId = null;
        item.listName = null;
        self.helper.updateNoty(saveDialog, "Disassociated list!", "success", 1000);
      });
    }
  }

  uncheckSelectedCategoryItems(){
    if(this.selectedCategory){
      for(let i = 0; i < this.selectedCategory.items.length; i++){
        this.selectedCategory.items[i].checked = false;
      }
    }
  }

  applyListToSelected(){
    let self = this;

    if(self.selectedList == null)return;

    let saveDescription = `Applying list to selected items...`;
    let saveDialog = self.helper.createNoty(saveDescription, 3000);
    saveDialog.show();

    //get all selected reporting columns...
    var checked = _.filter(self.selectedCategory.items, function(c){return c.checked});

    if(!self.selectedCategory.isCustom){

      //update checked to OD_reportingColumnInfoOD_GoForm_ListXref...
      var data={
        ReportingColumnInfos:[]
      }
      for(let i = 0; i < checked.length; i++){
        var itm={
          ReportingColumnInfoId: checked[i].data.ColumnID,
          ListId: self.selectedList.id
        }
        data.ReportingColumnInfos.push(itm);
      }

      var url = 'reportingcolumninfo/list/xref';
      self.data.putWithUrlAndData(url, data, function(res){

        //update items...
        for(let i = 0; i < checked.length; i++){
          checked[i].data.ListId = self.selectedList.id;
          checked[i].data.ListName = self.selectedList.name;
          checked[i].listId = self.selectedList.id;
          checked[i].listName = self.selectedList.name;
        }
        self.helper.updateNoty(saveDialog, "Applied list successfully!", "success", 1000);

        self.uncheckSelectedCategoryItems();

      });

    }else{

      var obj={
        CustomValues: []
      }
      for(let i = 0; i < checked.length; i++){
        checked[i].data.ListId = self.selectedList.id;
        obj.CustomValues.push(checked[i].data);
      }

      var url = 'customvalues/multiple';
      self.data.putWithUrlAndData(url, obj, function(res){
        //update items...
        for(let i = 0; i < checked.length; i++){
          checked[i].data.ListId = self.selectedList.id;
          checked[i].listId = self.selectedList.id;
          checked[i].listName = self.selectedList.name;
        }
        self.helper.updateNoty(saveDialog, "Applied list successfully!", "success", 1000);

        self.uncheckSelectedCategoryItems();
      });
    }
  }


  addNewDataset(){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    //get category list of names...
    var cats = _.filter(self.categories, function(r){return r.isCustom});
    var catNames =[];
    for(var i = 0 ; i < cats.length; i++){
      catNames.push(cats[i].name);
    }

    var datasetName = self.selectedCategory ? self.selectedCategory.name : null;

    self.dialogService.open({viewModel: NewCustomValueDialog, model: {popupWidth: windowWidth, popupHeight: windowHeight, datasetList: catNames, "datasetName": datasetName}})
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
          ListId: null,
          Bodypart: null,
          Datatype: res.datatype
        }

        let saveDescription = `Saving new custom value...`;
        let saveDialog = self.helper.createNoty(saveDescription, 3000);
        saveDialog.show();

        var url = 'customvalues';
        self.data.postWithUrlAndData(url, JSON.stringify(customValue), function(customValueRes){
          self.helper.updateNoty(saveDialog, "Custom value " + customValueRes.Name + " saved!", "success", 1000);

          //update category w/ custom value...??
          //find category...
          var foundCategory = _.find(self.categories, function(c){return c.isCustom && c.name == customValueRes.Dataset});
          if(!foundCategory){
            foundCategory = new Category(customValueRes.Dataset);
            foundCategory.items.push(new DataObject(customValueRes, foundCategory, customValueRes.Name, null, null, customValueRes.Datatype));
            self.categories.push(foundCategory);
          }else{
            foundCategory.items.push(new DataObject(customValueRes, foundCategory, customValueRes.Name, null, null, customValueRes.Datatype));
          }

        });


      }
    });
  }

}
