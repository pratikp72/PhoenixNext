import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable, computedFrom} from 'aurelia-framework';
import {Data} from '../data/go/data';
import * as _ from 'lodash';
import {DialogService} from 'aurelia-dialog';
import {Router} from 'aurelia-router';
import {Globals} from './globals';
import {PopupHelper} from './popupHelper';
import {Access} from "../access";
import {TaskHelper} from './task/taskHelper';
import {EventAggregator} from 'aurelia-event-aggregator';


class SidebarItem{
  constructor(id, icon, template){
    this.id = id;
    this.icon = icon;
    this.iconStack=null;
    this.title = null;
    this.height=65;
    this.width=null;
    this.template = template;
    this.togglePickerValue=null;
    this.badgeCount=0;
    this.index=0;
    this.moreMenu=false;
    this.options=null;
    this.disabled=false;
  }
}


@inject(helper,http,DialogService, Router, Data, Globals, Access, PopupHelper, TaskHelper, EventAggregator)
export class Sidebar{

  sidebarItems = [];
  sidebarItemsMore=[];

  constructor(helper, http, DialogService, Router, Data, Globals, Access, PopupHelper, TaskHelper, EventAggregator){
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.dialogService = DialogService;
    this.router = Router;
    this.globals = Globals;
    this.access = Access;
    this.popupHelper = PopupHelper;
    this.taskHelper = TaskHelper;
    this.event = EventAggregator;
    this.blankImage = `${this.helper.goFileUrl}images/blank.png`;
  }

  attached(){
    this.loadLayout();
  }

  testOriginalLayout(){
    //setup test sidebar items...
    var schedule = new SidebarItem("toolbar-schedule","fa-clock-o","basicSidebarItem");
    schedule.togglePickerValue="schedule";
    schedule.title = "Schedule";
    this.sidebarItems.push(schedule);

    var workflow = new SidebarItem("toolbar-workflow","fa-cubes","badgeSidebarItem");
    workflow.togglePickerValue="workflow";
    workflow.title = "Workflow";
    workflow.disabled = true;
    this.sidebarItems.push(workflow);

    var prescription = new SidebarItem(null, null,"rxSidebarItem");
    this.sidebarItems.push(prescription);

    var submitCharges = new SidebarItem(null,"fa-usd","basicSidebarItem");
    submitCharges.togglePickerValue="charges";
    submitCharges.title = "Charges";
    //submitCharges.moreMenu = true;
    this.sidebarItems.push(submitCharges);

    var tasking = new SidebarItem("toolbar-messaging","fa-comment","badgeSidebarItem");
    tasking.togglePickerValue="task";
    tasking.title = "Messaging/Tasking";
    tasking.iconStack = "fa-thumb-tack";
    this.sidebarItems.push(tasking);

    var patientSearch = new SidebarItem("toolbar-patient-search","fa-search","basicSidebarItem");
    patientSearch.togglePickerValue="patient";
    patientSearch.title = "Patient Search";
    this.sidebarItems.push(patientSearch);





    var externalApps = new SidebarItem(null,null,"externalAppsSidebarItem");
    externalApps.moreMenu = true;
    this.sidebarItemsMore.push(externalApps);

    var kiosk = new SidebarItem("toolbar-kiosk","fa-tachometer","basicSidebarItem");
    kiosk.togglePickerValue="kiosk";
    kiosk.title = "Kiosk Dashboard";
    kiosk.moreMenu = true;
    this.sidebarItemsMore.push(kiosk);

    var phone = new SidebarItem("toolbar-phonecall","fa-phone","basicSidebarItem");
    phone.togglePickerValue="phone";
    phone.title = "Phone Call";
    phone.moreMenu = true;
    this.sidebarItemsMore.push(phone);

    var inboundFax = new SidebarItem(null,"fa-fax","basicSidebarItem");
    inboundFax.togglePickerValue="inboundfax";
    inboundFax.title = "Inbound Fax";
    inboundFax.moreMenu = true;
    this.sidebarItemsMore.push(inboundFax);

    var orders = new SidebarItem(null,null,"ordersSidebarItem");
    orders.moreMenu = true;
    this.sidebarItemsMore.push(orders);
  }

