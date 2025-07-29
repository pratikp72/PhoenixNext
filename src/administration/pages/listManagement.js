import {inject} from "aurelia-dependency-injection";
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";
import * as _ from 'lodash';
import {PopupHelper} from "../../go/popupHelper";
import {computedFrom} from 'aurelia-framework';


class ListItem {
  constructor(descripiton, id, data){
    this.data=data;
    this.description= descripiton;
    this.selected = false;
    this.item=null;
    this.id=id;
  }
}

class ListGroup{
  constructor(description, items){
    this.items = items == undefined ? [] : items;
    this.description = description;
    this.headingId;
    this.collapseId;
    this.dataTarget;
    this.expanded = false;
    this.saveDescription;
    this.displayBodypart = true;
    this.displayBodypartColumn = true;
    this.displayDescription2Column = true;
    this.providerRequired=true;
    this.displayDescription = true;
  }
}

@inject(helper, http, Data, PopupHelper)
export class ListManagement {

  list=[];

  selectedItem=null;
  selectedGroup=null;

  height;

  enableEdit = false;

  saveDialog=null;

  home;
  selectedProvider;//={ProviderID: 0}
  listComboData=[]

  bodyparts;// = ['All','Ankle','Knee', 'Hip', 'Wrist', 'Elbow', 'Shoulder', 'Cervical', 'Lumbar'];
  selectedBodypartFilter;// = this.bodyparts[0];

  // displayBodypartColumn=true;
  // providerRequired = true;

  @computedFrom('selectedItem', 'selectedProvider')
  get canAddItem(){
    if(this.selectedItem && !this.selectedItem.providerRequired){
      return true;
    }
    if(this.selectedItem && this.selectedProvider){
      return true;
    }
    return false;
  }

  @computedFrom('selectedProvider', 'selectedItem')
  get providerInvalid(){
    if(this.selectedItem == null || (this.selectedItem.providerRequired == true && this.selectedProvider == null)){
      return true;
    }
    return false;
  }


  constructor(helper, http, Data, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.popupHelper = PopupHelper;
  }

  activate(obj) {
    let self = this;
    self.selectedProvider={ProviderID: 0}
    self.data = obj.data;
    self.home = obj.home;
    self.setup();
  }

  filterListByBodypart(bodypart){
    let self = this;
    let filterArray = self.getQueryFromListItem(self.selectedItem);
    //add bodypart...
    if(bodypart != this.bodyparts[0]){
      filterArray.push(['BodyPart', bodypart]);
    }
    self.selectedBodypartFilter = bodypart;
    let filtered = self.filterListComboDataWithFilterArray(self.listComboData, filterArray);
    self.populateItemWithListComboData(self.selectedItem, filtered);
  }

  setupModifierGroupWithMiscGroup(miscellaneousGroup){
    let self = this;
    let modGroup = new ListGroup('Modifiers');
    modGroup.displayBodypart = false;
    modGroup.filters=[];
    modGroup.filters.push(["ListType", 'Miscellaneous']);
    modGroup.filters.push(["Description2", "Modifiers"]);
    modGroup.filters.push(["ProviderID"]);
    modGroup.additionalLists=[];
    var modList={
      'description': 'Modifiers',
      'items': [],
      'selectedItem': null
    }
    self.goData.getModifiers(function(mods){
      for(let i = 0; i < mods.length; i++){
        modList.items.push(mods[i]);
      }
      modGroup.additionalLists.push(modList);
      miscellaneousGroup.items.push(modGroup);
    });
  }

  setupBodypartGroupWithMiscGroup(miscellaneousGroup){
    let self = this;
    let bodypartGroup = new ListGroup('Bodyparts');
    bodypartGroup.displayBodypart = false;
    bodypartGroup.displayBodypartColumn = false;
    bodypartGroup.displayDescription2Column = false;
    bodypartGroup.displayDescription = false;
    bodypartGroup.providerRequired = false;
    bodypartGroup.filters=[];
    bodypartGroup.filters.push(["ListType", 'Bodypart']);

    bodypartGroup.additionalLists=[];
    var bodyList={
      'description': 'Bodyparts',
      'items': [],
      'selectedItem': null
    }

    for(var i = 0; i < self.goData.bodyparts.length; i++){
      bodyList.items.push(self.goData.bodyparts[i]);
    }
    bodypartGroup.additionalLists.push(bodyList);
    miscellaneousGroup.items.push(bodypartGroup);
  }

