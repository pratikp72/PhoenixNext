
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {EventAggregator} from 'aurelia-event-aggregator';
import {DialogService} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {Login} from "../login/login";
import {Error} from "../kioskPreferences/error";
import {Rules} from "../kioskPreferences/rules";
import {KioskPreferencesData} from "../data/kiosk-preferences/data";

@inject(helper, http, EventAggregator, DialogService, KioskPreferencesData)
export class Portal {

    constructor(helper, http, EventAggregator, DialogService, KioskPreferencesData){
        this.eventAggregator = EventAggregator;
        this.dialogService = DialogService;
        this.helper = helper;
        this.http = http;
        this.message = 'hello from kiosk preferences!';
       
        this.allGoForms=[];
        this.availableGoForms=[];
    }

    getGoForms() {
      let self = this;
      self.http.get(self.helper.getApiUrl(`goforms?type=KIOSK`), (data) => {
          self.allGoForms = data;
      });
    }

    addClicked(item, type) {
      let self = this;

      switch(type){
          case 'pdf':
              let pdfPage = {name: item.Name, icon: 'file-pdf-o', selected: '', parent: '', isNavigable: true, initial: '', pdfTemplate: item, enabled: true, type: 'pdf'};
              self.currentConfiguration.JsonData.push(pdfPage);
              self.syncAvailableItemsWithCurrentPageOrder('pdf', self.allPdfs, self.availablePdfs);
              break;
          case 'goform':
              let goFormObj={'Id': item.Id, 'Description': item.Description, 'ProviderId': item.ProviderId, 'Type': item.Type}
              let aGoForm = {name: item.Description, icon: 'list-alt', selected: '', parent: '', isNavigable: true, initial: '', goForm: goFormObj, enabled: true, type: 'goform'};
              self.currentConfiguration.JsonData.push(aGoForm);
              self.syncAvailableItemsWithCurrentPageOrder('goform', self.allGoForms, self.availableGoForms);
              break;
          default:
              self.currentConfiguration.JsonData.push(item);
              self.syncAvailableItemsWithCurrentPageOrder('page', self.allPages, self.availablePages);
              break;
      }
      self.changesSaved = false;
  }


