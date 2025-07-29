import {inject} from "aurelia-dependency-injection";
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";

@inject(helper, http, Data)
export class EditListItem {

  bodyparts;// =['Ankle', 'Knee', 'Hip', 'Hand', 'Wrist', 'Elbow','Shoulder','Cervial','Thoracic', 'Lumbar']
  selectedBodyPart;

  listType;

  item=null;

  canSave = false;

  saveOrUpdate = "Save";

  displayBodyparts=false;
  displayDescription = true;

  dialog = null;

  additionalLists=[];
  description2ListItems=[];
  selectedDescription2=null;

  disableDelete = false;

  constructor(helper, http, Data) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
  }

  activate(item) {
    let self = this;
    self.bodyparts = self.goData.bodyparts;
    self.item = item.data;
    self.disableDelete = self.item.ListID == 0 ? true : false;
    self.dialog = item.dialog;
    self.description2ListItems = item.description2ListItems;

    // if(self.description2ListItems.length > 0){
    //   if(self.description2ListItems[0].filters.length > 0){
    //     for(var f = 0; f < self.description2ListItems[0].filters.length; f++){
    //       var aFilter = self.description2ListItems[0].filters[f];
    //       if(aFilter.length > 0){
    //         if(aFilter[0]=="ListType"){
    //           self.item.ListType = aFilter[1];
    //         }     
    //       }
    //     }
    //   }
    // }

    //find selectedDescription2...
    var foundDesc2 = _.find(self.description2ListItems, function(r){return r.description == self.item.Description2});
    if(foundDesc2){
      self.selectedDescription2 = foundDesc2;
    }

    self.additionalLists = item.additionalLists;
    self.displayBodyparts = item.displayBodypart;
    self.displayDescription = item.displayDescription;
    if(item.data.BodyPart){
      self.selectedBodyPart = item.data.BodyPart;
    }
    self.saveOrUpdate = item.data.ListID == 0 ? "Save" : "Update";
  }

  attached(){
    let self = this;
    var res = $(self.newuser).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");
  }

  update(){
    let self = this;
    self.item.BodyPart = self.selectedBodyPart;
    if(self.selectedDescription2){

      //check to see if we've changed the descritption - to move from group...
      if(self.item.Description2 != self.selectedDescription2.description){
        //we've changed the group...
        self.item.remove=true;
      }
      self.item.Description2 = self.selectedDescription2.description;
    }

    self.dialog.close(true, self.item);
  }

  listItemClicked(item){
    this.item.Description1 = item;
  }

  delete(){
    let self = this;
    self.item.delete = true;
    self.dialog.close(true, self.item);
  }
}