  setup(){
    let self = this;

    self.bodyparts = self.goData.bodyparts;
    self.selectedBodypartFilter= self.bodyparts[0];

    self.height = window.innerHeight - 60;

    // let medAlgGroup = new ListGroup('Med Allergies');
    // let imGroup = new ListGroup('IM Messages');
    let hpiGroup = new ListGroup('HPI');
    hpiGroup.saveDescription = 'HPI';
    hpiGroup.displayBodypart = false;
    let patHxGroup = new ListGroup('Patient Hx');
    let jointInjectionGroup = new ListGroup('Joint Injection');
    let daysheetGroup = new ListGroup('Daysheet');
    daysheetGroup.saveDescription = "Modalities";
    let phonecallGroup = new ListGroup('Phone Call');
    phonecallGroup.saveDescription = "Phone Call";
    let miscGroup = new ListGroup("Miscellaneous");
    miscGroup.saveDescription ="Miscellaneous"; 
    let apptGroup = new ListGroup("Appointment");
    apptGroup.saveDescription ="Appointment"; 
    apptGroup.displayBodypart = false;
    apptGroup.displayDescription = false;

    self.setupModifierGroupWithMiscGroup(miscGroup);
    self.setupBodypartGroupWithMiscGroup(miscGroup);

    let lists=['HPI', 'Other Diseases', 'Ortho Surgery', 'Injection Site', 'Modalities', 'Phone Call', 'Miscellaneous', 'Bodypart', 'Room', 'Pod'];
    self.addGroup(hpiGroup);
    self.addGroup(patHxGroup);
    self.addGroup(jointInjectionGroup);
    self.addGroup(daysheetGroup);
    self.addGroup(phonecallGroup);
    self.addGroup(miscGroup);
    self.addGroup(apptGroup);

    let loadDesc = `Loading list items...`;
    let loadDialog = self.helper.createNoty(loadDesc, 3000);
    loadDialog.show();

    self.goData.getLists(lists, function(res){

      loadDialog.close();

      self.listComboData = res;

      for(let i = 0; i < lists.length; i++){
        let itmName = lists[i];
        if(itmName == 'HPI'){
          //let sports = _.filter(res, function(i){return i.ListType == itmName && i.Description2 == 'Sport'});
          let sportGroup = new ListGroup('Sport');
          sportGroup.displayBodypart = false;
          sportGroup.filters=[];
          sportGroup.filters.push(["ListType", itmName]);
          sportGroup.filters.push(["Description2", "Sport"]);
          sportGroup.filters.push(["ProviderID"]);
          hpiGroup.items.push(sportGroup);

        }else if(itmName == 'Room' || itmName == 'Pod'){

          let aptGroup = new ListGroup(itmName);
          aptGroup.displayBodypart = false;
          aptGroup.displayDescription = false;
          aptGroup.displayBodypartColumn = false;
          aptGroup.displayDescription2Column = false;
          aptGroup.filters=[];
          aptGroup.filters.push(["ListType", itmName]);
          aptGroup.filters.push(["ProviderID"]);
          apptGroup.items.push(aptGroup);
        }
        else if(itmName == 'Other Diseases' || itmName == 'Ortho Surgery'){

          let hxGroup = new ListGroup(itmName);
          hxGroup.filters=[];
          hxGroup.filters.push(["ListType", itmName]);
          hxGroup.filters.push(["ProviderID"]);
          patHxGroup.items.push(hxGroup);
        }else if(itmName == 'Injection Site'){
          //let injSites = _.filter(res, function(i){return i.ListType == 'Injection Site' && i.ProviderID == 0});
          let injSiteGroup = new ListGroup('Injection Site');
          injSiteGroup.filters=[];
          injSiteGroup.filters.push(["ListType", itmName]);
          injSiteGroup.filters.push(["ProviderID"]);
          jointInjectionGroup.items.push(injSiteGroup);
        }else if(itmName == 'Modalities'){

          let mods = _.filter(res, function(i){return i.ListType == itmName});
          let subModalityTypes = _.uniqBy(mods, "Description2");
          subModalityTypes = _.orderBy(subModalityTypes, "Description2");
          for(let t = 0; t < subModalityTypes.length; t++){
            let aGroup = new ListGroup(subModalityTypes[t].Description2);
            //try adding filters...
            aGroup.filters=[];
            aGroup.filters.push(["ListType", itmName]);
            aGroup.filters.push(["Description2"]);
            aGroup.filters.push(["ProviderID"]);
            daysheetGroup.items.push(aGroup);
          }

        }else if(itmName == 'Phone Call'){
          let phoneMessageGroup = new ListGroup('Custom Messages');
          //filters...
          phoneMessageGroup.filters=[];
          phoneMessageGroup.filters.push(["ListType", itmName]);
          phoneMessageGroup.filters.push(["Description2"]);
          phoneMessageGroup.filters.push(["ProviderID"]);
          phoneMessageGroup.displayBodypart = false;
          phonecallGroup.items.push(phoneMessageGroup);
        }

      }
    });

  }