  loadLayout(){
    if(this.helper._user.Json != ""){
      var json = JSON.parse(this.helper._user.Json);//.toolbar;
      var toolbar = json.toolbar;
      for(var i = 0; i < toolbar.items.length; i++){
        var itm = this.getSidebarItem(toolbar.items[i].name, false);
        this.sidebarItems.push(itm);
      }
      for(var i = 0; i < toolbar.itemsMore.length; i++){
        var itm = this.getSidebarItem(toolbar.itemsMore[i].name, true);
        this.sidebarItemsMore.push(itm);
      }
    }else{
      this.testOriginalLayout();
    }
  }

  getSidebarItem(name, moreMenu){
    switch(name){
      case "Patient Search":
        var patientSearch = new SidebarItem("toolbar-patient-search","fa-search","basicSidebarItem");
        patientSearch.togglePickerValue="patient";
        patientSearch.title = name;
        if(moreMenu){
          patientSearch.moreMenu = true;
        }
        return patientSearch;
      case "Schedule":
        var schedule = new SidebarItem("toolbar-schedule","fa-clock-o","basicSidebarItem");
        schedule.togglePickerValue="schedule";
        schedule.title = name;
        if(moreMenu){
          schedule.moreMenu = true;
        }
        return schedule;
      case "Kiosk Dashboard":
        var kiosk = new SidebarItem("toolbar-kiosk","fa-tachometer","basicSidebarItem");
        kiosk.togglePickerValue="kiosk";
        kiosk.title = name;
        if(moreMenu){
          kiosk.moreMenu = true;
        }
        return kiosk;
      case "Messaging/Tasking":
        var tasking = new SidebarItem("toolbar-messaging","fa-comment","badgeSidebarItem");
        tasking.togglePickerValue="task";
        tasking.title = name;
        tasking.iconStack = "fa-thumb-tack";
        if(moreMenu){
          tasking.moreMenu = true;
        }
        return tasking;
      case "Workflow":
        var workflow = new SidebarItem("toolbar-workflow","fa-cubes","badgeSidebarItem");
        workflow.togglePickerValue="workflow";
        workflow.title = name;
        workflow.disabled = true;
        if(moreMenu){
          workflow.moreMenu = true;
        }
        return workflow;
      case "Phone Call":
        var phone = new SidebarItem("toolbar-phonecall","fa-phone","basicSidebarItem");
        phone.togglePickerValue="phone";
        phone.title = name;
        if(moreMenu){
          phone.moreMenu = true;
        }
        return phone;
      case "Prescription":
        var rx = new SidebarItem(null, null,"rxSidebarItem");
        if(moreMenu){
          rx.moreMenu = true;
        }
        return rx;
      case "External Apps":
        var ext =  new SidebarItem(null,null,"externalAppsSidebarItem");
        if(moreMenu){
          ext.moreMenu = true;
        }
        return ext;
      case "Charges":
        var submitCharges = new SidebarItem(null,"fa-usd","basicSidebarItem");
        submitCharges.togglePickerValue="charges";
        submitCharges.title = name;
        if(moreMenu){
          submitCharges.moreMenu = true;
        }
        return submitCharges;
      case "Inbound Fax":
        var inboundFax = new SidebarItem(null,"fa-fax","basicSidebarItem");
        inboundFax.togglePickerValue="inboundfax";
        inboundFax.title = name;
        if(moreMenu){
          inboundFax.moreMenu = true;
        }
        return inboundFax;
      case "Scan":
        var scanning = new SidebarItem(null,"fa-print","basicSidebarItem");
        scanning.togglePickerValue="scan";
        scanning.title = name;
        if(moreMenu){
          scanning.moreMenu = true;
        }
        return scanning;
      case "Orders Forms":
        var orders = new SidebarItem(null,null,"ordersSidebarItem");
        if(moreMenu){
          orders.moreMenu = true;
        }
        orders.options={userId: this.helper._user.UserID}
        return orders;
    }
  }
}
