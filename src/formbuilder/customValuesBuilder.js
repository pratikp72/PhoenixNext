import {helper} from '../helpers/helper';
import {inject, observable, computedFrom} from 'aurelia-framework';
import {Data} from '../data/go/data';
import {EventAggregator} from 'aurelia-event-aggregator';
import {formhelper} from './formhelper';
import * as _ from 'lodash';
import {DialogService} from 'aurelia-dialog';
import {PopupHelper} from '../go/popupHelper';


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

class ReportingColumnInfo{

  constructor(data, parent){
    this.data = data;
    this.checked = false;
    this.parent = parent;
  }
  checkItem(){
    this.checked = this.checked ? false : true;
    this.parent.itemCheckedChanged = this.checked;
  }
}

class Category{

  itemCheckedChanged=false;

  constructor(){
    this.items = [];
  }
}


@inject(helper, Data, EventAggregator, formhelper, DialogService, PopupHelper)
export class CustomValuesBuilder {

  @observable selectedList=null;

  lists=[];
  reportingColumnInfos=[];
  categories=['Ankle Exam', 'Knee Exam', 'Hip Exam', 'Hand Exam', 'Elbow Exam', 'Shoulder Exam', 'Cervical Exam', 'Lumbo Thoracic'];
  @observable selectedCategoryName=null;
  selectedCategory=null;
  selectedCategoryNameChanged(newval, oldVal){
    this.loadCategory(newval);
  }


  @computedFrom('selectedCategory', 'selectedCategory.itemCheckedChanged', 'selectedList')
  get canUpdate(){
    if(this.selectedCategory == null || this.selectedList == null){
      return false;
    }
    var checked = _.filter(this.selectedCategory.items, function(c){return c.checked});
    return checked.length > 0 ? true : false;
  }


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

    //hack for hiding save button in list builder...
    self.selectedList={ showSaveButton: false, showNormal: true, showName: true, canAdd: false}

    self.loadLists();
    //self.loadReportingColumns();

    this.ea.subscribe("listboxOptionChanged", function(options){
      self.selectedList.options = options;
    });
  }

  loadCategory(category){
    let self = this;
    self.selectedCategory = null;;
    var url = `reportingcolumninfo/elements/lists?category=${category}`;
    self.data.getWithUrl(url, function(res){
      var items = [];
      var cat = new Category();
      for(var i = 0; i < res.length; i++){
        items.push(new ReportingColumnInfo(res[i], cat));
      }
      cat.items = items;
      self.selectedCategory = cat;
    });
  }

  loadLists(){
    let self = this;
    self.lists = [];
    self.data.getWithUrl('goformslist/all', function(res){
      for(let i = 0; i < res.length; i++){
        var aList = new List(res[i].Name, res[i].Id);
        var json = res[i].Json ? JSON.parse(res[i].Json) : null;
        if(json != null){
          for(var x = 0; x < json.length; x++){
            var itm = json[x];
            var aItm = self.formhelper.getNewListItem(itm.text, itm.normal);
            aList.options.push(aItm);
          }
        }
        self.lists.push(aList);
      }
    });
  }

  loadReportingColumns(){
    let self = this;
    self.data.getWithUrl('reportingcolumninfo/elements/lists', function(res){
      self.reportingColumnInfos = res;
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
      });
    }

  }

  removeListFromItem(item){
    let self = this;

    var data={
      ReportingColumnInfos:[]
    }

    var itm={
      ReportingColumnInfoId: item.data.ColumnID,
      ListId: null
    }
    data.ReportingColumnInfos.push(itm);

    let saveDescription = `Disassociating list from ${item.data.ColumnFriendlyName}...`;
    let saveDialog = self.helper.createNoty(saveDescription, 3000);
    saveDialog.show();

    var url = 'reportingcolumninfo/list/xref';
    self.data.putWithUrlAndData(url, data, function(res){

      //update item...
      item.data.ListId = null;
      item.data.ListName = null;
      self.helper.updateNoty(saveDialog, "Disassociated list!", "success", 1000);
    });
  }

  // updateReportingColumnInfoListXrefs(){

  // }

  applyListToSelected(){
    let self = this;

    if(self.selectedList == null)return;

    //get all selected reporting columns...
    var checked = _.filter(self.selectedCategory.items, function(c){return c.checked});
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

    let saveDescription = `Applying list to selected items...`;
    let saveDialog = self.helper.createNoty(saveDescription, 3000);
    saveDialog.show();

    var url = 'reportingcolumninfo/list/xref';
    self.data.putWithUrlAndData(url, data, function(res){

      //update items...
      for(let i = 0; i < checked.length; i++){
        checked[i].data.ListId = self.selectedList.id;
        checked[i].data.ListName = self.selectedList.name;
      }
      self.helper.updateNoty(saveDialog, "Applied list successfully!", "success", 1000);
    });
  }

}