  openListItemPopup(item, callback){
    let self = this;
    let viewPath = '../administration/dialogs/editListItem';

    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let width = (windowWidth / 3) * 2;
    let left = (windowWidth / 5);

    let options={
      closeActiveDialog: false
    }

    let title = item.data.ListType;

    //item.displayBodypart = self.selectedGroup.displayBodypart;

    this.popupHelper.openViewModelPop(viewPath, item, title, width, windowHeight, 50, left, options, function(res){
      //self.save(res);
      if(res.cancelled)return;

      if(res.delete){
        self.delete(res);
      }else{
        if(res.remove){
          //we've changed descritption2, remove item from current group...
          self.removeFromSelectedItem(item.data.ListID);
        }
        self.update(res, callback);
      }
    });
  }

  removeFromSelectedItem(listId){
    let self = this;
    if(self.selectedItem && self.selectedItem.items){
      for(let i = 0; i < self.selectedItem.items.length; i++){
        var aItem = self.selectedItem.items[i];
        if(aItem.id == listId){
          self.selectedItem.items.splice(i, 1);
          break;
        }
      }
    }
  }

  delete(item){
    let self = this;
    var url = 'listcombo?id=' + item.ListID;
    self.saveDialog = self.helper.createNoty("Deleting " + item.Description1, 3000);
    self.goData.deleteWithUrl(url, function(success){

      self.saveDialog.close();

      if(success){
        self.removeFromSelectedItem(item.ListID);
        // for(let i = 0; i < self.selectedItem.items.length; i++){
        //   var aItem = self.selectedItem.items[i];
        //   if(aItem.id == item.ListID){
        //     self.selectedItem.items.splice(i, 1);
        //     break;
        //   }
        // }
      }

    });
  }

  getListComboObject(){
    return{
      "ListID": 0,
      "ListType": '',
      "Description1":'',
      "Description2":'',
      "BodyPart":'',
      "ProviderID": 0,
      "Visible": 1,
      "ListCode": null,
      "Description3": null
    }
  }

  editItem(item){
    let self = this;
    //obj.displayBodypart = self.selectedItem.displayBodypart;
    var obj={}
    obj.data = item.data;
    obj.displayBodypart = self.selectedItem.displayBodypart;
    obj.description2ListItems=self.selectedGroup.items;
    obj.displayDescription = self.selectedGroup.displayDescription;
    //obj.additionalLists = self.selectedItem.additionalLists;

    //check for miscellaneous / bodyparts....
    var li = self.getFilterFromSelectedItem("ListType",self.selectedItem);
    if(li != null && li == "Bodypart"){
      //remove other picklist options...
      obj.description2ListItems = _.reject(self.selectedGroup.items, function(i){return i.description != "Bodyparts"});
    }

    this.openListItemPopup(obj);
  }

  getQueryFromListItem(listItem){
    let self = this;
    var query =[]

    if(!listItem.filters)return query;

    for(let x = 0; x < listItem.filters.length; x++){
      let filter = listItem.filters[x];
      if(filter.length > 1){
        query.push([filter[0], filter[1]])
      }else{
        if(filter == 'Description2'){
          query.push([filter[0], listItem.description])
        }
        if(filter == 'ProviderID'){
          let proId = self.selectedProvider ? self.selectedProvider.ProviderID.toString() : null;
          query.push([filter[0], proId])
        }
      }
    }
    return query;
  }

  filterListComboDataWithFilterArray(listComboData, filterArray){
    let self = this;
    let res = [];

    for(let q = 0; q < filterArray.length; q++){
      // var data = res.length > 0 ? res : listComboData;
      var data = q == 0 ? listComboData : res;
      res = _.filter(data, filterArray[q]);
    }

    return _.sortBy(res, "Description1");
  }


  filterListComboDataWithProviderIdAndType(providerId, type){
    let self = this;
    var filters={
      'ListType': type,
      'ProviderID': providerId.toString()
    }

    var query =[]
    let keys = Object.keys(filters);
    let vals = Object.values(filters);
    for(let i = 0; i < keys.length; i++){
      query.push([keys[i], vals[i]])
    }

    let res = null;

    for(let q = 0; q < query.length; q++){
      var data = res ? res : self.listComboData;
      res = _.filter(data, query[q]);
    }

    return res
  }

  providerSelected(){
    let self = this;
    if(self.selectedItem){
      // self.selectedItem.items=[];
      // let filtered = self.filterListComboDataWithProviderIdAndType(self.selectedProvider.ProviderID, self.selectedItem.description);
      // self.populateItemWithListComboData(self.selectedItem, filtered);
      self.loadSelectedItem();
    }
  }

