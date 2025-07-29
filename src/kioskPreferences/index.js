
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
export class Index {

    constructor(helper, http, EventAggregator, DialogService, KioskPreferencesData){
        this.eventAggregator = EventAggregator;
        this.dialogService = DialogService;
        this.helper = helper;
        this.http = http;
        this.message = 'hello from kiosk preferences!';
        this.configurations = [];
        this.currentConfiguration = null;
        this.availablePdfs = [];
        this.allPdfs = [];
        this.availablePages = [];
        this.allPages = [];
        this.allProviders = [];
        this.allGoForms=[];
        this.availableGoForms=[];
        //this.allTypes = ['New Patient', 'History Complete'];
        this.allTypes = [{'Name':'History Required', 'Type': 'KIOSK_PAGE_ORDER'}, {'Name':'History Current', 'Type': 'KIOSK_PAGE_ORDER'}];
        this.needsLogin = false;
        this.changesSaved = true;
        this.settingsSaved = true;
        this.data = KioskPreferencesData.data;
        this.settings = {};
        this.isKioskPrefs=true;
    }


    switchSettings(settingType){
      let self = this;
      this.isKioskPrefs = settingType == 'KIOSK' ? true : false;
      //update / reload settings...
      //this.currentConfiguration = null;
      if(this.isKioskPrefs){
        //kiosk...
        this.allTypes = [{'Name':'History Required', 'Type': 'KIOSK_PAGE_ORDER'}, {'Name':'History Current', 'Type': 'KIOSK_PAGE_ORDER'}];
        // this.getGoForms('KIOSK');
        this.getGoForms('PDF');
        this.typeSelected(this.allTypes[0]);
      }else{
        //portal...
        self.allTypes = [{'Name':'Portal Documents', 'Type': 'PORTAL_DOCUMENTS'}];
        self.availableGoForms=[];
        self.getGoForms('PDF', function(){
          self.typeSelected(self.allTypes[0]);
        });
        // self.getGoForms('PORTAL', function(){
        //   self.typeSelected(self.allTypes[0]);
        // });
      }
    }

    getDefaultPages() {
        let self = this;
        console.log('GET DEFAULT PAGES');
        self.http.get(self.helper.getApiUrl(`configuration/default?type=KIOSK_PAGE_ORDER`), (data) => {
            console.log('DEFAULT PAGES', data);
            let pageOrder = data.JsonData;
            let parsedPageOrder = JSON.parse(pageOrder);
            console.log('PARSED DEFAULT PAGE ORDER', parsedPageOrder);
            self.allPages = parsedPageOrder;
            self.syncAvailableItemsWithCurrentPageOrder('page', self.allPages, self.availablePages);
        });
    }

    get currentProviderName(){
        let self = this;

        if(!self.currentConfiguration || !self.currentConfiguration.ProviderId){
            return 'All Providers';
        }

        let currentProvider = null;

        for(let i = 0; i < self.allProviders.length; i ++){
            let provider = self.allProviders[i];
            if(self.currentConfiguration.ProviderId == provider.ProviderID){
                currentProvider = provider;
                break;
            }
        }

        return currentProvider.NameLast.trim() + ', ' + currentProvider.NameFirst.trim();
    }

    providerSelected(provider){
        let self = this;

        let providerId = null;
        if(provider){
            providerId = provider.ProviderID;
        }

        let configurationForProvider = null;

        for(let i = 0; i < self.configurations.length; i ++){
            let configuration = self.configurations[i];
            if(configuration.ProviderId === providerId && configuration.Name === self.currentConfiguration.Name){
                configurationForProvider = configuration;
                break;
            }
        }

        if(configurationForProvider){
            self.currentConfiguration = configurationForProvider;
        } else {
            //self.currentConfiguration.ProviderId = providerId;
            self.currentConfiguration = {
                Name: self.currentConfiguration.Name,
                Type: self.currentConfiguration.Type,
                ProviderId: providerId,
                JsonData: []
            };
        }

        self.syncAvailableItemsWithCurrentPageOrder('page', self.allPages, self.availablePages);
        self.syncAvailableItemsWithCurrentPageOrder('pdf', self.allPdfs, self.availablePdfs);
        self.syncAvailableItemsWithCurrentPageOrder('goform', self.allGoForms, self.availableGoForms);
        self.changesSaved = true;
    }