  getInitialPageOrders() {
    let self = this;
    self.http.get(self.helper.getApiUrl(`configuration/all?type=KIOSK_PAGE_ORDER`), (data) => {
        //types = page, parent, child-page, pdf
        self.configurations = data;
        if(!data || data.length < 1){
            return;
        }
        for(let i = 0; i < self.configurations.length; i++){
            let configuration = self.configurations[i];
            let pageOrder = configuration.JsonData;
            let parsedPageOrder = JSON.parse(pageOrder);
            configuration.JsonData = parsedPageOrder;
            if(self.currentConfiguration && configuration.Id === self.currentConfiguration.Id){
                self.currentConfiguration = configuration;
            }
        }
        if(!self.currentConfiguration){
            self.currentConfiguration = self.configurations[0];
        }
        console.log('CURRENT CONFIGURATION', self.currentConfiguration);
        self.syncAvailableItemsWithCurrentPageOrder('pdf', self.allPdfs, self.availablePdfs);
        self.syncAvailableItemsWithCurrentPageOrder('page', self.allPages, self.availablePages);
        self.syncAvailableItemsWithCurrentPageOrder('goform', self.allGoForms, self.availableGoForms);
    });
}

syncAvailableItemsWithCurrentPageOrder(type, allItems, availableItems) {
  let self = this;
  if(!allItems || allItems.length < 1){
      return;
  }
  if(!self.currentConfiguration){
      return;
  }

  let pushAllToAvailable = false;

  if(!self.currentConfiguration.JsonData || self.currentConfiguration.JsonData.length < 1){
      if(!self.currentConfiguration.JsonData){
          self.currentConfiguration.JsonData = [];
      }
      pushAllToAvailable = true;
  } else {
      let typeCount = 0;
      for(let i = 0; i < self.currentConfiguration.JsonData.length; i ++){
          let currentPageOrderItem = self.currentConfiguration.JsonData[i];
          if(type === 'page' && (currentPageOrderItem.type === 'page' || currentPageOrderItem.type === 'parent' || currentPageOrderItem.type === 'child-page')){
              typeCount++;
              break;
          }
          if(type === 'pdf' && (currentPageOrderItem.type === 'pdf')){
              typeCount++;
              break;
          }
          if(type === 'goform' && (currentPageOrderItem.type === 'goform')){
            typeCount++;
            break;
        }
      }
      if(typeCount === 0){
          pushAllToAvailable = true;
      }
  }

  if(pushAllToAvailable === true){
      while(availableItems.length > 0){
          availableItems.pop();
      }

      for(let i = 0; i < allItems.length; i++){
          availableItems.push(allItems[i]);
      }

      return;
  }

  //remove pdfs from availablePdfs if they're in the current configuration
  for(let i = 0; i < self.currentConfiguration.JsonData.length; i++){
      let currentPageOrderItem = self.currentConfiguration.JsonData[i];
      let process = false;
      if(type === 'page' && (currentPageOrderItem.type === 'page' || currentPageOrderItem.type === 'parent' || currentPageOrderItem.type === 'child-page')){
          process = true;
      }
      if(type === 'pdf' && (currentPageOrderItem.type === 'pdf')){
          process = true;
      }
      if(type === 'goform' && (currentPageOrderItem.type === 'goform')){
        process = true;
      }
      if(process === false){
          continue;
      }
      for(let ii = 0; ii < availableItems.length; ii++){
          let currentItem = availableItems[ii];
          let shouldRemove = false;
          switch (type) {
              case 'pdf':
                  if(currentPageOrderItem.pdfTemplate && currentItem.TemplateID === currentPageOrderItem.pdfTemplate.TemplateID){
                      shouldRemove = true;
                  }
                  break;
              case 'goform':
                  if(currentPageOrderItem.goForm && currentItem.Id === currentPageOrderItem.goForm.Id){
                      shouldRemove = true;
                  }
                  break;
              default:
                  if(currentItem.name === currentPageOrderItem.name && currentItem.type === currentPageOrderItem.type){
                      shouldRemove = true;
                  }
                  break;
          }
          if(shouldRemove){
              availableItems.splice(ii, 1);
              break;
          }
      }
  }
  //add item (page or pdf) to availableItems if it's in allItems but not the current configuration or the availableItems
  for(let i = 0; i < allItems.length; i++){
      let currentItem = allItems[i];
      let isInAvailableItems = false;
      let isInCurrentConfiguration = false;
      for(let ii = 0; ii < availableItems.length; ii++){
          let currentAvailableItem = availableItems[ii];
          switch (type) {
              case 'pdf':
                  if(currentAvailableItem.TemplateID === currentItem.TemplateID){
                      isInAvailableItems = true;
                  }
                  break;
              case 'goform':
                  if(currentAvailableItem.Id === currentItem.Id){
                      isInAvailableItems = true;
                  }
                  break;
              default:
                  if(currentAvailableItem.name === currentItem.name && currentAvailableItem.type === currentItem.type){
                      isInAvailableItems = true;
                  }
                  break;
          }
          if(isInAvailableItems){
              break;
          }
      }
      for(let ii = 0; ii < self.currentConfiguration.JsonData.length; ii++){
          let currentPageOrderItem = self.currentConfiguration.JsonData[ii];
          let process = false;
          if(type === 'page' && (currentPageOrderItem.type === 'page' || currentPageOrderItem.type === 'parent' || currentPageOrderItem.type === 'child-page')){
              process = true;
          }
          if(type === 'pdf' && (currentPageOrderItem.type === 'pdf')){
              process = true;
          }
          if(type === 'goform' && (currentPageOrderItem.type === 'goform')){
            process = true;
          }
          if(process === false){
              continue;
          }
          switch (type) {
              case 'pdf':
                  if(currentPageOrderItem.pdfTemplate && currentPageOrderItem.pdfTemplate.TemplateID === currentItem.TemplateID){
                      isInCurrentConfiguration = true;
                  }
                  break;
              case 'goform':
                  if(currentPageOrderItem.goForm && currentPageOrderItem.goForm.Id === currentItem.Id){
                      isInCurrentConfiguration = true;
                  }
                  break;
              default:
                  if(currentItem.name === currentPageOrderItem.name && currentItem.type === currentPageOrderItem.type){
                      isInCurrentConfiguration = true;
                  }
                  break;
          }
          if(isInCurrentConfiguration){
              break;
          }
      }
      if(!isInAvailableItems && !isInCurrentConfiguration){
          availableItems.push(currentItem);
      }
  }
}
    // getProviders(){
    //     let self = this;
    //     let url = "providers";
    //     self.http.get(self.helper.getApiUrl(url), function(providers){
    //         self.allProviders = providers;
    //     });
    // }

 
    setupData(){
        let self = this;

        self.getGoForms();

    }



    attached(){
        let self = this;
        // let tooltip = $('[data-toggle="tooltip"]');
        // tooltip.tooltip();
        // let popover = $('[data-toggle="popover"]');
        // popover.popover();

        if(!self.needsLogin){
            return;
        }
        self.dialogService.open({viewModel: Login, model: {}}).whenClosed(response => {
            console.log('DIALOG RETURN VALUE:', response);
            self.setupData();
        });
    }

    activate(params){
        let self = this;
        if (params.hasOwnProperty("jwt")){
            self.helper.processToken(params.jwt);
            self.setupData();
        } else {
            self.needsLogin = true;
        }
        console.log('PARAMS', params);
    }

}