  loadSelectedItem(){
    let self = this;
    if(self.selectedItem){
      self.selectedItem.items=[];
      let filterArray = self.getQueryFromListItem(self.selectedItem);
      //add bodypart...
      if(self.selectedBodypartFilter != this.bodyparts[0]){
        filterArray.push(['BodyPart', self.selectedBodypartFilter]);
      }
      let filtered = self.filterListComboDataWithFilterArray(self.listComboData, filterArray);
      self.populateItemWithListComboData(self.selectedItem, filtered);
    }
  }

  populateItemWithListComboData(item, data){
    item.items = [];
    for(let r = 0; r < data.length; r++){
      let m = new ListItem(data[r].Description1,data[r].ListID, data[r]);
      item.items.push(m);
    }
  }

  itemClick(item, group){
    let self = this;
    //select item, deselect everything else...
    for(let g = 0; g < self.list.length; g++){
      let aGroup = self.list[g];
      for(let i = 0; i < aGroup.items.length; i++){
        let aItem = aGroup.items[i];
        if(aGroup.description == group.description &&
          aItem.description == item.description){
          aItem.selected = true;
          self.selectedItem = aItem;
          self.loadSelectedItem();
          self.enableEdit = true;
        }else{
          aItem.selected = false;
        }
      }
    }
  }

  selectGroup(grp){
    let self = this;
    self.selectedItem = null;
    self.enableEdit = false;

    for(let g = 0; g < self.list.length; g++){
      if(self.list[g].description == grp.description){
        this.selectedGroup = self.list[g];
        self.list[g].expanded = true;
      }else{
        self.list[g].expanded = false;
      }
    }
  }

  update(item, callback){
    let self = this;

    if(item == null)return;

    //check for NULL bodypart...
    if(item.BodyPart == undefined || item.BodyPart == null){
      item.BodyPart = '';
    }

    var description = item.ListID == 0 ? "Saving " : "Updating ";

    self.saveDialog = self.helper.createNoty(description + item.Description1, 3000);

    self.goData.postWithUrlAndData('listcombo', JSON.stringify(item), function(res){

      self.saveDialog.close();

      if(callback){
        callback(res);
      }
    });
  }

  getFilterFromSelectedItem(filterDescription, selectedItem){
    if(selectedItem.filters.length > 0){
      for(var i = 0; i < selectedItem.filters.length; i++){
        var aFilter = selectedItem.filters[i];
        if(aFilter.length == 2 && aFilter[0].toUpperCase()==filterDescription.toUpperCase()){
          return aFilter[1];
        }     
      };
    }
    return null;
  }


  addClick(){
    let self = this;
    self.enableEdit = true;
    let header=null;

    if(self.selectedGroup && self.selectedItem) {

      let url = 'listcombo/new';
      //get new item...
      self.goData.getWithUrl(url, function(res){
        // res.ListType = self.selectedGroup.saveDescription ? self.selectedGroup.saveDescription : self.selectedItem.description;
        var li = self.getFilterFromSelectedItem("ListType",self.selectedItem);
        if(li == null){
          res.ListType =self.selectedGroup.saveDescription ? self.selectedGroup.saveDescription : self.selectedItem.description;
        }else{
          res.ListType = li;
        }

        var f_descr1 = self.getFilterFromSelectedItem("Description1",self.selectedItem);
        if(f_descr1 != null){
          res.Description1 = f_descr1;
        }

        var f_descr2 = self.getFilterFromSelectedItem("Description2",self.selectedItem);
        if(f_descr2 != null){
          res.Description2 = f_descr2;
        }else{
          res.Description2 = self.selectedItem.description;
        }


        res.ProviderID = self.selectedItem.providerRequired ? self.selectedProvider.ProviderID : 0;
        res.ListCode = 0;
        res.Visible = 1;
        res.BodyPart="";

        var obj={}
        obj.data = res;
        obj.displayBodypart = self.selectedItem.displayBodypart;
        obj.additionalLists = self.selectedItem.additionalLists;
        obj.description2ListItems=self.selectedGroup.items;
        obj.displayDescription = self.selectedGroup.displayDescription;

        self.openListItemPopup(obj, function(res){
          let newItem = new ListItem(res.Description1, res.ListID, res);
          self.listComboData.push(res);
          self.selectedItem.items.push(newItem);
          self.itemClick(newItem, self.selectedGroup);
        });
      });

    }
  }

  addItemToGroup(item, group){
    let m = new ListItem(item.Description1,item.ListID, item);
    group.items.push(m);
  }

  getGroupWithDescription(description){
    return _.find(this.list, function(g){return g.description == description});
  }

  addGroup(listGroup){
    let self = this;
    listGroup.headingId = 'heading' + self.list.length + 1;
    listGroup.collapseId = 'collapse' + self.list.length + 1;
    listGroup.dataTarget = '#'+listGroup.collapseId;
    self.list.push(listGroup);
  }
}
