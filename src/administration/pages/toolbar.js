import {inject} from 'aurelia-framework';
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";
import { PopupHelper } from '../../go/popupHelper';
import * as _ from 'lodash';


class ToolbarItem{
  constructor(name, icon){
    this.name = name;
    this.icon = icon;
    this.index = 0;
  }
}

@inject(helper, http, Data, PopupHelper)
export class Toolbar {

  sidebarItems = [];
  sidebarItemsMore=[];
  items=[];

  removedFromList=null;

  user=null;

  constructor(helper, http, Data, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.popupHelper = PopupHelper;
  }

  activate(obj) {
    let self = this;
    self.user = obj;
    if(self.user.Json == null || self.user.Json === 'null'){
      self.setup();
      self.updateLayout();
    }else{
      //load layout...
      var jsonObj = JSON.parse(self.user.Json);
      this.sidebarItems = jsonObj.toolbar.items;
      this.sidebarItemsMore = jsonObj.toolbar.itemsMore;
    }
  }

  updateLayout(){
    //save layout object here???
    var jsonObj={
      toolbar:{
        items:this.sidebarItems,
        itemsMore:this.sidebarItemsMore
      }
    }
    this.user.Json = jsonObj;
  }

  reorderableItemsChanged(orderedItems, change){
    if(!this.isMaxSidebarItems(change, this.items)){
      //update index...
      change.item.index = change.toIndex;
      this.updateLayout();
    }
  }

  reorderableSidebarItemsChanged(orderedItems, change){
    if(!this.isMaxSidebarItems(change, this.sidebarItems)){
      //update index...
      change.item.index = change.toIndex;
      this.updateLayout();
    }
  }

  reorderableSidebarItemsMoreChanged(orderedItems, change){
    if(!this.isMaxSidebarItems(change, this.sidebarItemsMore)){
      //update index...
      change.item.index = change.toIndex;
      this.updateLayout();
    }
  }

  isMaxSidebarItems(change, list){
    if(change.removedFromThisList){
      this.removedFromList = list;

      //does sidebarItems have more than 6 items???
      if(this.sidebarItems.length > 6){
        var index = _.findIndex(this.sidebarItems, function(i){return i.name == change.item.name});
        //send item back to where it came from...
        this.sidebarItems.splice(index, 1);
        list.splice(change.fromIndex, 0, change.item);

        var txt = `You may only have 6 items in main toolbar.`;
        this.popupHelper.openGenericMessagePop(txt, "Too many items!", [], false, function(res){

        });
        return true;
      }else{
        return false;
      }
    }
    return false;
  }

  setup(){

    //setup standard sidebar items...
    var schedule = new ToolbarItem("Schedule","fa-clock-o");
    schedule.index=0;
    this.sidebarItems.push(schedule);

    var workflow = new ToolbarItem("Workflow","fa-cubes");
    workflow.index=1;
    this.sidebarItems.push(workflow);

    var prescription = new ToolbarItem("Prescription", "rx");
    prescription.index=2;
    this.sidebarItems.push(prescription);

    var submitCharges = new ToolbarItem("Charges","fa-usd");
    submitCharges.index=3;
    this.sidebarItems.push(submitCharges);

    var tasking = new ToolbarItem("Messaging/Tasking","fa-comment");
    tasking.index=4;
    this.sidebarItems.push(tasking);

    var patientSearch = new ToolbarItem("Patient Search","fa-search");
    patientSearch.index=5;
    this.sidebarItems.push(patientSearch);




    //more toolbar
    var externalApps = new ToolbarItem("External Apps","fa-link");
    externalApps.index=6;
    this.sidebarItemsMore.push(externalApps);

    var kiosk = new ToolbarItem("Kiosk Dashboard","fa-tachometer");
    kiosk.index=7;
    this.sidebarItemsMore.push(kiosk);

    var phone = new ToolbarItem("Phone Call","fa-phone");
    phone.index=8;
    this.sidebarItemsMore.push(phone);

    var inboundFax = new ToolbarItem("Inbound Fax","fa-fax");
    inboundFax.index=9;
    this.sidebarItemsMore.push(inboundFax);

    var scan = new ToolbarItem("Scan","fa-print");
    scan.index=10;
    this.sidebarItemsMore.push(scan);

    var orders = new ToolbarItem("Orders Forms",'fa-sticky-note-o');
    orders.index=11;
    this.sidebarItemsMore.push(orders);






    


  }

}