    typeSelected(type){
        let self = this;
        let configurationForType = null;

        for(let i = 0; i < self.configurations.length; i ++){
            let configuration = self.configurations[i];
            if(configuration.Name === type.Name && configuration.ProviderId === self.currentConfiguration.ProviderId){
                configurationForType = configuration;
                break;
            }
        }

        if(configurationForType){
            self.currentConfiguration = configurationForType;
        } else {
            // self.currentConfiguration.Name = type;
            self.currentConfiguration = {
                // Name: type,
                // Type: self.currentConfiguration.Type,
                // ProviderId: self.currentConfiguration.ProviderId,
                // JsonData: []
                Name: type.Name,
                Type: type.Type,
                ProviderId: self.currentConfiguration.ProviderId,
                JsonData: []
            };
        }

        self.syncAvailableItemsWithCurrentPageOrder('page', self.allPages, self.availablePages);
        self.syncAvailableItemsWithCurrentPageOrder('pdf', self.allPdfs, self.availablePdfs);
        self.syncAvailableItemsWithCurrentPageOrder('goform', self.allGoForms, self.availableGoForms);
        self.changesSaved = true;
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

    getPdfTemplates() {
        let self = this;
        self.http.get(self.helper.getApiUrl(`pdftemplates?type=Kiosk&providerId=0&state=`), (data) => {
            self.allPdfs = data;
            console.log('PDFS!', self.allPdfs);
            self.syncAvailableItemsWithCurrentPageOrder('pdf', self.allPdfs, self.availablePdfs);
        });
    }

    getGoForms(type, callback) {
      let self = this;
      self.http.get(self.helper.getApiUrl(`goforms?type=${type}`), (data) => {
          self.allGoForms = data;
          console.log('GOFORMS!', self.allGoForms);
          self.syncAvailableItemsWithCurrentPageOrder('goform', self.allGoForms, self.availableGoForms);

          if(callback){
            callback();
          }
      });
  }

    removeClicked(pageOrderItem, itemIndex) {
        let self = this;

        self.currentConfiguration.JsonData.splice(itemIndex, 1);

        let itemCount = 0;

        while(itemCount < self.currentConfiguration.JsonData.length){
            let currentItem = self.currentConfiguration.JsonData[itemCount];
            console.log('EXAMINING ITEM:', currentItem);
            if(currentItem.parent && currentItem.parent !== '' && currentItem.parent === pageOrderItem.name){
                self.currentConfiguration.JsonData.splice(itemCount, 1);
            } else {
                itemCount ++;
            }
        }

        switch(pageOrderItem.type){
            case 'pdf':
                self.syncAvailableItemsWithCurrentPageOrder('pdf', self.allPdfs, self.availablePdfs);
                break;
            case 'goform':
                self.syncAvailableItemsWithCurrentPageOrder('goform', self.allGoForms, self.availableGoForms);
                break;
            default:
                self.syncAvailableItemsWithCurrentPageOrder('page', self.allPages, self.availablePages);
                break;
        }
        self.changesSaved = false;
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
                let goFormObj={'Id': item.Id, 'Description': item.Description, 'ProviderId': item.ProviderId, 'Type': item.Type, 'MaturityDays': item.MaturityDays}
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
        self.http.get(self.helper.getApiUrl(`configuration/all?type=KIOSK_PAGE_ORDER,PORTAL_DOCUMENTS`), (data) => {
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

    orderChanged(item, change){
        let self = this;
        console.log('ORDER CHANGED');
        console.log('ITEM', item);
        console.log('CHANGE', change);
        console.log('CURRENT ORDER', self.currentConfiguration.JsonData);
        self.changesSaved = false;
    }

    checkLayoutValid() {
        let self = this;
        let isValid = true;

        for(let i = 0; i < self.currentConfiguration.JsonData.length; i++) {
            let currentPageOrderItem = self.currentConfiguration.JsonData[i];
            if(i === self.currentConfiguration.JsonData.length - 1){
                if(currentPageOrderItem.name != 'End' && currentPageOrderItem.name != 'Pay'){
                    isValid = false;
                    break;
                }
            }
        }

        return isValid;
    }

    saveClicked(){
        let self = this;
        // let data = JSON.stringify(self.currentConfiguration);
        // for(var i = 0; i < self.items.length; i++) {
        //     var current = self.items[i];
        //     console.log(current.name);
        // }

        if(self.isKioskPrefs && !self.checkLayoutValid()){
            self.dialogService.open({viewModel: Error, model: "Layout Not Valid.<br \><br \>'End' or 'Pay' must be the last page of the layout"}).whenClosed(response => {
                console.log('DIALOG RETURN VALUE:', response);
            });
            return;
        }

        console.log('AFTER THE CHECK LAYOUT VALID STUFF!');

        let url = 'configuration';
        let finalUrl = self.helper.getApiUrl(url);
        let data = {
            Id: self.currentConfiguration.Id,
            Name: self.currentConfiguration.Name,
            Type: self.currentConfiguration.Type,
            ProviderId: self.currentConfiguration.ProviderId,
            JsonData: JSON.stringify(self.currentConfiguration.JsonData)
        };
        let formattedData = JSON.stringify(data);
        // let formattedData = addedItems;
        self.http.post(finalUrl, formattedData, (results) => {

            let existingConfigurationIndex = -1;
            for(let i = 0; i < self.configurations.length; i++){
                let configuration = self.configurations[i];
                if(configuration.ProviderId === results.ProviderId && configuration.Name === results.Name){
                    existingConfigurationIndex = i;
                    break;
                }
            }

            console.log('SAVE DATA RETURNED');
            let parsedPageOrder = JSON.parse(results.JsonData);
            results.JsonData = parsedPageOrder;

            if(existingConfigurationIndex > -1){
                console.log('SAVE: configuration already exists');
                self.configurations[existingConfigurationIndex] = results;
            } else {
                console.log('SAVE: adding configuration', results);
                self.configurations.push(results);
            }
            self.changesSaved = true;

        }, {contentType: 'application/json'});
    }


    saveSettingsClicked(){
        let self = this;

        if(!self.settings){
            return;
        }


        let url = 'configuration';
        let finalUrl = self.helper.getApiUrl(url);
        let data = {
            Id: self.settings.Id,
            Name: self.settings.Name,
            Type: self.settings.Type,
            ProviderId: null,
            JsonData: JSON.stringify(self.settings.JsonData)
        };
        let formattedData = JSON.stringify(data);
        self.http.post(finalUrl, formattedData, (results) => {

            let parsedPageOrder = JSON.parse(results.JsonData);
            results.JsonData = parsedPageOrder;

            console.log('SETTINGS SAVE DATA RETURNED', results);

            self.settings = results;

            self.settingsSaved = true;

        }, {contentType: 'application/json'});
    }

    getProviders(){
        let self = this;
        let url = "providers";
        self.http.get(self.helper.getApiUrl(url), function(providers){
            self.allProviders = providers;
        });
    }

    getInitialSettings() {
        let self = this;
        self.http.get(self.helper.getApiUrl(`configuration/all?type=KIOSK_SETTINGS`), (data) => {
            let firstConfiguration = data[0];

            let parsedSettings = JSON.parse(firstConfiguration.JsonData);

            firstConfiguration.JsonData = parsedSettings;

            console.log('PARSED SETTINGS', firstConfiguration);

            self.settings = firstConfiguration;
        });
    }

    set daysPatientHistoryValid(value){
        let self = this;
        let setting = self.getSetting('DAYS_PATIENT_HISTORY_VALID');

        setting.Value = value;
        self.settingsSaved = false;
    }

    get daysPatientHistoryValid() {
        let self = this;

        let setting = self.getSetting('DAYS_PATIENT_HISTORY_VALID');

        return setting ? setting.Value : null;
    }

    getSetting(settingName){
        let self = this;

        if(!self.settings || !self.settings.JsonData){
            return null;
        }

        let settings = self.settings.JsonData;


        let setting = null;

        for(let i = 0; i < settings.length; i++){
            let currentSetting = settings[i];
            if(currentSetting.Type === settingName){
                setting = currentSetting;
                break;
            }
        }

        return setting;
    }

    setupData(){
        let self = this;
        self.getPdfTemplates();
        // self.getGoForms('KIOSK');
        self.getGoForms('PDF');
        self.getInitialPageOrders();
        self.getDefaultPages();
        self.getProviders();
        self.getInitialSettings();
    }

    openRulesDialog(pdfTemplate){
        let self = this;
        console.log('PDFTEMPLATE', pdfTemplate);
        self.dialogService.open({viewModel: Rules, model: pdfTemplate, lock: false, overlayDismiss: true}).whenClosed(response => {
            console.log('RULES DIALOG RETURN VALUE:', response);
            self.getPdfTemplates();
            self.getInitialPageOrders();
        });
    }

    parseRuleValue(rule){
        switch (rule.Name) {
            case 'DAYS':
                return rule.Value;
                break;
            case 'PROCEDURE':
                let parsedProcedureRule = JSON.parse(rule.Value);
                return `Code: ${parsedProcedureRule.ProcedureCode}<br />From: ${parsedProcedureRule.RangeLower}, To: ${parsedProcedureRule.RangeUpper}`;
                break;
        }
    }

    attached(){
        let self = this;
        console.log('KIOSKPREFERENCES INDEX ATTACHED!');
        let tooltip = $('[data-toggle="tooltip"]');
        console.log('TOOLTIP', tooltip);
        tooltip.tooltip();
        let popover = $('[data-toggle="popover"]');
        popover.popover();
        console.log('POPOVER', tooltip);

        console.log('POPOVER INITIALIZED!');
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
